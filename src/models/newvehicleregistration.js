const mongoose = require('mongoose');

// Plate Number Registration Fees Schema
const plateNumberRegistrationFeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  
});


// New Vehicle Registration Schema
const newVehicleRegistrationFeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  
  price: {
    PV: {
      type: Number,
      required: true,
    },
    CM: {
      type: Number,
      required: true,
    },
  },
});

// New Vehicle Registration Schema
const changeOfOwnershipSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  price: {
    PV: {
      type: Number,
      required: true,
    },
    CM: {
      type: Number,
      required: true,
    },
  },
});



const vehicleRegistrationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  paymentReference: {
    type: String,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  vehicleDetails: {
    make: { type: String, required: true },
    model: { type: String, required: true },
    category: { type: String, required: true },
    year: { type: String, required: true },
    color: { type: String, required: true },
    vin: { type: String, required: true },
    engineNumber: { type: String, required: true },
    numberPlateType: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
  },
  ownerDetails: {
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    secondPhoneNumber: { type: String },
    dob: { type: Date, required: true },
    contactAddress: { type: String, required: true },
  },
  documents: {
    vehicleReceipt: { type: [String], required: true },
    idImage: { type: String, required: true },
    idType: { type: String, required: true },
    iDNumber: { type: String, required: true },
  },
  insurance: {
    registerWithouInsurance: { type: Boolean, default: false },
    selectedInsuranceType: { type: String },
    insuranceCost: { type: Number },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});



// Create models for each schema
const VehicleRegistration = mongoose.model('VehicleRegistration', vehicleRegistrationSchema);
const PlateNumberRegistrationFee = mongoose.model('PlateNumberRegistrationFee', plateNumberRegistrationFeeSchema);
const NewVehicleRegistrationFee = mongoose.model('NewVehicleRegistrationFee', newVehicleRegistrationFeeSchema);
const ChangeOfOwnership = mongoose.model('ChangeOfOwnership', changeOfOwnershipSchema);

// Export both models separately
module.exports = {
  PlateNumberRegistrationFee,
  NewVehicleRegistrationFee,
  VehicleRegistration,
  ChangeOfOwnership
};
