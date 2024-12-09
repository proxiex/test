const express = require('express');
const router = express.Router();
const RepairTicket = require('../models/repair');
const Transaction = require('../models/transaction');
const Booking = require('../models/booking');
const Device = require('../models/device');
const User = require('../models/user'); 
const Engineer = require('../models/engineer'); 
const CarLogo  = require('../models/carlogo');

const axios = require('axios');

const crypto = require("crypto");

// Import and configure dotenv
require('dotenv').config();

// const secretGenKey =  process.env.JWT_SECRET 
const jwt = require('jsonwebtoken'); 
const CustomRequest = require('../models/customrequest');





// Function to generate Token
const generateToken = (userId, repairRef, plateNumber, type, secretKey) => {
  const payload = { userId, repairRef, plateNumber, type };
  const options = { expiresIn: '30d' }; // Set expiration time as needed

  return jwt.sign(payload, secretKey, options);
};







// Route to check if a repair ticket exists by ID
router.get('/checkid/:repairTicketId', async (req, res) => {
  const repairTicketId = req.params.repairTicketId;

  try {
    // Find a repair ticket with the given ID
    const repairTicket = await RepairTicket.findById(repairTicketId);

    if (repairTicket) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking repairTicket ID:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});





// Create a new repair ticket and update user and engineer profiles
router.post('/addticket', async (req, res) => {
  const deviceId = req.header('deviceid');

  try {
    const {
      bookingId,
      transactionReference,
      repairRef,
      hierarchy,
      relatedTickets,
      user,
      engineer,
      vehicle,
      category,
      isCompleted,
      isDisputed,
      isDisputedClosed,
      repairDescription,
      serviceType,
      repairItems,
      repairType,
      // completedDate,
      lga,
      state,
      labourCost,
    
      partsCost,
      totalCost,
    } = req.body;

    

    // Check if a repair ticket with the given 'repairRef' exists
    const existingTicket = await RepairTicket.findOne({ repairRef });

    if (existingTicket) {
      // A ticket with the same 'repairRef' exists, return "yes"
      return res
        .status(200)
        .json({ message: 'Repair ticket already exists', ticketId: existingTicket.repairRef });
    }

    // Create a new repair ticket with custom _id and repairTicketId
    const documentId = crypto.randomBytes(16).toString("hex");

// Generate LTToken
// Generate LTToken using the new generateToken function
const LTToken = generateToken(user.id, repairRef, vehicle.plateNumber, 'LT', process.env.LT_SECRET);

// Generate PTToken using the new generateToken function (assuming you have the necessary data for PTToken)
const PTToken = generateToken(user.id, repairRef, vehicle.plateNumber, 'PT', process.env.PT_SECRET);

 // Extract 10% from labourCost as commission
 const commission = 0.1 * labourCost;
 // Calculate the labourCost after deducting commission
 const labourCostAfterCommission = 0.9 * labourCost;

    // Create a new repair ticket
    const repairTicket = new RepairTicket({
       _id: documentId,
       deviceId,
      transactionReference,
      bookingId,
      repairRef,
      hierarchy,
      relatedTickets,
      user,
      engineer,
      vehicle,
      LTToken,
      PTToken,
      category,
      isCompleted,
      isDisputed,
      isDisputedClosed,
      repairDescription,
      serviceType,
      repairItems,
      repairType,
      labourTransferStatus: 'Pending',
      partsTransferStatus: 'Pending',

      // completedDate,
      lga,
      state,
      labourCost: labourCostAfterCommission,
      commission,
      partsCost,
      totalCost,
    });


          // Check if relatedTickets is not empty before adding it to the repairTicket
      if (relatedTickets && relatedTickets.length > 0) {
        repairTicket.relatedTickets = relatedTickets;
      }

    await repairTicket.save();


    if (hierarchy === 'Child') {
      // Iterate through relatedTickets and update parent tickets
      const parentTickets = await RepairTicket.find({ repairRef: { $in: relatedTickets } });

      for (const parentTicket of parentTickets) {
        // Add the newly created child ticket's repairRef to the parent ticket's relatedTickets array
        await RepairTicket.findByIdAndUpdate(parentTicket._id, {
          $addToSet: { relatedTickets: req.body.repairRef },
        });
      }
    }

    await User.findByIdAndUpdate(userId, { $push: { repairRefs: repairRef } });


    // Update the engineer's profile with the repairTicketId
    await Engineer.findByIdAndUpdate(engineerId, {
      $push: { repairRefs: repairRef },
      // $inc: { pendingBalance: afterCommission },
    });

 

    res.status(200).json({ message: 'Repair ticket added successfully', repairRef });
  } catch (error) {
    console.error('Error adding repair ticket:', error.message);
    res.status(500).json({ error: `An error occurred while adding the repair ticket: ${error.message}` });
  }
});






// add review
router.post('/addreview', async (req, res) => {

  console.log('Review endpoint pingged')
    
    
  try {
    const { repairRef, communicationRating, knowledgeOfProblem, review, reviewAddedByFirstName, reviewAddedByLastName,  } = req.body;

    // Find the repair ticket by repairRef and update the specified fields
    const updatedRepairTicket = await RepairTicket.findOneAndUpdate(
      { repairRef: repairRef },
      {
        $set: {
          communicationRating: communicationRating,
          knowledgeOfProblem: knowledgeOfProblem,
          reviewAddedAt: Date.now(),
          reviewAddedByFirstName: reviewAddedByFirstName,
          reviewAddedByLastName: reviewAddedByLastName,
          review:review,
          isReviewAdded: true,
        },
      },
      { new: true }
    );

    if (!updatedRepairTicket) {
      return res.status(404).send('Repair ticket not found');
    }

    res.status(200).send(updatedRepairTicket);
  } catch (error) {
    res.status(500).send(error);
  }
});





//get ticket for user

router.get('/getticket/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the 'repairRefs' array from the user's profile
    const repairRefs = user.repairRefs || [];

    // Fetch the actual repair tickets based on the 'repairRef' values
    const repairTickets = await RepairTicket.find({ repairRef: { $in: repairRefs } })
      .sort({ startDate: -1 }); // Sort by createdAt in descending order

    if (!repairTickets || repairTickets.length === 0) {
      return res.status(404).json({ message: 'No matching repair tickets found' });
    }

    // Fetch car logos for each repair ticket
    const repairTicketsWithLogos = await Promise.all(
      repairTickets.map(async (repairTicket) => {
        try {
          // Fetch car logo using the "make" from repair ticket

          const matchingCarLogos = await CarLogo.find({
            brand: { $regex: repairTicket.make, $options: 'i' },
          });

          // Check if matchingCarLogos is empty
          if (matchingCarLogos.length === 0) {
            // Use the default logo URL if no matching logo is found
            const defaultLogoUrl = 'https://res.cloudinary.com/dmrazjf6c/image/upload/v1701992055/mom/logoBig.png';
            return res.status(200).json([{ brand: 'Default', url: defaultLogoUrl }]);
          }

          // Get logo URL
          const logoUrl = matchingCarLogos[0]?.url;

          
          
          // Add the logo URL to the repair ticket data
          const repairDataWithLogo = {
            repairRef: repairTicket.repairRef,
            hierarchy: repairTicket.hierarchy,
            // relatedTickets: repairTicket.relatedTickets,
            userId: repairTicket.userId,
            engineer: repairTicket.engineer,
            vehicle: repairTicket.vehicle,
            category: repairTicket.category,
            isCompleted: repairTicket.isCompleted,
            isDisputed: repairTicket.isDisputed,
            isDisputeClosed: repairTicket.isDisputeClosed,
            isReviewAdded: repairTicket.isReviewAdded,
            repairDescription: repairTicket.repairDescription,
            repairItems: repairTicket.repairItems,
            serviceType: repairTicket.serviceType,
            startDate: repairTicket.startDate,
            completedDate: repairTicket.completedDate,
            lga: repairTicket.lga,
            state: repairTicket.state,
            labourTransferStatus: repairTicket.labourTransferStatus,
            labourCost: repairTicket.labourCost,
            partsTransferStatus: repairTicket.partsTransferStatus,
            partsCost: repairTicket.partsCost,
            totalCost: repairTicket.totalCost,
            disputeId: repairTicket.disputeId,
            availability: repairTicket.availability,
            communicationRating: repairTicket.communicationRating,
            knowledgeOfProblem: repairTicket.knowledgeOfProblem,
            review: repairTicket.review,
          };

          return repairDataWithLogo;
        } catch (logoError) {
          // Handle errors specific to fetching car logos
          console.error('Error fetching car logo:', logoError);
          throw new Error('An error occurred while fetching car logos');
        }
      })
    );

    res.status(200).json({ success: true, message: 'Repair tickets fetched successfully', repairTickets: repairTicketsWithLogos });
  } catch (error) {
    // Handle generic errors
    console.error('Error fetching repair tickets:', error);
    res.status(500).json({ success: false, error: 'An error occurred while fetching repair tickets', message: error.message });
  }
});


