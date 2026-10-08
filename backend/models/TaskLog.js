const mongoose = require('mongoose');

const taskLogSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TaskLog', taskLogSchema);
