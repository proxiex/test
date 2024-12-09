const mongoose = require('mongoose');

const deliveryOptionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  duration: {
    type: String,
    required: true
  }
});

const DeliveryOption = mongoose.model('DeliveryOption', deliveryOptionSchema);

module.exports = DeliveryOption;
