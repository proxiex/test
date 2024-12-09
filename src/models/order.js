const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  deviceId: String,
  reference: String,
  products: [{
    productId: String,
    productName: String,
    condition: String,
    category: String,
    price: Number,
    rating: Number,
    quantity: Number,
    fulfillmentImages: [String],
    fulfilled: Boolean,
    merchantId: String,
    reviewAdded: Boolean,
    reviewId: String
  }],
  commission:Number,
  pendingPayout: {type: Boolean, required: true, default: true},
  subOrders: [{ type: String }], // References to suborders
  shippingOption: { type: String, required: true },
  shippingAddress: { type: String, required: true },
  shippingState: { type: String, required: true },
  contactNumber: { type: String, required: true },
  deliveryInstructions: String,
  orderDate: String,
  orderCost: { type: Number, required: true },
  deliveryCost: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  isMultipleMerchants: { type: Boolean, default: false },
  userId: String,
  status: { type: String, default: 'Pending' },

  deliveryReviews: [{
    review: String,
    communicationRating: Number,
    timelyDeliveryRating: Number
  }],

  fulfillmentAgentId: String,

  itemPacked: { type: Boolean, default: false },
  itemPackedDate: String,
  packedOrderImages: [String],

  assignedToDeliveryAgent: { type: Boolean, default: false },
  assignmentDate: String,
  agentId: String,
  agentName: String,
  agentNumber: String,
  
  orderInTransit: { type: Boolean, default: false },
  orderInTransitDate: String,
  orderDeliveryState: String,

  orderReadyforPickup: { type: Boolean, default: false },
  orderReadyforPickupDate: String,
  orderReadyforPickupImages: [String],

  orderDelivered: { type: Boolean, default: false },
  orderDeliveredDate: String,
  orderDeliveredImage: String,
  orderDeliveredToName: String,
  orderDeliveredToPhoneNumber: String,
  
  orderPickedUp: { type: Boolean, default: false },
  orderPickedUpDate: String,
  orderPickedUpbyName: String,
  orderPickedUpbyImage: String,
  orderPickedUpbyNumber: String,
  isFullfilled: Boolean
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
