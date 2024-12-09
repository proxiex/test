const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    phoneNumber: String,
    role: String,
    otp: String,
    generatedAt: Date
});


const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;

