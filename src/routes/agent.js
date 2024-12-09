const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); 
const passport = require('passport');
const Agent = require('../models/agent');
const Engineer = require('../models/engineer');
const Order = require('../models/order');
const Merchant = require('../models/merchant');
const ServiceCenter = require('../models/serviceCenter');
const DocumentCenter = require('../models/documentCenter');
const TowService = require('../models/towservice');
const Approval = require('../models/approval');

// // Import and configure dotenv
require('dotenv').config();

  const termiiAPIKey = process.env.TERMINAPIKey; 

//add approval endpoint
  router.post('/approval/:agentId', async (req, res) => {
    try {
      const { phoneNumber, role, access} = req.body;

      const agent = await Agent.findById(req.params.agentId);

      if(!agent){
        return res.status(404).json({ message: 'Agent not found' });
      }else if(agent.access !== 10){
        return res.status(400).json({ message: 'Unauthorized Access' });
      }

      const newAgent = await Agent.findOne({ phoneNumber });
      if(newAgent){
        return res.status(400).json({ message: 'Agent already exists' });
      }

      const approvalCode = await bcrypt.hash(Math.random().toString(36).substring(2, 15), 10);

      //check if approve code exists, then generate a new one
      const existingApproval = await Approval.findOne({ approvalCode });
      if(existingApproval){
        return res.status(400).json({ message: 'Approval code already exists' });
      }

      const newApproval = new Approval({ initiatorId: agent._id, phoneNumber, role, approvalCode, access });
      await newApproval.save();

      res.status(200).json({ message: 'Approval request submitted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Service Temporarily Unavailable', error: error });
    }
  });


//add target and route endpoint
  router.post('/addtarget/:agentId', async (req, res) => {
    try {
      const { target } = req.body;
      const agent = await Agent.findById(req.params.agentId);
  
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }


      if(agent.targets.some(t => t.month.toLowerCase() === target.month.toLowerCase() )){
        return res.status(400).json({ message: 'Target already exists' });
      } 
     
      // Update the agent's targets and routes
      agent.targets.push(target);
      await agent.save();
  
      res.status(200).json({ message: 'Monthly target and route added successfully' });
    } catch (error) {
      console.error('Error adding monthly target and route:', error);
      res.status(500).json({ message: 'Failed to add monthly target and route', error });
    }
  });


  router.get('/:agentId', async (req, res) => {
    try {
      const agent = await Agent.findById(req.params.agentId);
  
      if (!agent) {
        return res.status(404).send('Agent not found');
      }
      if(agent.access === 3){
        const merchants = await Merchant.find({ _id: { $in: agent.merchants } });
        const engineers = await Engineer.find({ _id: { $in: agent.engineers } });
        const servicecenters = await ServiceCenter.find({ _id: { $in: agent.servicecenters } });
        const documentcenters = await DocumentCenter.find({ _id: { $in: agent.documentcenters } });
        const towservices = await TowService.find({ _id: { $in: agent.towservices } });
        

        res.status(200).send({
          _id: agent._id,
          firstName: agent.firstName,
          lastName: agent.lastName,
          targets: agent.targets,
          merchants: merchants, 
          engineers: engineers, 
          servicecenters: servicecenters, 
          documentcenters: documentcenters, 
          towservices: towservices
        });


      }
      const agentProfile = agent;
      res.status(200).send(agentProfile);
    } catch (error) {
      res.status(500).send(error);
    }
  });




// Update PIN endpoint
router.post('/changepin', async (req, res) => {
  try {
    const { currentPin, newPin, agentId } = req.body;

    // Find the user
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check if the current PIN matches
    const isMatch = await bcrypt.compare(currentPin, agent.pin);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect PIN provided' });
    }

    // Hash the new PIN
    const saltRounds = 10;
    const hashedNewPin = await bcrypt.hash(newPin, saltRounds);

    // Update the PIN only if it has changed
    if (agent.pin !== hashedNewPin) {
      agent.pin = hashedNewPin;
      await agent.save();
      return res.status(200).json({ message: 'PIN updated successfully' });
    } else {
      return res.status(400).json({ error: 'New PIN must be different from the current PIN' });
    }
  } catch (error) {
    console.error('Error updating PIN:', error);
    res.status(500).json({ error: 'An error occurred while updating the PIN' });
  }
});




