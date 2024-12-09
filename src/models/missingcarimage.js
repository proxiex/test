const mongoose = require('mongoose');

// Define the schema for the MissingCarImage collection
const missingCarImageSchema = new mongoose.Schema({
  queryString: {
    type: String,
    required: true,
  },
  year: {
    type: String, // You may adjust the type based on your requirements
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the MissingCarImage model using the schema
const MissingCarImage = mongoose.model('MissingCarImage', missingCarImageSchema);

module.exports = MissingCarImage;
