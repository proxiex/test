const mongoose = require('mongoose');
const paymentAccountSchema = require('../models/paymentaccount');
const addressSchema = require('./address');


const merchantSchema = new mongoose.Schema({

  _id: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    trim: true
  },
  availableBalance: {
    type: Number,
    default: 0
  },
  pendingBalance: {
    type: Number,
    default: 0
  },
  pendingPayoutBalance: {
    type: Number,
    default: 0
  },
  
  phoneVerified : {
    type: Boolean,
    required: true,
  }, 
  paymentAccounts: [paymentAccountSchema],

  role:  {
    type: String,
    required: true
  },
  referralCode: {
    type: String,
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'deactivated'],
    default: 'active'
  },

  isVerified: {
    type: Boolean,
    required: true
  },
  companyName: {
    type: String,
    trim: true
  },
  
  companyLogo: {
    type: String,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  gender: {type: String, required: true},
  category: [{
    type: String,
  }],
  make: [{
    type: String,
  }],
  pin: {
    type: String,
  },
  resetToken: String,
  phoneNumber: {
    index: true,
    type: String,
    required: true,
    trim: true
  },
  address: addressSchema,
  products: [{
    type: String
  }],
  orders: [{
    type: String,
  }],
  support: [{
    type: String
  }],
  payouts: [{type: String}]
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});

const Merchant = mongoose.model('Merchant', merchantSchema);

module.exports = Merchant;
