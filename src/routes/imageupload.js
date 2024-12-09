const express = require('express');
const multer = require('multer');
const { uploadToCloudinary } = require('../controllers/cloudinaryController');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage
require('dotenv').config();


router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file; // In-memory file data
    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    const uploadType = req.body.uploadType;
    const documentType = req.body.documentType;
    const userIdOrVehicleId = req.body.userIdOrVehicleId;

    if (!uploadType) {
      return res.status(400).send('Missing upload type.');
    }
    if (!documentType) {
      return res.status(400).send('Missing document type.');
    }
    if (!userIdOrVehicleId) {
      return res.status(400).send('Missing user ID or plate number.');
    }

    // Validate uploadType and documentType if necessary
    const validUploadTypes = ['userIdentity', 'vehicleDocuments'];
    const validDocumentTypes = ['DL', 'IP', 'VC', 'NIN', 'Vehicle License', 'Insurance', 'Roadworthiness', 'Customs Pappers', 'Ownership Certificate', 'Other'];

    if (!validUploadTypes.includes(uploadType)) {
      return res.status(400).send('Invalid upload type.');
    }
    if (!validDocumentTypes.includes(documentType)) {
      return res.status(400).send('Invalid document type.');
    }

    // Call uploadToCloudinary function with in-memory file data
    const result = await uploadToCloudinary(
      file.buffer, // Use buffer instead of file path
      uploadType,
      documentType,
      userIdOrVehicleId
    );

    if (result.success) {
      res.json({
        secure_url: result.url,
        public_id: result.publicId
      });
    } else {
      res.status(500).send(result.message);
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;