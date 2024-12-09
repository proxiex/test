const mongoose = require('mongoose');

const insuranceSchema = new mongoose.Schema({
    id: { type: String, required: true, },
    image: String, 
    policyNumber: { type: String, required: true },
    issuer: { type: String, required: true },
    plan: { type: String, required: true },
    cover: String,
    duration: { type: String, required: true },
    rate: String,
    expiringDate: { type: String, required: true },
    activated: { type: Boolean, default: true },
    momManaged: {   type: Boolean,  default: false },
    addedOn: { type: Date, default: Date.now }
  });
  
  module.exports = insuranceSchema;