const mongoose = require('mongoose');

const newsletterSubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true, // Ensure that each email is unique
    trim: true, // Remove whitespace
    lowercase: true, // Convert to lowercase
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set the date when the subscription is created
  },
});

// Create the model
const NewsLetterSubscription = mongoose.model('NewsLetterSubscription', newsletterSubscriptionSchema);

module.exports = NewsLetterSubscription;