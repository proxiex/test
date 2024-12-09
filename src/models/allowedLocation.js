const mongoose = require('mongoose');

const allowedLocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  }
  // Add any other fields you need
});

const AllowedLocation = mongoose.model('AllowedLocation', allowedLocationSchema);

module.exports = AllowedLocation;