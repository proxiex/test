const mongoose = require('mongoose');

const plateNumberSchema = new mongoose.Schema({
 
  plateNumber: {
    type: String,
    required: true,
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Define the Ticket model
const PlateNumber = mongoose.model('PlateNumber', plateNumberSchema);

module.exports = PlateNumber;
