require('dotenv').config();
const mongoose = require('mongoose');
const TaskLog = require('./models/TaskLog');

async function testDb() {
    try {
        console.log("Connecting to:", process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            tls: true,
            tlsAllowInvalidCertificates: true
        });
        console.log("Connected successfully.");
        
        const log = new TaskLog({ topic: "Test", content: "Test content" });
        await log.save();
        console.log("Saved successfully:", log._id);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
testDb();
