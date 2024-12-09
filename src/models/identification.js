const mongoose = require('mongoose');

// Define the schema for identification
const identificationSchema = new mongoose.Schema({
 
  // _id: { type: String,  required: true, },
  userId: { type: String,  required: true, },
  status: { type: String,  required: true, },
  idNumber: { type: String,  required: true, },
  type: { type: String, required: true,
   
    },
  
  verification: {
    type: String,
    enum: ['Pending', 'Verified', 'failed'],
    default: 'Pending',
  },
  
  image: { type: String,  required: true, },
  },
  
 
 { timestamps: true }); // Add timestamps for createdAt and updatedAt

// Create the model
const Identification = mongoose.model('Identification', identificationSchema);

module.exports = Identification;
