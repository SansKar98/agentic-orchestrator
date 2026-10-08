const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { SystemMessage, HumanMessage, ToolMessage, AIMessage } = require('@langchain/core/messages');
const { tool } = require('@langchain/core/tools');
const { z } = require('zod');

const llm = new ChatGoogleGenerativeAI({
    model: "gemini-flash-lite-latest",
    apiKey: process.env.GEMINI_API_KEY,
    maxRetries: 1,
});

const nodemailer = require('nodemailer');
const TaskLog = require('./models/TaskLog');

// 2. Define Real Functional Tools

// Tool 1: Real Wikipedia Search API (with Images)
const wikipediaSearchTool = tool(
    async ({ query }) => {
        console.log(`[Agent Action] Searching Wikipedia for: ${query}`);
        try {
            // Fetch search results
            const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json`);
            const data = await res.json();
            if (data.query.search.length === 0) return "No results found.";
            
            const firstResult = data.query.search[0];
            const title = firstResult.title;
            const snippet = firstResult.snippet.replace(/<\/?[^>]+(>|$)/g, "");

            // Fetch the main image for the top result
            let imageUrl = null;
            const imageRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=500`);
            const imageData = await imageRes.json();
            const pages = imageData.query.pages;
            const pageId = Object.keys(pages)[0];
            if (pages[pageId].thumbnail) {
                imageUrl = pages[pageId].thumbnail.source;
            }

            let resultString = `${title}: ${snippet}`;
            if (imageUrl) {
                resultString += `\n\nImage URL for ${title}: ${imageUrl}\nDisplay to user using Markdown: ![${title}](${imageUrl})`;
            }
            return resultString;
        } catch (e) {
            return "Failed to search Wikipedia.";
        }
    },
    {
        name: "wikipedia_search",
        description: "Searches Wikipedia for factual information and images on a given topic.",
        schema: z.object({
            query: z.string().describe("The search query to look up on Wikipedia."),
        }),
    }
);

// Tool 2: Real Database Saving Tool
const databaseSaveTool = tool(
    async ({ topic, content }) => {
        console.log(`[Agent Action] Saving data to MongoDB for topic: ${topic}`);
        try {
            const log = new TaskLog({ topic, content });
            await log.save();
            return `Successfully saved data to MongoDB under topic "${topic}". Database ID: ${log._id}`;
        } catch (e) {
            return `Failed to save to database: ${e.message}`;
        }
    },
    {
        name: "save_to_database",
        description: "Saves a summary or structured data into the MongoDB database for future reference.",
        schema: z.object({
            topic: z.string().describe("A short title or topic for the data."),
            content: z.string().describe("The full content or summary to save."),
        }),
    }
);

// Tool 3: Real Email Sending Tool (Using Gmail SMTP)
const emailSenderTool = tool(
    async ({ recipient, subject, body, attachmentPaths }) => {
        console.log(`[Agent Action] Attempting to send real email to ${recipient}...`);
        try {
            if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
                let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.GMAIL_USER,
                        pass: process.env.GMAIL_PASS
                    }
                });

                let mailOptions = {
                    from: `"Agentic Orchestrator" <${process.env.GMAIL_USER}>`,
                    to: recipient,
                    subject: subject,
                    text: body,
                };

                // Add attachments if provided
                if (attachmentPaths && attachmentPaths.length > 0) {
                    mailOptions.attachments = attachmentPaths.map(path => {
                        return { path: path }; // Nodemailer supports both local file paths and remote URLs!
                    });
                }

                let info = await transporter.sendMail(mailOptions);
                return `SUCCESS: Real email was successfully delivered to ${recipient}! Message ID: ${info.messageId}`;
            } else {
                return `FAILED: Cannot send real email because GMAIL_USER and GMAIL_PASS are not configured in the .env file. Please instruct the user to generate a Google App Password and add it to their .env file.`;
            }
        } catch (e) {
            return `Failed to send email: ${e.message}`;
        }
    },
    {
        name: "send_email",
        description: "Sends a REAL email to a specified recipient using Gmail SMTP. Can include file attachments.",
        schema: z.object({
            recipient: z.string().describe("The email address of the recipient."),
            subject: z.string().describe("The subject of the email."),
            body: z.string().describe("The body/content of the email."),
            attachmentPaths: z.array(z.string()).optional().describe("Optional array of local file paths or URLs to attach to the email (e.g. from pdf_agent or image_generation_agent).")
        }),
    }
);

