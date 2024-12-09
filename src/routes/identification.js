const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/user');
const Identification = require('../models/identification');
const multer = require('multer');
const { uploadToCloudinary } = require('../controllers/cloudinaryController'); // Adjust the path as necessary

const upload = multer({ storage: multer.memoryStorage() }); // Store uploaded files in memory



// Endpoint to get all identification

router.get('/', async (req, res) => {
    try {
      // Retrieve all identifications from the database
      const identifications = await Identification.find();
  
      // Respond with the list of identifications
      res.status(200).json({
        message: 'Identifications retrieved successfully',
        identifications: identifications,
      });
    } catch (error) {
      console.error('Error retrieving identifications:', error);
      res.status(500).json({ message: 'Failed to retrieve identifications', error: error.message });
    }
  });




// Create Identification endpoint
router.post('/add', upload.single('file'), async (req, res) => {
  try {
    const file = req.file; // In-memory file data
    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    const type = req.body.documentType; // Identification type
    const userId = req.body.userId; // User ID
    const documentId = req.body.documentId; // Optional document ID
    const idNumber = req.body.idNumber; // ID number (if applicable)

    if (!type) {
      return res.status(400).send('Missing document type.');
    }
    if (!userId) {
      return res.status(400).send('Missing user ID.');
    }

    // Validate document type
    const validTypes = ["NIN", "VC", "IP", "DL"];
    if (!validTypes.includes(type)) {
      return res.status(400).send('Invalid document type.');
    }

    // Call uploadToCloudinary function with in-memory file data
    const uploadResult = await uploadToCloudinary(
      file.buffer,
      'userIdentity',
      type,
      userId
    );

    if (!uploadResult.success) {
      return res.status(500).json({ message: 'Image upload failed', error: uploadResult.message });
    }

    // Create a new identification document instance
    const newIdentification = new Identification({
      _id: uploadResult.publicId, // Use the publicId from the upload
      userId,
      status: 'Active',
      idNumber, // Ensure this is formatted or validated if necessary
      type,
      image: uploadResult.url, // Use the URL from Cloudinary
      verification: 'Pending',
    });

    // Save the identification document to the database
    await newIdentification.save();

    // Optionally update existing document if documentId is provided
    if (documentId) {
      await Identification.findByIdAndUpdate(documentId, { 
        $set: { 
          identificationId: newIdentification._id, // Save reference to the new identification
        } 
      });
    }

    // Update the user's identification array with the new identification ID
    await User.findByIdAndUpdate(userId, { $push: { identification: newIdentification._id } });

    // Send a success response with the created identification document
    res.status(201).json({ message: 'Identification document added successfully', identification: newIdentification });

  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({ message: 'An error occurred while adding the document', error });
  }
});





// Endpoint to update an identification
router.put('/update/:id', async (req, res) => {
  const identificationId = req.params.id;
  const { IDImage, IDNumber, IDType, status, firstName, lastName, dob } = req.body;

  try {
    // Find and update the identification
    const updatedIdentification = await Identification.findByIdAndUpdate(
      identificationId,
      { IDImage, IDNumber, IDType, status, firstName, lastName, dob },
      { new: true } // Return the updated document
    );

    if (!updatedIdentification) {
      return res.status(404).json({ message: 'Identification not found' });
    }

    res.status(200).json({
      message: 'Identification updated successfully',
      identification: updatedIdentification,
    });
  } catch (error) {
    console.error('Error updating identification:', error);
    res.status(500).json({ message: 'Failed to update identification', error: error.message });
  }
});

// Endpoint to delete an identification
router.delete('/delete/:id', async (req, res) => {
  const identificationId = req.params.id;

  try {
    // Find and remove the identification
    const deletedIdentification = await Identification.findByIdAndDelete(identificationId);

    if (!deletedIdentification) {
      return res.status(404).json({ message: 'Identification not found' });
    }

    // Find the user and remove the identification from the identification array
    const user = await User.updateMany(
      { identification: identificationId },
      { $pull: { identification: identificationId } }
    );

    if (user.modifiedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Identification deleted successfully',
      identification: deletedIdentification,
    });
  } catch (error) {
    console.error('Error deleting identification:', error);
    res.status(500).json({ message: 'Failed to delete identification', error: error.message });
  }
});


// Endpoint to verify an identification
router.post('/verify', async (req, res) => {
  const { firstName, lastName, dob, searchParameter, idType } = req.body;

  // Map the idType to the corresponding verificationType and API key
  let verificationType;
  let apiKey;
  let requestBody = {}; // Initialize an empty request body

  switch (idType) {
    case "NIN":
      verificationType = "NIN-VERIFY";  // For National Identity Number
      apiKey = process.env.SEAMFIX_NIN_APIKEY;  // API key for NIN
      requestBody = {
        verificationType: verificationType,
        countryCode: "NG",
        searchParameter: searchParameter
      };
      break;
    case "DL":
      verificationType = "DRIVER-LICENSE-FULL-DETAIL-VERIFICATION";  // For Driver's License
      apiKey = process.env.SEAMFIX_DRIVERSLINCENS_APIKEY;  // API key for Driver's License
      requestBody = {
        dob: dob,
        searchParameter: searchParameter,
        verificationType: verificationType
      };
      break;
    case "VC":
      verificationType = "VIN-FULL-DETAILS-VERIFICATION";  // For Voter's Card
      apiKey = process.env.SEAMFIX_VOTERSCARD_APIKEY;  // API key for Voter's Card
      requestBody = {
        searchParameter: searchParameter,
        countryCode: "NG",
        verificationType: verificationType
      };
      break;
    case "IP":
      verificationType = "PASSPORT-FULL-DETAILS";  // For International Passport
      apiKey = process.env.SEAMFIX_INTERNATIONALPASSPORT_APIKEY;  // API key for International Passport
      requestBody = {
        verificationType: verificationType,
        searchParameter: searchParameter,
        lastName: lastName
      };
      break;
    default:
      return res.status(400).json({ message: 'Invalid ID type provided' });
  }

  try {
    const response = await axios.post('https://api.verified.africa/sfx-verify/v3/id-service/', 
      requestBody, 
      {
        headers: {
          'accept': 'application/json',
          'apiKey': apiKey,
          'content-type': 'application/json',
          'userid': process.env.SEAMFIX_USERID
        }
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error verifying ID:', error);
    res.status(500).json({ message: 'Failed to verify ID', error: error.response ? error.response.data : error.message });
  }
});

module.exports = router;
