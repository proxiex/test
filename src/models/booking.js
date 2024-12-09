const { Double } = require('mongodb');
const mongoose = require('mongoose');
const addressSchema = require('./address');


const bookingSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  bookingId: String,
  user:{
    id: String,
    address: addressSchema,
  },
  engineer:{
    id: String,
    firstName: String,
    lastName: String,
    phoneNumber: String,
    address: addressSchema,
  },
  status: String,
  bookingType: String,
  amount: Number,
  transactionId: String,
  bookingDate: String,
  serviceType: String,
  category: String,
  vehicle: {
    id: String,
    make: String,
    model: String,
    plateNumber: String,
    logoImage: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
