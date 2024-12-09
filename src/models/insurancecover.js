const mongoose = require('mongoose');

const insuranceCompanySchema = new mongoose.Schema({
  issuer: {
    type: String,
    required: true,
  },
  offers: {
    type: [String],
    required: true,
  },
});

const InsuranceCompany = mongoose.model('InsuranceCompany', insuranceCompanySchema);


const insurancePartnerSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  key_benefits: { type: String, required: true },
  full_benefits: { type: String, required: true },
  description: { type: String, required: true },
  meta: {
      cover_type: { type: String },
      product_id: { type: String },
      productId: { type: String },
      subClassId: { type: String },
      productName: { type: String },
      sectionType: { type: String },
      subClassName: { type: String },
      truck_price: { type: String },
      private_price: { type: String },
      commercial_price: { type: String }
  },
  renewable: { type: Boolean, required: true },
  claimable: { type: Boolean, required: true },
  inspectable: { type: Boolean, required: true },
  certificateable: { type: Boolean, required: true },
  is_dynamic_pricing: { type: Boolean, required: true },
  price: {
    car: {type: String, required: true },
    bus: {type: String, required: true },
    truck: {type: String, required: true },
    other: {type: String, required: true },
  },
  cover_period: { type: String },
  insurance_cover: { type: String },
  active: { type: Boolean, required: true },
  provider: {
      name: { type: String, required: true },
      id: { type: String, required: true }
  },
  productCategory: {
      name: { type: String, required: true },
      id: { type: String, required: true }
  },
  status: String
});

const InsurancePartner = mongoose.model('InsurancePartner', insurancePartnerSchema);




module.exports = {InsuranceCompany, InsurancePartner };
