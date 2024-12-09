const mongoose = require('mongoose');

const logisticsConfigSchema = new mongoose.Schema({
  engineer: {
    // pricePerKg: {
    //   type: Number,
    //   required: true
    // },
    pricePerKm: {
      type: Number,
      required: true
    },
    baseKm: {
      type: Number,
      required: true
    },
    basePrice: {
      type: Number,
      required: true
    },
  },

  delivery: {
    pricePerKg: {
      type: Number,
      required: true
    },
    pricePerKm: {
      type: Number,
      required: true
    },
    basePrice: {
      type: Number,
      required: true
    },
  }
});


const LogisticsConfig = mongoose.model('LogisticsConfig', logisticsConfigSchema);

module.exports = LogisticsConfig;