const { weatherAgent, codingAgent, imageGenerationAgent, pdfAgent, readPdfAgent, webSearchAgent, webImageSearchAgent } = require('./tools/agentTools');

const tools = [wikipediaSearchTool, databaseSaveTool, emailSenderTool, weatherAgent, codingAgent, imageGenerationAgent, pdfAgent, readPdfAgent, webSearchAgent, webImageSearchAgent];
const toolMap = { 
    wikipedia_search: wikipediaSearchTool, 
    save_to_database: databaseSaveTool, 
    send_email: emailSenderTool,
    weather_agent: weatherAgent,
    coding_agent: codingAgent,
    image_generation_agent: imageGenerationAgent,
    pdf_agent: pdfAgent,
    read_pdf_agent: readPdfAgent,
    web_search_agent: webSearchAgent,
    web_image_search_agent: webImageSearchAgent
};

// Bind tools to the LLM
const llmWithTools = llm.bindTools(tools);

// 3. Custom Agent Loop
async function runAgent(prompt, history = [], mode = 'Auto') {
    console.log(`Agent received prompt in mode ${mode}:`, prompt);
    
    let baseSystemPrompt = `You are the "Controller Agent" of a powerful Multi-Agent System. 
You coordinate tasks by delegating them to specialized sub-agents (weather_agent, coding_agent, image_generation_agent, pdf_agent, read_pdf_agent, web_search_agent, wikipedia_search, send_email, save_to_database).
Break down the user's prompt into a workflow and call the appropriate sub-agents step-by-step.
IMPORTANT: 
- For general web queries or news, use web_search_agent. For encyclopedia facts or to fetch known page images, use wikipedia_search.
- Do NOT over-research. Do not get stuck in a loop.
- If the user asks to email a generated image or PDF, make sure to pass the local file paths / URLs generated by those sub-agents into the 'attachmentPaths' array of the send_email tool. This ensures the user actually receives the files on their phone, not just localhost links!
- When generating images or PDFs, always provide the URL links and markdown images to the user in your final answer so they can view them directly on the web interface.`;

    if (mode === 'Coding') {
        baseSystemPrompt += "\n\nUSER HAS SELECTED CODING MODE: Prioritize using the coding_agent for this request.";
    } else if (mode === 'Image') {
        baseSystemPrompt += "\n\nUSER HAS SELECTED IMAGE MODE: Prioritize using the image_generation_agent for this request.";
    } else if (mode === 'PDF') {
        baseSystemPrompt += "\n\nUSER HAS SELECTED PDF MODE: Prioritize using the pdf_agent or read_pdf_agent for this request.";
    } else if (mode === 'Search') {
        baseSystemPrompt += "\n\nUSER HAS SELECTED SEARCH MODE: Prioritize using the web_search_agent or wikipedia_search for this request.";
    }

    let messages = [new SystemMessage(baseSystemPrompt)];
    
    // Add memory/history from MongoDB
    history.forEach(msg => {
        if (msg.role === 'user') {
            messages.push(new HumanMessage(msg.content));
        } else if (msg.role === 'agent') {
            messages.push(new AIMessage(msg.content));
        }
    });

    messages.push(new HumanMessage(prompt));

    let steps = [];

    try {
        // Run a loop for a maximum of 10 iterations to prevent infinite loops while allowing complex workflows
        for (let step = 1; step <= 10; step++) {
            console.log(`--- Agent Step ${step} ---`);
            const response = await llmWithTools.invoke(messages);
            messages.push(response);

            // Check if the model decided to use any tools
            if (response.tool_calls && response.tool_calls.length > 0) {
                for (const toolCall of response.tool_calls) {
                    const selectedTool = toolMap[toolCall.name];
                    if (selectedTool) {
                        const toolResult = await selectedTool.invoke(toolCall.args);
                        
                        // Record the action for the frontend
                        steps.push({
                            tool: toolCall.name,
                            args: toolCall.args,
                            result: toolResult
                        });

                        // Add the tool's result back into the conversation history
                        messages.push(new ToolMessage({
                            content: toolResult,
                            name: toolCall.name,
                            tool_call_id: toolCall.id,
                        }));
                    }
                }
            } else {
                // If no tools were called, the agent has finished its thought process
                console.log("Agent finished task.");
                return { answer: response.content, steps: steps };
            }
        }
        return { answer: "Agent stopped after reaching maximum workflow steps.", steps: steps };
    } catch (error) {
        console.error("Agent execution error:", error);
        throw error;
    }
}

module.exports = { runAgent };
