const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }]
}, { timestamps: true });

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
