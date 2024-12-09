const express = require('express');
const router = express.Router();
const DocumentPrice = require('../models/documentprice');
const Document = require('../models/document');
const multer = require('multer');
const { uploadToCloudinary } = require('../controllers/cloudinaryController');
const Vehicle = require('../models/vehicle');
const upload = multer({ storage: multer.memoryStorage() }); // Use memory storage
require('dotenv').config();






router.post('/adddocument', upload.single('file'), async (req, res) => {
  try {
    const file = req.file; // In-memory file data
    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    const type = req.body.documentType;
    const documentId = req.body.documentId;
    const vehicleId = req.body.vehicleId;
    const expiring = req.body.expiring;

    if (!type) {
      return res.status(400).send('Missing document type.');
    }
    if (!documentId) {
      return res.status(400).send('Missing document ID.');
    }

    // Validate document type
    const validTypes = ['vehicleLicense', 'insurance', 'roadworthiness', 'vehicleReceipt', 'ownershipCertificate', 'hackney'];
    if (!validTypes.includes(type)) {
      return res.status(400).send('Invalid document type.');
    }

    // Check if the vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).send('Vehicle not found.');
    }

    // Call uploadToCloudinary function with in-memory file data
    const uploadResult = await uploadToCloudinary(
      file.buffer, // Use buffer instead of file path
      'vehicleDocuments',
      type,
      vehicleId,
    );

    if (!uploadResult.success) {
      return res.status(500).json({ message: 'Image upload failed', error: uploadResult.message });
    }

    // Create a new document instance
    const newDocument = new Document({
      _id: documentId,
      vehicleId,
      type,
      image: uploadResult.url, // Use the URL from Cloudinary
      verification: 'Pending',
      added: new Date().toISOString(),
      expiring

    });

    // Save the document to the database
    await newDocument.save();

    // Update the vehicle with the new document ID and specific document type
    const updateData = { $push: { documents: documentId } };

    // Dynamically update the fields based on the document type
    if (type === 'roadworthiness') {
      updateData.$set = {
        'roadWorthiness.documentId': documentId,
        'roadWorthiness.documentAdded': true,
      };
    } else if (type === 'vehicleReceipt') {
      updateData.$set = {
        'vehicleReceipt.documentId': documentId,
        'vehicleReceipt.documentAdded': true,
        'vehicleReceipt.added':  new Date().toISOString(),
      };
    } else if (type === 'vehicleLicense') {
      updateData.$set = {
        'vehicleLicense.documentId': documentId,
        'vehicleLicense.documentAdded': true,
      };
    } else if (type === 'hackney') {
      updateData.$set = {
        'hackney.documentId': documentId,
        'hackney.documentAdded': true,
      };
    } else if (type === 'insurance') {
      updateData.$set = {
        'insurance.documentId': documentId,
        'insurance.documentAdded': true,
      };

    }

    // Only update the fields that are provided
    await Vehicle.findByIdAndUpdate(vehicleId, updateData, { new: true });

    // Send a success response with the created document
    res.status(200).json({ message: 'Document added successfully', document: newDocument });

  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({ message: 'An error occurred while adding the document', error });
  }
});








// Get all documents
router.get('/price', async (req, res) => {
  try {
    const documentPrices = await DocumentPrice.find();
    res.status(200).json({
      message: "Successfully fetched",
      data: documentPrices
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
});









// Create a new document
router.post('/adddocumentprice', async (req, res) => {
  try {
    const { name, price, duration } = req.body;
    const newDocumentPrice = new DocumentPrice({ name, price, duration });
    await newDocumentPrice.save();
    res.status(201).json({
      message: "Successfully created",
      data: newDocumentPrice
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create document' });
  }
});








// Update an existing document
router.put('/update', async (req, res) => {
    try {
      const { id, name, duration, price } = req.body;
  
      // Find the document to update
      const documentToUpdate = await DocumentPrice.findById(id);
      if (!documentToUpdate) {
        return res.status(404).json({ error: 'Document not found' });
      }
  
      // Update fields if they are provided
      if (name) documentToUpdate.name = name;
      if (duration) documentToUpdate.duration = duration;
  
      // Update specific parts of the price object
      if (price) {
        if (price.car) documentToUpdate.price.car = price.car;
        if (price.bus) documentToUpdate.price.bus = price.bus;
        if (price.truck) documentToUpdate.price.truck = price.truck;
      }
  
      // Save the updated document
      const updatedDocumentPrice = await documentToUpdate.save();
  
      res.status(200).json({
        message: "Successfully updated",
        data: updatedDocumentPrice
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update document' });
    }
  });
  

// Delete a document
router.delete('/delete', async (req, res) => {
  try {
    const deletedDocumentPrice = await DocumentPrice.findByIdAndDelete(req.body.id);
    if (!deletedDocumentPrice) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.status(200).json({ message: 'Document deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});






module.exports = router;
