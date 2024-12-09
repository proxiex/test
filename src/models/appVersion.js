const mongoose = require('mongoose');

// Define the schema for the version data
const appVersionSchema = new mongoose.Schema({
  version: {
    type: String,
    required: true,
    unique: true, // Ensures no duplicate versions are stored
  },
  forced_update: {
    type: Boolean,
    required: true,
    default: false, // Default to false if not specified
  },
  release_notes: {
    type: String,
    default: '', // Optional field for release notes
  },
}, { timestamps: true }); // Automatically manage createdAt and updatedAt fields

// Create the model from the schema
const AppVersion = mongoose.model('AppVersion', appVersionSchema);

module.exports = AppVersion;
