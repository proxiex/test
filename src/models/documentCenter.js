const mongoose = require('mongoose');
const addressSchema = require('./address');

const documentCenterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  deviceId:{
    type: String,
  },

  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phoneNumber: { type: String, required: true, index: true, },
  phoneVerified: { type: Boolean, required: true },
  gender: { type: String, required: true },

  logo: { type: String, },
  companyName: { type: String, },
  address: addressSchema,

  services: { type: [String], required: true },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },


  pin: { type: String },
});

const DocumentCenter = mongoose.model('DocumentCenter', documentCenterSchema);

module.exports = DocumentCenter;
