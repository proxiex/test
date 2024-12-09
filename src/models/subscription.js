const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  isSubscribed: {
    type: Boolean,
    default: false,
    required: true,
  },
  name: {
    type: String,
    required: true,
    enum: ['Solo', 'Family', 'Corporate'], // Add any other subscription types as needed
  },
  cycle: {
    type: String,
    required: true,
    enum: ['Monthly', 'Yearly'], // Add more cycles if needed
  },
  description: {
    type: String,
  },
  amount: {
    type: Number,
    min: 1
  },
  renewalDate: {
    type: Date,
  },
  numberOfCars: {
    type: Number,
    required: true,
    min: 1, // Assuming there's at least 1 car per subscription
  },
  status: {
    type: String,
    enum: ['active', 'inactive'], // Add more cycles if needed// Assuming there's at least 1 car per subscription
  },
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
