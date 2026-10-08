# Agentic Orchestrator

An intelligent, multi-agent orchestrator system built with React, Node.js, and Google Gemini API. The system features a ChatGPT-like interface and routes user requests dynamically to specialized sub-agents based on the task context.

## 🚀 Features

- **Dynamic Task Routing:** The primary LLM analyzes prompts and decides which specialized tool/agent to invoke.
- **ChatGPT-like Interface:** Built with React, featuring markdown rendering, code highlighting, and session management.
- **Multi-Agent Capabilities:**
  - 🌐 **Web Search Agent:** Real-time factual searching using DuckDuckGo.
  - 🖼️ **Image Generation Agent:** AI image generation using Pollinations.ai with native local downloading.
  - 🔍 **Image Search Agent:** Real-world image fetching.
  - 📄 **PDF Agent:** Generates well-formatted PDF documents dynamically.
  - 📚 **PDF Reading Agent:** Extracts text from local or remote PDFs.
  - ⛅ **Weather Agent:** Fetches real-time weather data.
  - 💻 **Coding Agent:** Solves programming tasks.
- **Session Memory:** Uses MongoDB to store chat histories and maintain contextual sessions.
- **Email Integration:** Nodemailer integration to directly send generated PDFs, images, and research to users.

## 🛠️ Technology Stack

- **Frontend:** React, TailwindCSS, Vite
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **AI/LLM:** Google Gemini API (`gemini-flash-lite-latest`)
- **Tools:** PDFKit, Duck-Duck-Scrape, Nodemailer, React-Markdown

## ⚙️ Setup Instructions

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas Cluster
- Google Gemini API Key

### 2. Backend Setup
\`\`\`bash
cd backend
npm install
\`\`\`
Create a \`.env\` file in the \`backend\` directory with the following variables:
\`\`\`
PORT=5005
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_google_gemini_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
\`\`\`
Start the backend:
\`\`\`bash
npm run dev
\`\`\`

### 3. Frontend Setup
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

## 📝 License
This project is open-source and available under the MIT License.
