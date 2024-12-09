const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  _id: false,
  _id: { type: String, required: true },
  status: { type: String, required: true },
  name: { type: String, required: true },
  compatibility: { // Changed to nested arrays of strings
    type: [{
      make: { type: String, required: true },
      models: { type: [{
        model: { type: String, required: true },
        years: { type: [Number], required: true },

      }], required: true },
    }], required: true
  },
  images: { type: [String], required: true },
  description: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  subcategory: { type: String, required: true },
  merchantId: { type: String, required: true },
  orders: { type: [String] },
  priceOption: {
    type: [{
      condition: { type: String, required: true },
      price: { type: Number, required: true },
      unit: { type: Number, required: true },
      warranty: { type: String, required: true },

    }], required: true
  },
  featured: { type: Boolean },
  onsale: { type: Boolean },
  topselling: { type: Boolean },
  reviews: { type: [String] },
  createdAt: { type: String, required: true },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
