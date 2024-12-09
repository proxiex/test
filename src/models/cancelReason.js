// models/CancelReason.js

const mongoose = require('mongoose');

const cancelReasonSchema = new mongoose.Schema({
  userId: String,
  bookingId: String,
  amount: String,
  transactionId:String,
  engineerId: String,
  reason: String
});

const CancelReason = mongoose.model('CancelReason', cancelReasonSchema);

module.exports = CancelReason;
