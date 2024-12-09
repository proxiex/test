const mongoose = require('mongoose');

const engineercategorySubServiceSchema = new mongoose.Schema({
  category: String,
  subcategories: [String],
});

const EngineercategorySubService = mongoose.model('EngineercategorySubService', engineercategorySubServiceSchema);

module.exports = EngineercategorySubService;

