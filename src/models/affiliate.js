const mongoose = require('mongoose');
const addressSchema = require('./address');
const paymentAccountSchema = require('./paymentaccount');

const affiliateSchema = new mongoose.Schema({
    role: {
        type: String,
        required: true,
        default: 'affiliate'
      },

  transactions: [{
    type: String,
  }],
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
 
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  pin: {
    type: String,
    required: true,
    trim: true
  },
  resetToken: String,

  referralCode: {
    type: String,
    unique: true,
    required: true
  },

  engineers: [{
    type: String,
  }],

  merchants: [{
    type: String,
  }],

  servicecenters: [{
    type: String,
  }],



  pendingEarnings: {
    type: Number,
    default: 0
  },
  availableEarnings: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deactivated'],
    default: 'active'
  },


  address: addressSchema,
  paymentAccount: paymentAccountSchema,

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});


const Affiliate = mongoose.model('Affiliate', affiliateSchema);

module.exports = Affiliate;

