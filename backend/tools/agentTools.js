const { tool } = require('@langchain/core/tools');
const { z } = require('zod');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Initialize LLM for Sub-Agents (like coding and chat)
const llm = new ChatGoogleGenerativeAI({
    model: "gemini-flash-lite-latest",
    apiKey: process.env.GEMINI_API_KEY,
    maxRetries: 1,
});

// 1. Weather Agent
const weatherAgent = tool(
    async ({ city }) => {
        console.log(`[Sub-Agent: Weather] Fetching weather for ${city}...`);
        try {
            const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
            const data = await res.json();
            const temp = data.current_condition[0].temp_C;
            const desc = data.current_condition[0].weatherDesc[0].value;
            return `The current weather in ${city} is ${temp}°C and ${desc}.`;
        } catch (e) {
            return `Failed to fetch weather for ${city}.`;
        }
    },
    {
        name: "weather_agent",
        description: "Fetches the current weather for a specific city.",
        schema: z.object({ city: z.string().describe("The name of the city.") }),
    }
);

// 2. Coding Agent
const codingAgent = tool(
    async ({ task }) => {
        console.log(`[Sub-Agent: Coder] Writing code for: ${task}...`);
        try {
            const response = await llm.invoke([
                ["system", "You are an expert programmer. Write clean, efficient code for the user's task. Only return the code and a brief explanation."],
                ["human", task]
            ]);
            return response.content;
        } catch (e) {
            return `Coding Agent failed: ${e.message}`;
        }
    },
    {
        name: "coding_agent",
        description: "Writes software code, debugs, or creates scripts for technical tasks.",
        schema: z.object({ task: z.string().describe("The coding task or problem to solve.") }),
    }
);

// 3. Image Generation Agent (Using Pollinations.ai)
const imageGenerationAgent = tool(
    async ({ prompt }) => {
        console.log(`[Sub-Agent: Image] Generating image for: ${prompt}...`);
        try {
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
            
            // Fetch the image
            const res = await fetch(imageUrl);
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Save it locally
            const imagesDir = path.join(__dirname, '../public/images');
            if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
            
            const filename = `Image_${Date.now()}.jpg`;
            const filepath = path.join(imagesDir, filename);
            fs.writeFileSync(filepath, buffer);
            
            return `Successfully generated Image!\nLocal File Path (use this for email attachments): ${filepath}\nMarkdown to display: ![Generated Image](http://localhost:5005/images/${filename})\nDownload URL: http://localhost:5005/images/${filename}`;
        } catch (e) {
            return `Failed to generate image: ${e.message}`;
        }
    },
    {
        name: "image_generation_agent",
        description: "Generates AI images based on a description. Returns local file path for attachments and a display URL.",
        schema: z.object({ prompt: z.string().describe("The visual description of the image to generate.") }),
    }
);

// 4. PDF Generation Agent
const pdfAgent = tool(
    async ({ title, content }) => {
        console.log(`[Sub-Agent: PDF] Generating PDF: ${title}...`);
        try {
            const pdfsDir = path.join(__dirname, '../public/pdfs');
            if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir, { recursive: true });
            
            const filename = `Document_${Date.now()}.pdf`;
            const filepath = path.join(pdfsDir, filename);
            
            const doc = new PDFDocument();
            doc.pipe(fs.createWriteStream(filepath));
            
            doc.fontSize(24).text(title, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(content);
            doc.end();
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return `Successfully generated PDF!\nLocal File Path (use this for email attachments): ${filepath}\nDownload URL (give this to user): http://localhost:5005/pdfs/${filename}`;
        } catch (e) {
            return `Failed to generate PDF: ${e.message}`;
        }
    },
    {
        name: "pdf_agent",
        description: "Creates a formatted PDF document. Returns the local file path (for attachments) and a download URL.",
        schema: z.object({ 
            title: z.string().describe("The title of the document."),
            content: z.string().describe("The body text of the PDF document.") 
        }),
    }
);

// 5. PDF Reading Agent
const pdfParse = require('pdf-parse');
const { search } = require('duck-duck-scrape');

const readPdfAgent = tool(
    async ({ filepathOrUrl }) => {
        console.log(`[Sub-Agent: Read PDF] Reading: ${filepathOrUrl}...`);
        try {
            let dataBuffer;
            if (filepathOrUrl.startsWith('http')) {
                const res = await fetch(filepathOrUrl);
                const arrayBuffer = await res.arrayBuffer();
                dataBuffer = Buffer.from(arrayBuffer);
            } else {
                dataBuffer = fs.readFileSync(filepathOrUrl);
            }
            const data = await pdfParse(dataBuffer);
            return `PDF Text Content (first 2000 chars):\n${data.text.substring(0, 2000)}`;
        } catch (e) {
            return `Failed to read PDF: ${e.message}`;
        }
    },
    {
        name: "read_pdf_agent",
        description: "Reads and extracts text from a PDF file given its local file path or a public URL.",
        schema: z.object({ filepathOrUrl: z.string().describe("The local file path or URL of the PDF to read.") }),
    }
);

// 6. Web Search Agent (DuckDuckGo)
const webSearchAgent = tool(
    async ({ query }) => {
        console.log(`[Sub-Agent: Web Search] Searching the web for: ${query}...`);
        try {
            const results = await search(query);
            if (!results.results || results.results.length === 0) return "No results found on the web.";
            
            const topResults = results.results.slice(0, 3).map(r => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}`).join("\n\n");
            
            return `Web Search Results for "${query}":\n\n${topResults}`;
        } catch (e) {
            return `Failed to search the web: ${e.message}`;
        }
    },
    {
        name: "web_search_agent",
        description: "Searches the ENTIRE web for real-time information, news, or factual answers (Not restricted to Wikipedia).",
        schema: z.object({ query: z.string().describe("The search query to look up on the web.") }),
    }
);

// 7. Web Image Search Agent (DuckDuckGo Images)
const { image_search } = require('duck-duck-scrape');

const webImageSearchAgent = tool(
    async ({ query }) => {
        console.log(`[Sub-Agent: Web Image Search] Searching for real images of: ${query}...`);
        try {
            const results = await image_search({ query: query, moderate: true });
            if (!results.results || results.results.length === 0) return "No real images found.";
            
            // Return top 3 real images
            const topImages = results.results.slice(0, 3).map(img => `Real Image URL: ${img.image}\nMarkdown: ![${query}](${img.image})`).join("\n\n");
            
            return `Found Real Images for "${query}":\n\n${topImages}`;
        } catch (e) {
            return `Failed to fetch real images: ${e.message}`;
        }
    },
    {
        name: "web_image_search_agent",
        description: "Fetches REAL image URLs from the web. Use this when the user asks for real pictures or photographs.",
        schema: z.object({ query: z.string().describe("The image search query.") }),
    }
);

module.exports = {
    weatherAgent,
    codingAgent,
    imageGenerationAgent,
    pdfAgent,
    readPdfAgent,
    webSearchAgent,
    webImageSearchAgent
};
