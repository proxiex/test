const mongoose = require('mongoose');

const vehicleImageSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    vehicleId:  String, 
    front: String,
    back: String,
    left: String,
    right: String,
    driverSeat: String,
    dashboard: String,
    backSeat: String,
    addedOn: { type: Date, default: Date.now },
});

const vehicleImage = mongoose.model('vehicleImage', vehicleImageSchema);

module.exports = vehicleImage;

