const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  route: {
    type: String,
    required: true,
  },
  distance: {
    type: String,
    required: true,
  },
  transport: {
    type: String,
    required: true,
  },
  minCost: {
    type: Number,
    required: true,
  },
  maxCost: {
    type: Number,
    required: true,
  },
});

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
