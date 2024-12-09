const mongoose = require('mongoose');

const carImageSchema = new mongoose.Schema({
  // Define your schema properties
  name: String,
  url: String,
  // Add more properties if needed
});


const CarImage = mongoose.model('CarImage', carImageSchema, 'carimages');


module.exports = CarImage;