// Engineer Registration Endpoint
router.post('/mregister', async (req, res) => {
  try {
    console.log('Received engineer registration request:', req.body);

    const {
      agentId,
      engineerId,
      firstName,
      lastName,
      address,
      lga,
      phoneNumber,
      phoneVerified,
      engineerImage,
      longitude,
      latitude,
      category,
      make,
      availability,
      state,
    } = req.body;

    // Create a new engineer instance
    const newEngineer = new Engineer({
      _id: engineerId,
      firstName,
      lastName,
      address,
      lga,
      phoneNumber,
      phoneVerified,
      engineerImage,
      longitude: parseFloat(longitude), // Parse string to number
      latitude: parseFloat(latitude), // Parse string to number
      category,
      make,
      availability,
      state,
    });

    // Save the engineer to the 'engineers' collection
    await newEngineer.save();


    await Agent.findByIdAndUpdate(agentId, { $push: { myEngineers: engineerId } });  

    res.status(200).json({ message: 'Engineer registered successfully.' });
  } catch (error) {
    console.error('Engineer registration error:', error);

    if (error.name === 'MongoError' && error.code === 11000) {
      // Handle duplicate key error (duplicate _id)
      res.status(400).json({ error: 'Engineer ID already exists.' });
    } else {
      // Handle other errors
      res.status(500).json({ error: 'Engineer registration failed.' });
    }
  }
});



// Engineer Registration Endpoint
router.post('/mupdate', async (req, res) => {
  try {
    console.log('Received engineer registration request:', req.body);

    const {
      agentId,
      engineerId,
      firstName,
      lastName,
      address,
      phoneNumber,
      phoneVerified,
      engineerImage,
      category,
      make,
      availability,
    } = req.body;

    // Check if the engineer with the given ID exists
    const existingEngineer = await Engineer.findById(engineerId);

    if (existingEngineer) {
      // If the engineer exists, update the data
      await Engineer.findByIdAndUpdate(engineerId, {
        firstName,
        lastName,
        address,
        phoneNumber,
        phoneVerified,
        engineerImage,
        category,
        make,
        availability,
      });

      res.status(200).json({ message: 'Engineer updated successfully.' });
    } else {
      // If the engineer does not exist, return an error message
      res.status(404).json({ error: 'Engineer does not exist.' });
    }

    // Update the agent's myEngineers array
    await Agent.findByIdAndUpdate(agentId, { $push: { myEngineers: engineerId } });
  } catch (error) {
    console.error('Engineer registration error:', error);

    if (error.name === 'MongoError' && error.code === 11000) {
      // Handle duplicate key error (duplicate _id)
      res.status(400).json({ error: 'Engineer ID already exists.' });
    } else {
      // Handle other errors
      res.status(500).json({ error: 'Engineer registration failed.' });
    }
  }
});





router.get('/getdeliveryagents', async (req, res) => {
  try {
    // Retrieve all delivery agents from the database
    const deliveryAgents = await DeliveryAgent.find();

    console.log(deliveryAgents);

    // Create an array to store modified delivery agent objects
    const modifiedDeliveryAgents = [];

    // Loop through each delivery agent
    for (const deliveryAgent of deliveryAgents) {
      const deliveryReviews = [];
      let totalCommunicationRating = 0;
      let totalTimelyDelivery = 0;
      let numberOfReviews = 0;

      // Loop through each orderId in the delivery agent's orders array
      for (const orderId of deliveryAgent.orders) {
        // Find the order by orderId
        const order = await Order.findById(orderId);

        // If the order has delivery reviews, add them to the deliveryReviews array
        if (order && order.deliveryReview && order.deliveryReview.length > 0) {
          deliveryReviews.push(...order.deliveryReview);
          for (const review of order.deliveryReview) {
            totalCommunicationRating += review.communicationRating || 0;
            totalTimelyDelivery += review.timelydelivery || 0;
            numberOfReviews++;
          }
        }
      }

      // Calculate the mean values for communicationRating and timelyDelivery
      const meanCommunicationRating = numberOfReviews > 0 ? totalCommunicationRating / numberOfReviews : 0;
      const meanTimelyDelivery = numberOfReviews > 0 ? totalTimelyDelivery / numberOfReviews : 0;

      // Create a modified delivery agent object including delivery reviews and mean ratings
      const modifiedAgent = {
        agentId: deliveryAgent._id,
        firstName: deliveryAgent.firstName,
        lastName: deliveryAgent.lastName,
        email: deliveryAgent.email,
        phoneNumber: deliveryAgent.phoneNumber,
        address: deliveryAgent.address,
        status: deliveryAgent.status,
        createdAt: deliveryAgent.createdAt,
        image: deliveryAgent.image,
        availableBalance: deliveryAgent.availableBalance,
        pendingBalance: deliveryAgent.pendingBalance,
        deliveryReviews,
        meanCommunicationRating,
        meanTimelyDelivery,
      };

      // Add the modified agent to the array
      modifiedDeliveryAgents.push(modifiedAgent);
    }

    // Send the modified delivery agents array as a response
    res.status(200).json(modifiedDeliveryAgents);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'An error occurred while fetching delivery agents',
      details: error.message,
    });
  }
});


router.get('/getda', async (req, res) => {
  try {
    console.log('Fetching delivery agents...');
    const deliveryAgents = await Agent.find();
    console.log('Retrieved delivery agents:', deliveryAgents);
    res.status(200).json(deliveryAgents);
  } catch (error) {
    console.error('Error fetching delivery agents:', error);
    res.status(500).json({
      error: 'An error occurred while fetching delivery agents',
      details: error.message,
    });
  }
});



module.exports = router;