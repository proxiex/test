const mongoose = require('mongoose');

const payoutRequestSchema = new mongoose.Schema({
  userId: String,
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  orderIds: [String],
  orderDetails: [{
    orderId: String,
    commission: Number,
    amount: Number,
  }],
  totalAmount: Number,
  totalCommission: Number,
  withdrawalAmount: Number,
  transactionId: String,
  paymentAccount: {
    recipient_code: String,
    bank_name: String,
    account_name: String,
    account_number: String,
  },
}, { timestamps: true });

const PayoutRequest = mongoose.model('PayoutRequest', payoutRequestSchema);

module.exports = PayoutRequest;
