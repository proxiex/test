
const mongoose = require('mongoose');
const addressSchema = require('./address');
const Vehicle = require('./vehicle');
const towServiceSchema = new mongoose.Schema({

    _id: { type: String, required: true },
    deviceId:{
        type: String,
    },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    gender: { type: String, required: true },

    phoneNumber: { type: String, required: true, index: true, },
    phoneVerified: { type: Boolean, required: true },
    pin: { type: String },


    companyName: { type: String, },
    address: addressSchema,
    logo: { type: String, },

    vehicles: {
        type: [String],
    },

    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },


});

const TowService = mongoose.model('TowService', towServiceSchema);

module.exports = TowService;
