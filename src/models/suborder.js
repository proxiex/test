// subOrderModel.js

const mongoose = require('mongoose');

const subOrderSchema = new mongoose.Schema({
  products: [{
    productId: String,
    productName: String,
    condition: String,
    category: String,
    price: Number,
    commission: Number,
    quantity: Number,
    images: [String],
    merchantId: String,
  }],
  orderDate: { type: Date, default: Date.now },
  isFullfilled: Boolean,
  filfilmentDate: { type: Date},
  merchantId:  { type: String, required: true },
  pendingPayout: {type: Boolean, required: true}

});

const SubOrder = mongoose.model('SubOrder', subOrderSchema);

module.exports = SubOrder;
