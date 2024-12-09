const mongoose = require('mongoose');

const unassignedTransactionSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  reference: {
    type: String,
    required: true,
  },

reason: {
  type: String,
},
  customer: {
    // If it's a charge event
    first_name: String,
    last_name: String,
    email: String,
    phone: String,

    // If it's a transfer event
    name: String,
    account_number: String,
    account_name: String,
    bank_name: String,
    recipient_code: String,
  },

  // New additions for transfer events
  session: {
    provider: String,
    id: String,
  },
  created_at: String,
  updated_at:  String,
  
});


const UnassignedTransaction = mongoose.model('UnassignedTransaction', unassignedTransactionSchema);

module.exports = UnassignedTransaction;
