// subOrderModel.js

const mongoose = require('mongoose');

const locationTrailSchema = new mongoose.Schema({
    userId: {
      type: String,
      index: true,
    },
    longitude: String,
    latitude: String,
    timestamp: Date,
});

const LocationTrail = mongoose.model('LocationTrail', locationTrailSchema);

module.exports = LocationTrail;
