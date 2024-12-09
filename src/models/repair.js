const { Double } = require('mongodb');
const mongoose = require('mongoose');

const repairTicketSchema = new mongoose.Schema({
  _id: String,
  deviceId: String,

  bookingId: String,
  repairRef: String,
  transactionReference: String,
  
  hierarchy: String,
  relatedTickets: [String],
  disputeId: String,

  
 
  labourTransferReference: String,
  labourTransferStatus: String,
  LTToken: String,
  
  partsTransferReference: String,
  partsTransferStatus: String,
  PTToken: String,
  
  user: {
    id: String,
    firstName: String,
    lastName: String,
    phoneNumber: String,
  },

  engineer: {
    id: String,
    firstName: String,
    lastName: String,
    recipient_code: String,
    image: String,
  },

  //vehicle details
  vehicle: {
    id: String,
    make: String,
    model: String,
    plateNumber: String,
    logoUrl: String,
  },
  
  // repair details
  category: String,
  isCompleted: Boolean,
  isDisputed: Boolean,
  isDisputeClosed: Boolean,
  isReviewAdded: Boolean,
  repairDescription: String,
  serviceType: String,
  repairItems: String,
  repairType: String,
  startDate: {
    type: Date,
    default: Date.now, 
  },

  completedDate: Date,
  
  //Location details
  lga: String,
  state: String,


  //repair costs
  labourCost: { type: Number, required: true },
  commission: { type: Number, required: true },
  partsCost:  { type: Number, required: true },
  totalCost:  { type: Number, required: true },


  // review data
  communicationRating: Number,
  knowledgeOfProblem: Number,
  review: String,
  reviewAddedAt: Date,
  reviewAddedBy: String,
  reviewAddedByFirstName: String,
  reviewAddedByLastName: String,

});

const RepairTicket = mongoose.model('RepairTicket', repairTicketSchema);

module.exports = RepairTicket;
