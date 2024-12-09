const mongoose = require('mongoose');

const serviceNumberSchema = new mongoose.Schema({
  service: { type: String, required: true },
  number: { type: String, required: true }, // Store the icon as a string, for example 'Icons.build'
}, {
  timestamps: true,
});

const ServiceNumber = mongoose.model('ServiceNumber', serviceNumberSchema);

const engineerServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String, required: true }, // Store the icon as a string, for example 'Icons.build'
  status: { type: String, required: true }, // Store the icon as a string, for example 'Icons.build'
}, {
  timestamps: true,
});

const EngineerService = mongoose.model('EngineerService', engineerServiceSchema);


const appServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, required: true }, // Store the icon as a string, for example 'Icons.build'
}, {
  timestamps: true,
});

const AppService = mongoose.model('AppService', appServiceSchema);

module.exports = {ServiceNumber, EngineerService,  AppService};



