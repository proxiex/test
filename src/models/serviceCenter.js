const mongoose = require('mongoose');
const addressSchema = require('./address');

const serviceCenterSchema = new mongoose.Schema({

  _id: {
    type: String,
    required: true
  },
  deviceId:{
    type: String,
  },

  companyName: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  phoneVerified: {
    type: Boolean,
    required: true,
  },
  address: addressSchema,

  pin: {
    type: String,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  category: [{
    type: String, // Array of services offered
  }],
  gender: { type: String, required: true },

  make: [{
    type: String,
  }],

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },

  referralCode: {
    type: String,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ServiceCenter = mongoose.model('ServiceCenter', serviceCenterSchema);

module.exports = ServiceCenter;
