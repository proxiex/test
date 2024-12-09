const mongoose = require('mongoose');

const customRequestSchema = new mongoose.Schema({
  deviceId: String,
  customRef: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  make: {
    type: String,
    required: true
  },
  serviceType: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  plateNumber: {
    type: String,
    required: true
  },
  repairCategory: {
    type: String,
    required: true
  },
  repairDescription: {
    type: String,
    required: true
  },
 
  status: {
    type: String,
    enum: ['Pending', 'Assigned', 'Cancelled'],
    default: 'Pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  assignedRepairRef: {
    type: String,
  }
}, { timestamps: true });

const CustomRequest = mongoose.model('CustomRequest', customRequestSchema);

module.exports = CustomRequest;