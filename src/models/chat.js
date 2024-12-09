const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  sessionType: { type: String, required: true },
  documentRef: { type: String },
  description: { type: String },
  vehicle: {
    id: { type: String },
    make: { type: String },
    model: { type: String },
    plateNumber: { type: String }
   },
  agent:[{
    id: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    addedOn: { type: Date, default: Date.now },
  }],
  user: {
    id: { type: String },
    firstName: { type: String },
    lastName: { type: String },
  },
  isClosed: { type: Boolean, default: false },
  isAssigned: { type: Boolean, default: false },
  opened: { type: Date, default: Date.now },
  closed: { type: Date, },
  messages: [{
    _id: { type: String, required: true }, 
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
