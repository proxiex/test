const mongoose = require('mongoose');
const accessTokenSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  tokenValid: {
    type: Boolean,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },

});


module.exports = accessTokenSchema;