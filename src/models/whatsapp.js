const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: String,
  timestamp: String,
  type: String,
  body: String,
  whEntry: String,
  image: {
    caption: String,
    mime_type: String,
    sha256: String,
    id: String
  },
  location: {
    latitude: Number,
    longitude: Number,
    name: String,
    address: String
  },
  button: {
    text: String,
    payload: String
  },
  interactive: {
    list_reply: {
      id: String,
      title: String,
      description: String
    },
    type: String
  },
  system: {
    body: String,
    new_wa_id: String
  },
});

const whatsAppMessageSchema = new mongoose.Schema({
  from: { type: String, unique: true },  // Ensure 'from' is unique
  role: String,
  metadata: {
    display_phone_number: String,
    phone_number_id: String
  },
  contact: {
    name: String,
    wa_id: String
  },
  messages: [messageSchema]  // Nested messages array
});

const WhatsAppMessage = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);

module.exports = WhatsAppMessage;
