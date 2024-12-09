// payment_account_schema.js
const mongoose = require('mongoose');

const paymentAccountSchema = new mongoose.Schema({
  recipient_code: { type: String, required: true, trim: true },
  bank_name: { type: String, required: true, trim: true },
  account_name: { type: String, required: true, trim: true },
  account_number: { type: String, required: true, trim: true },
  isDefault: { type: Boolean, default: false }
});

module.exports = paymentAccountSchema; // Export the schema


