 const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    _id: { type: String,  required: true, },
    vehicleId: { type: String,  required: true, },
    type: { type: String,  required: true, },
    image: { type: String,  required: true, },
    expiring: { type: String,  required: true, },
    
    verification: {
      type: String,
      enum: ['Pending', 'Verified', 'failed'],
      default: 'Pending',
    },
    added: String,
    }, { timestamps: true });

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
