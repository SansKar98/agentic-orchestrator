const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    role: { type: String, enum: ['user', 'agent'], required: true },
    content: { type: String, required: true },
    steps: { type: Array, default: [] }, // Store tool execution steps
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
