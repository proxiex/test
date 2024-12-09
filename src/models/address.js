const mongoose = require('mongoose');
import { pointSchema } from './pointSchema';
const addressSchema = new mongoose.Schema({
  state: {
    type: String,
    required: true,
  },
  lga: {
    type: String,
    required: true,
  },
  area: {
    type: String,
    required: true,
  },
  street: {
    type: String,
    required: true,
  },
  building: {
    type: String,

  },
  location: {
    type: {
      type: String, 
      enum: ['Point'], // 'location.type' must be 'Point'
    },
    coordinates: {
      type: [Number],
    }
  },
  longitude: {
    type: String,
  },
  latitude: {
    type: String,
  },

});

addressSchema.index({ location: "2dsphere" });

module.exports = addressSchema;