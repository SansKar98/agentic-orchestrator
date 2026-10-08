const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
require('dotenv').config();

require('dotenv').config();
const { runAgent } = require('./agent');

async function test() {
    const response = await runAgent("Search the web for the latest MERN stack tutorials and then email the summary to test@example.com.");
    console.log("FINAL AGENT RESPONSE:\n", response);
}

test();