// Updating repair ticket completion status
router.post('/completed/:repairRef', async (req, res) => {
  try {
    const { repairRef } = req.params;

    // Retrieve repairTicket based on repairRef
    const repairTicket = await RepairTicket.findOne({ repairRef });

    if (!repairTicket) {
      return res.status(404).json({ error: 'Repair ticket not found.' });
    }

    const { bookingId } = repairTicket;

    await RepairTicket.findOneAndUpdate(
      { repairRef },
      { $set: { isCompleted: true } },
      { new: true }
    );

    // Update booking status to 'Closed'
    await Booking.findByIdAndUpdate(bookingId, { status: 'Closed' });

    // Return a meaningful success response
    res.status(200).json({ message: 'Repair ticket completed successfully', engineerFirstName: repairTicket.engineer.firstName, repairRef: repairRef });
  } catch (error) {
    console.error('Error completing repair ticket:', error.stack || error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

    


    

// Updating repair ticket completion status
router.post('/disputed/', async (req, res) => {
  try {
    const { repairRef } = req.body; // Corrected

    // Find the repair ticket by repairRef and update the isCompleted value
    const updatedRepairTicket = await RepairTicket.findOneAndUpdate(
      { repairRef: repairRef }, // Use repairRef to find the document
      { $set: { isDisputed: true } }, // Update the isCompleted field
      { new: true } // Return the updated document
    );

    if (!updatedRepairTicket) {
      return res.status(404).send('Repair ticket not found');
    }

       // Update the status field of the booking to closed
       const {bookingId } = updatedRepairTicket;
       await Booking.findByIdAndUpdate(bookingId, { status: 'closed' });

       
    res.status(200).send(updatedRepairTicket);
  } catch (error) {
    res.status(500).send(error);
  }
});


// Updating repair ticket dispute status
router.post('/disputeclosed/', async (req, res) => {
  try {
    const { repairRef } = req.body; // Corrected

    // Find the repair ticket by repairRef and update the isCompleted value
    const updatedRepairTicket = await RepairTicket.findOneAndUpdate(
      { repairRef: repairRef }, // Use repairRef to find the document
      { $set: { isDisputeClosed: true } }, // Update the isCompleted field
      { new: true } // Return the updated document
    );

    if (!updatedRepairTicket) {
      return res.status(404).send('Repair ticket not found');
    }

    res.status(200).send(updatedRepairTicket);
  } catch (error) {
    res.status(500).send(error);
  }
});



// Custom request endpoint
router.post('/customrequest', async (req, res) => {
  const deviceId = req.header('deviceid');

  try {
    const {
      userId,
      serviceType,
      make,
      model,
      plateNumber,
      repairCategory,
      repairDescription
    } = req.body;

    // Generate a unique repairRef
    const customRef = `CR_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // Create a new repair ticket for the custom request
    const customRequest = new CustomRequest({
      deviceId,
      serviceType,
      customRef,
      userId,
      make,
      model,
      plateNumber,
      repairCategory,
      repairDescription,
      status: 'Pending'
    });

    await customRequest.save();

    // Update the user's profile with the new repairRef
    await User.findByIdAndUpdate(userId, { $push: { customRefs: customRef } });

    res.status(200).json({ 
      message: 'Custom request submitted successfully', 
      customRef,
    });

  } catch (error) {
    console.error('Error submitting custom request:', error.message);
    res.status(500).json({ error: `An error occurred while submitting the custom request: ${error.message}` });
  }
});



module.exports = router;