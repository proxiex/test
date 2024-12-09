const mongoose = require('mongoose');

const carLogoSchema = new mongoose.Schema({
  // Define your schema properties
  brand: String,
  url: String,
  // Add more properties if needed
});


const CarLogo = mongoose.model('CarLogo', carLogoSchema);


module.exports = CarLogo;
