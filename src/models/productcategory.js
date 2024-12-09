const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    Category: String,
    Subcategory: [String] 
});

module.exports = mongoose.model('Category', categorySchema);
