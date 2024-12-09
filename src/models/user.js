const mongoose = require('mongoose');
const paymentAccountSchema = require('./paymentaccount');
const addressSchema = require('./address');
const subscriptionSchema = require('./subscription');

const userSchema = new mongoose.Schema({
  deviceId: String,
  walletBalance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deactivated'],
    default: 'active'
  },

  deactivationReason: String,
  deactivatedAt: String,

  isLoggedIn: Boolean,
  role: String,
  firstName: String,
  lastName: String,
  email: String,
  pin: String,
  resetToken: String,
  phoneNumber: {
    type: String,
    index: true,
  },
  gender: String,
  dob: String,
  emailVerified: Boolean,

  //subscription models
  subscription: subscriptionSchema.schema,

  //linked details
  cards: {
    cardToken: String,
    cardType: String,
    last4digits: String,
    cardLinked: Boolean,

  },
  vehicles: {
    type: [String],
    required: true,
  },
  repairRefs: [{
    type: String,
    required: true
  }],
  customRefs: [{
    type: String,
    required: true
  }],

  support: [{
    type: String,
    required: true
  }],

  orders: [{
    type: String,
  }],

  bookmarks: [{
    type: String,
  }],

  //activities
  activitiy: [{
    id: String,
    eventType: String,
    status: String,
    paymentRef: String,
    paymentStatus: String,
    priority: Number,
    repairRef: String,
    bookingId: String,
    ptRef: String,
    ptStatus: String,
    ltRef: String,
    ltStatus: String,
  }],

  //Identity
  identifications: [{
    type: String,
    required: true
  }],

  address: addressSchema,
  deliveryAddress: [addressSchema],
  paymentAccounts: [paymentAccountSchema],
  transactions: [{
    type: String,
    required: true
  }],

});

const User = mongoose.model('User', userSchema);
module.exports = User;
