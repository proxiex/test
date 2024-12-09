const mongoose = require('mongoose');


const transactionSchema = new mongoose.Schema({
// universal variables
transfer_code: String,
reference: String, 
status: String,
userId: String,
role: String,
narration: String,
amount: Number,
transactionType: String,
paymentfor: String,
transferType: String,

  // engineer transfers
  repairRef: String,
  labourAfterComission: Number,

  //merchant payout
  paymentId: String,

  timestamp: {
      type: Date,
    default: Date.now,
  },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;

