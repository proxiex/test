const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Merchant = require('../models/merchant');
const Engineer = require('../models/engineer');
const ServiceCenter = require('../models/serviceCenter');
const TowService = require('../models/towservice');
const DocumentCenter = require('../models/documentCenter');
const Agent = require('../models/agent');
const { sendMessage } = require('../controllers/messagecontroller');



// Endpoint to register a new merchant
router.post('/merchant', async (req, res) => {
    const { companyName, 
            firstName, 
            lastName, 
            phoneNumber, 
            phoneVerified, 
            address, 
            category, 
            make, 
            agentId, 
            gender } = req.body;
  
    try {
      // Validate if all required fields are provided
      if (!companyName || !firstName || !lastName || !phoneNumber || !category || !address || !make|| !gender|| !agentId) {
        return res.status(400).json({ message: 'All fields are required' });
      }
  
      // Generate a unique merchant ID
      const categoryPrefix = 'MERCHANT'.split(' ')
                                        .map(word => word[0])
                                        .toUpperCase()
                                        .slice(0, 3); // Up to 3 characters
  
      const statePostfix = address.state.split(' ')
                                        .map(word => word[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 3); // Up to 3 characters
  
              const randomNumber = crypto.randomInt(100000, 999999).toString(); // 6 characters
  
              // Generate additional random characters to reach 24 characters total
              const additionalChars = crypto.randomBytes(15).toString('hex').slice(0, 12); // 12 characters
  
              // Combine all parts to create a 24-character service center ID
              const merchantId = `${categoryPrefix}${randomNumber}${additionalChars}${statePostfix}`;
  
      // Create a new merchant instance
      const merchant = new Merchant({ 
        _id: merchantId,
        role: 'merchant',
        isVerified: false,
        companyName, 
        firstName, 
        lastName, 
        gender,
        phoneNumber, 
        category,
        make,
        phoneVerified,
        address, 
        status: 'active', 
      });
  
      // Save the new merchant
      await merchant.save();
      
      const agent = await Agent.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      
      agent.targets[agent.targets.length - 1].registrations++;
      
      agent.merchants.push(merchant._id);
        await agent.save();
      
      await sendMessage(`234${phoneNumber}`, `Welcome ${firstName} to My Oga Mechanic Platform. Download the Vendor app and login to continue. You can reach us on Call or WhatsApp via 07011962523 or visit www.myogamechanic.com`);
     
      res.status(200).json({ success: true, message: 'Merchant registered successfully', merchant });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Engineer Registration Endpoint
  router.post('/engineer', async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        phoneNumber,
        phoneVerified,
        address,
        category,
        make,
        availability,
        gender,
        agentId
      } = req.body;
  
      // Validate if all required fields are provided
      const requiredFields = [ 'firstName', 'lastName', 'phoneNumber', 'category', 'address', 'make', 'gender', 'agentId', 'availability' ];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({ message: 'Missing fields: ' + missingFields.join(', ') });
      }

      // Check if the phone number already exists
      const existingEngineer = await Engineer.findOne({ phoneNumber });
      if (existingEngineer) {
        return res.status(409).json({ message: 'Phone number already registered.' });
      }
  
      // Generate a unique engineer ID
      const categoryPrefix = category.map(categoryItem => categoryItem[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 3); // Up to 3 characters
  
      const statePostfix = address.state.split(' ')
                                      .map(word => word[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 3); // Up to 3 characters
  
      const randomNumber = crypto.randomInt(100000, 999999).toString(); // 6 characters
  
      // Generate additional random characters to reach 24 characters total
      const additionalChars = crypto.randomBytes(15).toString('hex').slice(0, 12); // 12 characters
  
      // Combine all parts to create a 24-character service center ID
      const engineerId = `${categoryPrefix}${randomNumber}${additionalChars}${statePostfix}`;
  
      // Create a new engineer
      const newEngineer = new Engineer({
        _id: engineerId,
        role: 'engineer',
        firstName,
        lastName,
        gender,
        phoneNumber,
        phoneVerified,
        address,
        category,
        make,
        availability,
        status: 'active',
      });
      await newEngineer.save();
      const agent = await Agent.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }
      // Update the most recent target's registrations count
      agent.targets[agent.targets.length - 1].registrations++;
      // Add the new engineer to the agent's engineers array
      agent.engineers.push(newEngineer._id);
      await agent.save();
      await sendMessage(`234${phoneNumber}`, `Welcome ${firstName} to My Oga Mechanic Platform. Download the Vendor app and login to continue. You can reach us on Call or WhatsApp via 07011962523 or visit www.myogamechanic.com`);
  
      res.status(200).json({
        success: true,
        message: 'Engineer registered successfully.',
        engineerId: newEngineer._id,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed.', details: error.message });
    }
  });
  
  // Service Center Registration Endpoint
  router.post('/servicecenter', async (req, res) => {
    try {
      const {
        companyName,
        firstName,
        lastName,
        phoneNumber,
        phoneVerified,
        address,
        category,
        make,
        gender,
        agentId
      } = req.body;
  
      // Validate if all required fields are provided
      const requiredFields = [ 'companyName', 'firstName', 'lastName', 'phoneNumber', 'category', 'address', 'make', 'gender', 'agentId' ];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({ message: 'Missing fields: ' + missingFields.join(', ') });
      }


      // Check if the phone number already exists
      const existingServiceCenter = await ServiceCenter.findOne({ phoneNumber });
      if (existingServiceCenter) {
        return res.status(409).json({ message: 'Phone number already registered.' });
      }
  
      // Generate a unique service center ID
      // Generate a unique service center ID
      const categoryPrefix = 'SERVICECENTER'.split(' ')
                                        .map(word => word[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 3); // Up to 3 characters
      
       const statePostfix = address.state.split(' ')
                                          .map(word => word[0])
                                          .join('')
                                          .toUpperCase()
                                          .slice(0, 3); // Up to 3 characters
  
      const randomNumber = crypto.randomInt(100000, 999999).toString(); // 6 characters
  
      // Generate additional random characters to reach 24 characters total
      const additionalChars = crypto.randomBytes(15).toString('hex').slice(0, 12); // 12 characters
  
      // Combine all parts to create a 24-character service center ID
      const serviceCenterId = `${categoryPrefix}${randomNumber}${additionalChars}${statePostfix}`;
  
      // Hash the PIN
     
  
      // Create a new engineer
      const newServiceCenter = new ServiceCenter({
        _id: serviceCenterId,
        role: 'servicecenter',
        companyName,
        firstName,
        lastName,
        gender,
        phoneNumber,
        phoneVerified,
        address,
        category,
        make,
        status: 'active',
        
      });
  
      await newServiceCenter.save();
      
      const agent = await Agent.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }

      agent.targets[agent.targets.length - 1].registrations++;
        agent.servicecenters.push(newServiceCenter._id);
        await agent.save();
      
      
     await sendMessage(`234${phoneNumber}`, `Welcome ${firstName} to My Oga Mechanic Platform. Dwonload the Vendor app and login to continue. You cam reach us on Call or whatsapp via 07011962523 or visit www.myogamechanic.com`);
  
      res.status(200).json({
        success: true,
        message: 'Service Center registered successfully.',
        serviceCenterId: newServiceCenter._id,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed.', details: error.message });
    }
  });
  
  // Service Center Registration Endpoint
  router.post('/towservice', async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        gender,
        phoneNumber,
        phoneVerified,
        address,
        companyName,
        vehicles,
        agentId
      } = req.body;
  
      // Validate if all required fields are provided
      const requiredFields = [ 'firstName', 'lastName', 'phoneNumber', 'gender', 'companyName', 'address', 'vehicles', 'agentId' ];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({ message: 'Missing fields: ' + missingFields.join(', ') });
      }
      // Check if the phone number already exists
      const existingServiceCenter = await TowService.findOne({ phoneNumber });
      if (existingServiceCenter) {
        return res.status(409).json({ message: 'Phone number already registered.' });
      }
  
      // Generate a unique service center ID
      const servicePrefix = 'TOWSERVICE'.split(' ')
                                      .map(word => word[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 3); // Up to 3 characters
  
      const statePostfix = address.state.split(' ')
                                      .map(word => word[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 3); // Up to 3 characters
  
      const randomNumber = crypto.randomInt(100000, 999999).toString(); // 6 characters
  
      // Generate additional random characters to reach 24 characters total
      const additionalChars = crypto.randomBytes(15).toString('hex').slice(0, 12); // 12 characters
  
      // Combine all parts to create a 24-character service center ID
      const towServiceId = `${servicePrefix}${randomNumber}${additionalChars}${statePostfix}`;
  
      // Create a new tow service
      const newTowService = new TowService({
        _id: towServiceId,
        role: 'towservice',
        firstName,
        lastName,
        gender,
        phoneNumber,
        phoneVerified,
        companyName,
        address,
        vehicles,
        status: 'active',
      });
  
      await newTowService.save();
     
      const agent = await Agent.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }

    
      agent.targets[agent.targets.length - 1].registrations++;
      agent.towservices.push(newTowService._id);
      await agent.save();
      
      sendMessage(`234${phoneNumber}`, `Welcome ${firstName} to My Oga Mechanic Platform. Download the Vendor app and login to continue. You can reach us on Call or WhatsApp via 07011962523 or visit www.myogamechanic.com`);
  
      res.status(200).json({
        success: true,
        message: 'Tow Service registered successfully.',
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed.', details: error.message });
    }
  });
  
  // Service Center Registration Endpoint
  router.post('/documentcenter', async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        gender,
        phoneNumber,
        phoneVerified,
        address,
        companyName,
        services,
        agentId
      } = req.body;
  
      // Validate if all required fields are provided
      const requiredFields = [ 'firstName', 'lastName', 'phoneNumber', 'gender', 'companyName', 'address', 'services', 'agentId' ];
      const missingFields = requiredFields.filter(field => !req.body[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({ message: 'Missing fields: ' + missingFields.join(', ') });
      }
      // Check if the phone number already exists
      const existingServiceCenter = await DocumentCenter.findOne({ phoneNumber });
      if (existingServiceCenter) {
        return res.status(409).json({ message: 'Phone number already registered.' });
      }
  
      // Generate a unique service center ID
      const servicePrefix = 'DOCUMENTCENTER'.split(' ')
                                      .map(word => word[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 3); // Up to 3 characters
  
      const statePostfix = address.state.split(' ')
                                      .map(word => word[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 3); // Up to 3 characters
  
      const randomNumber = crypto.randomInt(100000, 999999).toString(); // 6 characters
  
      // Generate additional random characters to reach 24 characters total
      const additionalChars = crypto.randomBytes(15).toString('hex').slice(0, 12); // 12 characters
      
      // Combine all parts to create a 24-character service center ID
      const documentCenterId = `${servicePrefix}${randomNumber}${additionalChars}${statePostfix}`;
  
      // Create a new tow service
      const newDocumentCenter = new DocumentCenter({
        _id: documentCenterId,
        role: 'documentcenter',
        firstName,
        lastName,
        gender,
        phoneNumber,
        phoneVerified,
        companyName,
        address,
        services,
        status: 'active',
      });
  
      await newDocumentCenter.save();
     
      const agent = await Agent.findById(agentId);
      if (!agent) {
        return res.status(404).json({ message: 'Agent not found' });
      }

      agent.targets[agent.targets.length - 1].registrations++;
      
      agent.documentcenters.push(newDocumentCenter._id);
      await agent.save();
      
      sendMessage(`234${phoneNumber}`, `Welcome ${firstName} to My Oga Mechanic Platform. Download the Vendor app and login to continue. You can reach us on Call or WhatsApp via 07011962523 or visit www.myogamechanic.com`);
  
      res.status(200).json({
        success: true,
        message: 'Document Center registered successfully.',
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed.', details: error.message });
    }
  });
  
  module.exports = router;