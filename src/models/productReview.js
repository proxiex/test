const mongoose = require('mongoose');

const productReviewSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true
  },
  
  productId: {
    type: String,
    required: true
  },

  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true
  },
  review: {
    type: String,
    required: true
  },
  dateAdded: {
    type: Date,
    default: Date.now
  }
});

const ProductReview = mongoose.model('ProductReview', productReviewSchema);

module.exports = ProductReview;
