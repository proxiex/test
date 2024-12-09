const mongoose = require('mongoose');

const carBrandSchema = new mongoose.Schema({
  make: String,
  model: String,
  category: String,
  year: Number,
});

const CarBrand = mongoose.model('CarBrand', carBrandSchema);

module.exports = CarBrand;
