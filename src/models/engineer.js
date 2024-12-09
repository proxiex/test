const mongoose = require('mongoose');
const paymentAccountSchema = require('../models/paymentaccount');
const addressSchema = require('./address');


const engineerSchema = new mongoose.Schema({
  _id: {
    type: String, 
    required: true,
  },
  deviceId:{
    type: String,
  },
  referralCode: {
    type: String,
  },
  role:  {
    type: String,
    required: true,
    default: 'engineer',
  },
  resetToken: String,
  pin: String,

  availableBalance: {
    type: Number,
    default: 0
  },
  pendingBalance:{
    type: Number,
    default: 0
  },
  pendingPayoutBalance:{
    type: Number,
    default: 0
  },
  
  paymentAccounts: [paymentAccountSchema],
  
  support: [{
    
    type:String,
    
    
  }],
  transactions:[{
    type:String,
  }],
  
  bookings: [{
    type:String,
  }],
  
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  gender: {type: String, required: true},
  address: {
    type: addressSchema,
    required: true
  },

  phoneNumber: {
    type: String,
    required: true,
    index: true,
  },
  phoneVerified : {
    type: Boolean,
    required: true,
  },
  engineerImage: {
    type: String,
    default: '',
  },
 
  category: [{
    type: String,
  }],
  make: [{
    type: String,
  }],
  availability: {
    type: [String],
    required: true,
  },

  repairRefs: [{
    type:String,
  }],

  status: {
    type: String,
    enum: ['active', 'inactive', 'deactivated'],
    default: 'active'
  },
  deactivationReason: String,
  deactivatedAt: String,


}, { timestamps: true });

const Engineer = mongoose.model('Engineer', engineerSchema);

engineerSchema.index({ 'address.location': '2dsphere' })

module.exports = Engineer;
