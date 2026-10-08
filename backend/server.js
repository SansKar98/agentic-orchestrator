const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// cors() allows our frontend React app to communicate with this backend API without security blocking it.
app.use(cors());
// express.json() automatically parses incoming JSON data in the request body.
app.use(express.json()); 

// Serve static files (like generated PDFs and Images)
app.use('/pdfs', express.static(path.join(__dirname, 'public/pdfs')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Basic Test Route
// We define a simple GET route to make sure our server is running correctly.
app.get('/', (req, res) => {
    res.json({ message: 'Agentic Orchestrator API is running...' });
});

// Database Connection 
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    tls: true,
    tlsAllowInvalidCertificates: true // Fixes the TLS alert internal error during writes
})
    .then(() => console.log('MongoDB successfully connected!'))
    .catch(err => console.error('MongoDB connection error:', err));

const { runAgent } = require('./agent');
const Session = require('./models/Session');
const Message = require('./models/Message');

// Get all sessions
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await Session.find().sort({ updatedAt: -1 });
        res.json(sessions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Create a new session
app.post('/api/sessions', async (req, res) => {
    try {
        const session = new Session({ title: req.body.title || "New Chat" });
        await session.save();
        res.json(session);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Get messages for a session
app.get('/api/sessions/:id/messages', async (req, res) => {
    try {
        const messages = await Message.find({ sessionId: req.params.id }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message and trigger Agent
app.post('/api/sessions/:id/messages', async (req, res) => {
    try {
        const { prompt, mode } = req.body;
        const sessionId = req.params.id;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
        
        // 1. Save user message
        const userMsg = new Message({ sessionId, role: 'user', content: prompt });
        await userMsg.save();

        // Update session timestamp & title (if first message)
        const session = await Session.findById(sessionId);
        if (session.title === "New Chat") {
            session.title = prompt.substring(0, 30) + (prompt.length > 30 ? "..." : "");
        }
        session.updatedAt = Date.now();
        await session.save();

        // 2. Fetch history for the agent context
        const history = await Message.find({ sessionId }).sort({ createdAt: 1 });
        
        // 3. Run Agent with history and mode
        const result = await runAgent(prompt, history, mode);
        
        // 4. Save agent message
        const agentMsg = new Message({ 
            sessionId, 
            role: 'agent', 
            content: result.answer,
            steps: result.steps
        });
        await agentMsg.save();

        res.json({ success: true, userMessage: userMsg, agentMessage: agentMsg });
    } catch (error) {
        console.log("EXACT ERROR MESSAGE:", error.message);
        console.log("EXACT ERROR STACK:", error.stack);
        res.status(500).json({ error: 'Failed to run agent workflow' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
