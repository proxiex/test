const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const addressSchema = require('./address');

const agentSchema = new mongoose.Schema({

deviceId:{
  type: String,
},
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

  status: {
    type: String,
    enum: ['active', 'inactive', 'deactivated'],
    default: 'active'
  },

  deviceId:{
    type: String,
},
resetToken: String,
 
  
  role:{
    type: String,
    required: true,
},
access:{
  type: Number,
  required: true,
  default: 1,
},


  pin: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
  },
  gender: {
    type: String,
  },
  address: addressSchema,
  imageUrl: {
    type: String,
  },
  targets: [{
    month: String,
    target: Number,
    registrations: Number,
    route: String
  }],
  

  support: [{
    
    type:String,
    
    
  }],

  orders: [{
    
    type:String,
    
    
  }],

  engineers: [{
    type:String,
  }], 

  merchants: [{
    type:String,
  }],

  servicecenters: [{
    type:String,
  }],

  towservices: [{
    type:String,
  }],

  documentcenters: [{
    type:String,
  }],

});






const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent;
