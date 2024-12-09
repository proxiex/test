const mongoose = require('mongoose');

const documentPriceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    car: {type: String, required: true },
    bus: {type: String, required: true },
    truck: {type: String, required: true },
  },
  duration: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const DocumentPrice = mongoose.model('DocumentPrice', documentPriceSchema);

module.exports = DocumentPrice;
