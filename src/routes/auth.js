const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const bodyParser = require('body-parser');
const axios = require('axios');
const request = require('request');
const jwt = require('jsonwebtoken'); 
const User  = require('../models/user');
const Device  = require('../models/device');
const Agent  = require('../models/agent');
const Engineer  = require('../models/engineer');
const ServiceCenter = require('../models/serviceCenter');
const DocumentCenter = require('../models/documentCenter');
const TowService = require('../models/towservice');
const Merchant = require('../models/merchant');
const DeliveryOption = require('../models/deliveryoption');
const OTP = require('../models/otp');
const crypto = require('crypto');

const { sendMessage, sendOtpSendChamp, sendWhatsappOtp } = require('../controllers/messagecontroller');
const Location = require('../models/location');
const AppVersion = require('../models/appVersion');
const Affiliate = require('../models/affiliate');
const { v4: uuidv4 } = require('uuid');
const Approval = require('../models/approval');
router.use(bodyParser.json());
require('dotenv').config();
const termiiAPIKey = process.env.TERMINAPIKey;

const airtelNumbers = ["701", "708", "802", "808", "812", "901", "902", "904", "907", "911", "912"];
const mtnNumbers = ["702", "703", "704", "706", "707", "803", "806", "810", "813", "814", "816", "903", "906", "913", "916"];
const gloNumbers = ["705", "805", "807", "811", "815", "905", "915"];
const nineMobileNumbers = ["809", "817", "818", "908", "909"];

 // Function to validate the phone number format
 function validatePhoneNumber(phoneNumber) {
  const phoneRegex = new RegExp(`^(${airtelNumbers.join('|')}|${mtnNumbers.join('|')}|${gloNumbers.join('|')}|${nineMobileNumbers.join('|')})\\d{7}$`);
   return phoneRegex.test(phoneNumber);
 }




// New endpoint to send SMS
router.post('/sendmessage', (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).send({ error: 'Missing required fields: to or message' });
  }

  if (!validatePhoneNumber(phoneNumber)) {
    return res.status(400).json({
      code: 'INVALID_PHONE_NUMBER',
      message: 'Invalid phone number format'
    });
  }
 

  sendMessage(to, message, (error, result) => {
    if (error) {
      // Handle the case where `error.status` might not be a number
      const errorStatus = typeof error.status === 500 ? 500: error.status;
      return res.status(errorStatus).send({ error: error.error, details: error.details });
    }

    // Use the 'code' field from result as HTTP status code
    const resultStatus = typeof result.code === 200 ?  200: result.code;
    return res.status(resultStatus).send(result);
  });
});


router.post('/resendotp/:phonenumber', async (req, res) => {
  try {
    const { phonenumber } = req.params;

    if (!phonenumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!validatePhoneNumber(phonenumber)) {
      return res.status(400).json({
        code: 'INVALID_PHONE_NUMBER',
        message: 'Invalid phone number format'
      });
    }
   
    const otpResponse = await sendOtpSendChamp(phonenumber);

    if (otpResponse.status === 200) {
      sendWhatsappOtp(phonenumber, otpResponse.otp);
      res.status(200).json({
        message: otpResponse.message,
        otp: otpResponse.otp
      });
    } else {
      res.status(otpResponse.status).json({
        error: otpResponse.error,
        details: otpResponse.details
      });
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verifyotp', async (req, res) => {
  const { phonenumber, otp, role } = req.body;
  const formattedNumber = `234${phonenumber}`;

  if (!validatePhoneNumber(phonenumber)) {
    return res.status(400).json({
      code: 'INVALID_PHONE_NUMBER',
      message: 'Invalid phone number format'
    });
  }

  if (!role) {
    return res.status(400).json({
      code: 'MISSING_ROLE',
      message: 'Missing role'
    });
  }

  

  const correctRole = role === 'vendor' || role === 'merchant' || role === 'engineer' || role === 'servicecenter' || role === 'documentcenter' || role === 'towservice' ? 'vendor' : role;

  try {
    // Find the OTP entry
    const otpEntry = await OTP.findOne({ phoneNumber: formattedNumber, role: correctRole });

    if (otpEntry && otpEntry.otp === otp) {
      // OTP is correct
      return res.status(200).json({ message: 'Success' });
    }  else if(otpEntry && otpEntry.otp !== otp){
      // OTP is incorrect
      return res.status(201).json({ message: 'Incorrect OTP' });
    } else if(otpEntry && otpEntry.generatedAt && new Date() - otpEntry.generatedAt > 1000 * 60 * 15) {
      return res.status(202).json({ message: 'OTP expired' });
    }
    
    else if(!otpEntry) {
      return res.status(401).json({ message: 'New User' });
    }else{
      return res.status(402).json({ message: 'Something went wrong, try again' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});









///CheckNumber
router.post('/checkvendornumbernootp', async (req, res) => {
  try {
    const { phoneNumber, role } = req.body;

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        status: 'INVALID_PHONE_NUMBER',
        code: 400,
        message: 'Invalid phone number format'
      });
    }
   

    // Choose the correct model based on userType
    let UserModel;
    switch (role) {
      case 'vendor':
        UserModel = [Merchant, Engineer, TowService, ServiceCenter, DocumentCenter];
      case 'merchant':
        UserModel = Merchant;
        break;
      case 'engineer':
        UserModel = Engineer;
        break;
      case 'servicecenter':
        UserModel = ServiceCenter;
        break;
      case 'towservice':
        UserModel = TowService;
        break;
      case 'documentcenter':
        UserModel = DocumentCenter;
        break;
      
      default:
        return res.status(400).json({
          status: 'INVALID_USER_TYPE',
          code: 400,
          message: 'Invalid user type provided'
        });
    }

    const user = await UserModel.findOne({ phoneNumber });
    
    if(user){
      if (user.status === 'deactivated') {
        return res.status(470).json({
          status: 'VENDOR_DEACTIVATED',
          code: 470,
          message: `This ${role} account has been deactivated.`
        });
      }
      return res.status(200).json({
        status: 'VENDOR_EXISTS',
        code: 200,
        message: `${user.role} already registered`,
        firstName: user.firstName
      });
    }else{
      return res.status(203).json({
        status: 'NEW_USER',
        code: 203,
        message: `New ${role} registration`,
      });
    }

  } catch (error) {
    res.status(500).json({
      status: 'CHECK_NUMBER_ERROR',
      code: 500,
      error: 'An error occurred while checking the phone number.',
      details: error.message 
    });
  }
    
});





///CheckNumber
router.post('/checkvendornumberwithotp', async (req, res) => {
  try {
    const { phoneNumber, role } = req.body;

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        status: 'INVALID_PHONE_NUMBER',
        code: 400,
        message: `Invalid phone number format ${phoneNumber}`
      });
    }
   

    // Choose the correct model based on userType
    let UserModel;
    switch (role) {
      case 'vendor':
        UserModel = [Merchant, Engineer, TowService, ServiceCenter, DocumentCenter];
      case 'merchant':
        UserModel = Merchant;
        break;
      case 'engineer':
        UserModel = Engineer;
        break;
      case 'servicecenter':
        UserModel = ServiceCenter;
        break;
      case 'towservice':
        UserModel = TowService;
        break;
      case 'documentcenter':
        UserModel = DocumentCenter;
        break;
      default:
        return res.status(400).json({
          status: 'INVALID_USER_TYPE',
          code: 400,
          message: 'Invalid user type provided'
        });
    }

    const user = await UserModel.findOne({ phoneNumber });
    const formattedPhoneNumber = `234${phoneNumber}`;
    const sendOtp = sendOtpSendChamp;
    
    if (user) {
      if (user.status === 'deactivated') {
        return res.status(470).json({
          status: 'VENDOR_DEACTIVATED',
          code: 470,
          message: `This ${role} account has been deactivated.`
        });
      }

        return res.status(200).json({
          status: 'VENDOR_EXISTS',
          code: 200,
          message: `${role} already registered`,
        });
      
    } else {
      const otpResponse = await sendOtp(formattedPhoneNumber, role);

      if (otpResponse.status !== 200) {
        return res.status(204).json({
          status: `OTP_SEND_ERROR ${otpResponse.status}`,
          code: 204,
          error: otpResponse.error,
          details: otpResponse.details
        });
      }


      return res.status(203).json({
        status: 'NEW_VENDOR',
        code: 203,
        message: `New ${role} registration, OTP sent for registration`,
      });
    }

  } catch (error) {
    res.status(500).json({
      status: 'CHECK_NUMBER_ERROR',
      code: 500,
      error: 'An error occurred while checking the phone number.',
      details: error.message 
    });
  }
});






///Check user Number
router.post('/checknumber', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const deviceId = req.header('deviceid');
    const role = req.header('role');
    const formattedPhoneNumber = `234${phoneNumber}`;

    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({
        status: 'INVALID_PHONE_NUMBER',
        code: 400,
        message: 'Invalid phone number format'
      });
    }
   

    // Choose the correct model based on userType
    let UserModel;
    switch (role) {
      case 'vendor':
        UserModel = [Merchant, Engineer, TowService, ServiceCenter, DocumentCenter];
      case 'user':
        UserModel = User;
        break;
      case 'agent':
      case 'deliveryagent':
      case 'support':
        UserModel = Agent;
        break;
      case 'affiliate':
        UserModel = Affiliate;
        break;
      case 'merchant':
        UserModel = Merchant;
        break;
      case 'engineer':
        UserModel = Engineer;
        break;
      case 'servicecenter':
        UserModel = ServiceCenter;
        break;
      case 'documentcenter':
        UserModel = DocumentCenter;
        break;
      c
      default:
        return res.status(400).json({
          status: 'INVALID_USER_TYPE',
          code: 400,
          message: 'Invalid user type provided'
        });
    }

    const user = await UserModel.findOne({ phoneNumber });
    const sendOtp = sendOtpSendChamp;
    
    if (user) {
      if (user.status === 'deactivated') {
        return res.status(470).json({
          status: 'USER_DEACTIVATED',
          code: 470,
          message: `This ${role} account has been deactivated.`
        });
      }

      if (user.deviceId === deviceId) {

        return res.status(200).json({
          status: 'USER_EXISTS',
          code: 200,
          message: `Returning ${role} login, deviceId matches`,
          firstName: user.firstName
        });
      } else {

        const otpResponse = await sendOtp(formattedPhoneNumber, role);

        if (otpResponse.status !== 200) {
          return res.status(202).json({
            code: 202,
            status: `OTP_SEND_ERROR ${otpResponse.status}`,
            error: otpResponse.error,
            details: otpResponse.details
          });
        }


        return res.status(201).json({
          status: 'DEVICE_ID_MISMATCH',
          code: 201,
          message: `${role} exists but deviceId does not match, OTP sent for verification`,
        });
      }
    } else {
      const otpResponse = await sendOtp(formattedPhoneNumber, role);

      if (otpResponse.status !== 200) {
        return res.status(204).json({
          status: `OTP_SEND_ERROR ${otpResponse.status}`,
          code: 204,
          error: otpResponse.error,
          details: otpResponse.details
        });
      }


      return res.status(203).json({
        status: 'USER_NOT_FOUND',
        code: 203,
        message: `New ${role} registration, OTP sent for registration`,
      });
    }

  } catch (error) {
    res.status(500).json({
      status: 'CHECK_NUMBER_ERROR',
      code: 500,
      error: 'An error occurred while checking the phone number.',
      details: error.message 
    });
  }
});







// User Registration Endpoint
router.post('/register', async (req, res) => {
  try {
    const { pin, phoneNumber } = req.body;

    // Check if phoneNumber already exists
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number already registered.' }); // Conflict
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    console.log('User data:', pin, phoneNumber);

    const newUser = new User({
      pin: hashedPin,
      phoneNumber,
      isSubscribed: false,
      role: 'user',
      status: 'active',
    });

    await newUser.save();

    res.status(200).json({ message: 'User registered successfully.' });
  } catch (error) {
    console.error('Registration error:', error);

    // Differentiate between phone number conflict and other errors
    if (error.code === 11000) { // MongoDB duplicate key error code
      res.status(409).json({ error: 'Phone number already registered.' });
    } else {
      res.status(500).json({ error: 'Registration failed.' });
    }
  }
});




 // User Login Endpoint
router.post('/login', async (req, res) => {
  try {
    const { pin, phoneNumber, deviceName, operatingSystem, deviceId } = req.body;
   


    // Find user by phoneNumber
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    // Compare the provided PIN with the stored hashed PIN
    const isMatch =  bcrypt.compare(pin, user.pin);
    if (isMatch) {

      // Update user's deviceId
      user.deviceId = deviceId;

      

      // Save the user with the updated deviceId
      await user.save();

      

      // Check if the deviceId exists in the Device collection
      const existingDevice = await Device.findOne({ deviceId });
      if (existingDevice) {
        // If the deviceId exists, update the event in the logins array
        await Device.findOneAndUpdate(
          { deviceId },
          {
            $push: {
              logins: { date: new Date(), event: 'login' },
            },
          }
        );
      } else {
        // If the deviceId does not exist, create a new device and add the data to it
        await Device.create({
          userId: user._id,
          deviceId,
          deviceName,
          operatingSystem,
          status: 'active', // Set the initial status to 'active' or any other value you prefer
          logins: [{ date: new Date(), event: 'login' }],
        });
      }

      // Generate a JWT token with expiration time (7 days)
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      // Login successful
      res.status(200).json({ message: 'Login successful.', userId: user._id, token, role: user.role });
    } else {
      // Incorrect PIN
      res.status(401).json({ error: 'Incorrect credentials.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ error: 'Login failed.', details: error.message });
  }
});





function generateReferralCode(firstName, phoneNumber) {
  const prefix = firstName.substring(0, 3).toUpperCase();
  const suffix = phoneNumber.slice(-4);
  const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${randomPart}${suffix}`;
}





// Register a new support agent
router.post('/register/support', async (req, res) => {
  try {
    const { username, pin, firstName, lastName, phoneNumber, address } = req.body;

    // Check if the username already exists
    const existingAgent = await Agent.findOne({ username });
    if (existingAgent) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Create a new agent
    const newAgent = new Agent({
      username,
      pin: hashedPin,
      firstName,
      lastName,
      phoneNumber,
      address,
      role: 'support',
    });

    // Save the new agent
    await newAgent.save();

    res.status(201).json({ message: 'Support agent created successfully', agent: newAgent });
  } catch (error) {
    console.error('Error creating support agent:', error);
    res.status(500).json({ message: 'Error creating support agent', error: error.message });
  }
});



// Register a new agent
router.post('/register/agent', async (req, res) => {
  try {
    const { pin, firstName, lastName, phoneNumber, address } = req.body;

    // Check if the phone number already exists
    const existingAgent = await Agent.findOne({ phoneNumber });
    if (existingAgent) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    const existingApproval = await Approval.findOne({ phoneNumber });
    if(!existingApproval){
      return res.status(400).json({ message: 'Invalid approval code' });
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Create a new agent
    const newAgent = new Agent({
      pin: hashedPin,
      firstName,
      lastName,
      phoneNumber,
      address,
      access: existingApproval.access,
      role: 'agent',
      status: 'active',
    });

    // Save the new agent
    await newAgent.save();

    res.status(201).json({ message: 'Agent created successfully', agent: newAgent });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ message: 'Error creating agent', error: error.message });
  }
});



// Register a new delivery agent
router.post('/register/deliveryagent', async (req, res) => {
  try {
    const { phoneNumber, pin, firstName, lastName, address } = req.body;

    // Check if the phone number already exists
    const existingAgent = await Agent.findOne({ phoneNumber });
    if (existingAgent) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Create a new agent
    const newAgent = new Agent({
      pin: hashedPin,
      firstName,
      lastName,
      phoneNumber,
      address,
      role: 'deliveryagent',
      status: 'active',
    });

    // Save the new agent
    await newAgent.save();

      res.status(201).json({ message: 'Delivery agent created successfully', agent: newAgent });
  } catch (error) {
    console.error('Error creating delivery agent:', error);
    res.status(500).json({ message: 'Error creating delivery agent', error: error.message });
  }
});



router.post('/agentlogin', async (req, res) => {
  const { phoneNumber, pin, deviceId, deviceName, operatingSystem } = req.body;

  if(!phoneNumber){
    return res.status(400).json({ message: 'Invalid phone number 1' });
  }

  try{
 
const agent = await Agent.findOne({ phoneNumber });

if(!agent){
  return res.status(400).json({ message: 'User not found' });
}

const ispinValid = await bcrypt.compare(pin, agent.pin);

if(!ispinValid){
  return res.status(400).json({ message: 'Invalid pin' });
}

const token = jwt.sign({ userId: agent._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const existingDevice = await Device.findOne({ deviceId });

if(existingDevice){
  await Device.findOneAndUpdate(
    { deviceId },
    { $push: { logins: { date: new Date(), event: 'login' } } }
  );
} else {
  await Device.create({
    agentId: agent._id,
    deviceId,
    deviceName,
    operatingSystem,
    status: 'active',
    logins: [{ date: new Date(), event: 'login' }],
  });
}

 agent.deviceId = deviceId;
 await agent.save();

res.status(200).json({ message: 'Login successful', id: agent._id, token, role: agent.role });

  } catch (error) {
    console.error('Error processing agent login:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});




// agent login route
router.post('/login/agent/', async (req, res) => {

  const phoneNumber = req.body.phoneNumber;
  const pin = req.body.pin;
  const deviceId = req.body.deviceId;
  const deviceName = req.body.deviceName;
  const operatingSystem = req.body.operatingSystem;

  // Check if phoneNumber is provided
  if (!phoneNumber) {
    return res.status(400).json({ message: 'Phone number is required' });
  }

  console.log(phoneNumber, pin, deviceId, deviceName, operatingSystem);

  if (phoneNumber.length < 10 || !validatePhoneNumber(phoneNumber)) {
    return res.status(400).json({ message: 'Invalid phone number' });
  }

  try {
    // Find the agent by phone number
    const agent = await Agent.findOne({ phoneNumber });

    if (!agent) {
      console.error(`No agent found with phone number: ${phoneNumber}`);
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if pin is provided and agent's pin is available
    if (!pin || !agent.pin) {
      console.error(`PIN or agent's PIN is missing for phone number: ${phoneNumber}`);
      return res.status(400).json({ message: 'PIN is required' });
    }

    // Compare the provided pin with the stored hashed pin
    const ispinValid = await bcrypt.compare(pin, agent.pin);

    if (!ispinValid) {
      console.error(`PIN validation failed for phone number: ${phoneNumber}`);
      return res.status(401).json({ message: 'Invalid pin' });
    }

    // Generate a login token
    const token = jwt.sign({ userId: agent._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Check if the deviceId exists
    const existingDevice = await Device.findOne({ deviceId });

    if (existingDevice) {
      // If the deviceId exists, update the event in the logins array
      await Device.findOneAndUpdate(
        { deviceId },
        {
          $push: {
            logins: { date: new Date(), event: 'login' },
          },
        }
      );
    } else {
      // If the deviceId does not exist, create a new device and add the data to it
      await Device.create({
        agentId: agent._id,
        deviceId,
        deviceName,
        operatingSystem,
        status: 'active', // Set the initial status to 'active' or any other value you prefer
        logins: [{ date: new Date(), event: 'login' }],
      });
    }

    // Update the agent with the deviceId
    await Agent.findByIdAndUpdate(agent._id, { $set: { deviceId } });

    // Return the response with the token and other variables
    res.status(200).json({
      _id: agent._id,
      role: agent.role,
      token, // Include the generated token in the response
      __v: 0,
    });
  } catch (error) {
    console.error(`Error processing agent login: ${error}`);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});


// / agent login route
router.post('/login/vendor', async (req, res) => {
    const { phonenumber, pin, deviceId, deviceName, operatingSystem } = req.body;

  try {
    // Find the agent by phone number

    let UserModel;
    switch (role) {
      case 'merchant':
        UserModel = Merchant;
        break;
      case 'engineer':
        UserModel = Engineer;
        break;
      case 'towservice':
        UserModel = TowService;
        break;
      case 'servicecenter':
        UserModel = ServiceCenter;
        break;
      case 'documentcenter':
        UserModel = DocumentCenter;
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }


    const agent = await UserModel.findOne({ phonenumber });

    if (!agent) {
      return res.status(401).json({ message: 'Invalid phone number' });
    }

    // Compare the provided pin with the stored hashed pin
    const ispinValid = await bcrypt.compare(pin, agent.pin);

    if (!ispinValid) {
      return res.status(401).json({ message: 'Invalid pin' });
    }


    // Generate a login token
    const token = jwt.sign({ userId: agent._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Check if the deviceId exists
    const existingDevice = await Device.findOne({ deviceId });

    if (existingDevice) {
      // If the deviceId exists, update the event in the logins array
      await Device.findOneAndUpdate(
        { deviceId },
        {
          $push: {
            logins: { date: new Date(), event: 'login' },
          },
        }
      );
    } else {
      // If the deviceId does not exist, create a new device and add the data to it
      await Device.create({
        agentId: agent._id,
        deviceId,
        deviceName,
        operatingSystem,
        status: 'active', // Set the initial status to 'active' or any other value you prefer
        logins: [{ date: new Date(), event: 'login' }],
      });
    }

    // Update the agent with the deviceId
    await Agent.findByIdAndUpdate(agent._id, { $set: { deviceId } });

    // Return the response with the token and other variables
    res.status(200).json({
      _id: agent._id,
      role: agent.role,
      firstName: agent.firstName,
      token, // Include the generated token in the response
      __v: 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});




// Endpoint to initiate pin reset
router.post('/reset-pin-request', async (req, res) => {
  const { phoneNumber, role } = req.body;

  if (!validatePhoneNumber(phoneNumber)) {
    return res.status(400).json({
      code: 'INVALID_PHONE_NUMBER',
      message: 'Invalid phone number format'
    });
  }
 

  try {
    let entity;

    switch (role) {
      case 'user':
        entity = await User.findOne({ phoneNumber });
        break;
      case 'agent':
      case 'deliveryagent':
      case 'support': 
        entity = await Agent.findOne({ phoneNumber });
        break;
      case 'merchant':
        entity = await Merchant.findOne({ phoneNumber });
        break;  
        
      case 'engineer':
        entity = await Engineer.findOne({ phoneNumber });
        break;
      case 'affiliate':
        entity = await Affiliate.findOne({ phoneNumber });
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    if (!entity) {
      return res.status(404).json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} not found` });
    }
    
    let retOtp ='';
    // Generate a unique reset token (you can use libraries like uuid)
    const reset= crypto.randomInt(100000, 999999).toString();
    const sendOtp = sendOtpSendChamp;
    const formattedPhoneNumber = `+234${phoneNumber}`;
    const otpResponse = await sendOtp(formattedPhoneNumber);

    if (otpResponse.status === 200) {
     retOtp = otpResponse.otp;
    } else {
      return res.status(400).json({ message: 'Failed to send OTP', error: otpResponse.error });
    } 

    // Store the reset token in the database
    entity.resetToken = reset;
    await entity.save();

    // Send the reset token to the user/agent/engineer (e.g., via email)

    res.status(200).json({ message: 'pin reset token sent successfully', token: reset , otp: retOtp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', error: otpResponse.error, otpResponse  });
  }
});



// Endpoint to handle pin reset
router.post('/reset-pin', async (req, res) => {
  const { phoneNumber, role, resetToken, newPin } = req.body;

  if (!validatePhoneNumber(phoneNumber)) {
    return res.status(400).json({
      status: 'INVALID_PHONE_NUMBER',
      code: 400,
      message: 'Invalid phone number format'
    });
  }
 
  
  try {
    let entity;

    switch (role) {
      case 'user':
        entity = await User.findOne({ phoneNumber, resetToken });
        break;
      case 'agent':
        entity = await Agent.findOne({ phoneNumber, resetToken });
        break;
      case 'merchant':
        entity = await Merchant.findOne({ phoneNumber, resetToken });
        break;
      case 'engineer':
        entity = await Engineer.findOne({ phoneNumber, resetToken });
        break;
      case 'support':
        entity = await Agent.findOne({ phoneNumber, resetToken });
        break;
      case 'deliveryagent':
        entity = await Agent.findOne({ phoneNumber, resetToken });
        break;
      case 'affiliate':
        entity = await Affiliate.findOne({ phoneNumber, resetToken });
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }

    if (!entity) {
      return res.status(401).json({ message: 'Invalid reset token' });
    }

    // Verify the reset token (you might want to add an expiration check)
    if (entity.resetToken !== resetToken) {
      return res.status(401).json({ message: 'Invalid reset token' });
    }

    // Hash the new pin
    const hashedpin = await bcrypt.hash(newPin, 10);

    // Update the user/agent/engineer's pin and reset token
    entity.pin = hashedpin;
    await entity.save();

    // Create a new JWT token after the pin reset

    res.status(200).json({ message: 'pin reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
});






  // Route to add a new delivery option
router.post('/deliveryoption', async (req, res) => {
  const { type, location, amount, duration } = req.body;

  try {
    // Create a new delivery option document
    const newDeliveryOption = await DeliveryOption.create({
      type,
      location,
      amount,
      duration
    });

    res.status(200).json(newDeliveryOption);
  } catch (error) {
    console.error('Error adding delivery option:', error);
    res.status(500).json({ error: 'Failed to add delivery option' });
  }
});


// / Function to format the route alphabetically
const formatRoute2 = (route) => {
  return route
    .split('-')
    .map(location => location.trim())
    .sort()
    .join(' - ');
};

// Endpoint to format and update all routes in the database
router.put('/formatRoutes', async (req, res) => {
  try {
    // Find all records in the Location collection
    const locations = await Location.find({});

    // Track the number of routes updated
    let updatedCount = 0;

    // Iterate through each location and update the route
    for (const location of locations) {
      const formattedRoute = formatRoute2(location.route);

      // Only update the route if it has changed after formatting
      if (formattedRoute !== location.route) {
        location.route = formattedRoute;
        await location.save();
        updatedCount++;
      }
    }

    res.status(200).json({
      message: `Formatted and updated ${updatedCount} routes.`,
      updatedCount
    });
  } catch (error) {
    console.error('Error updating routes:', error);
    res.status(500).json({ error: 'Failed to format and update routes.' });
  }
});


// Helper function to format the route
function formatRoute(route) {
  return route
    .split(',')
    .map((location) => location.trim())
    .sort()
    .join(' - ');
}

// Endpoint to aggregate and fetch records by type and optionally route
router.get('/fetchLocationTypes', async (req, res) => {
  try {
    const { type, route } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Type parameter is required' });
    }

    let matchCondition = { type: type };

    if (route !== 'all') {
      // Format the route by splitting, sorting, and joining it back
      const formattedRoute = formatRoute(route);
      matchCondition.route = formattedRoute;
    }

    // Aggregate locations by type and optionally route
    const aggregatedLocations = await Location.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$route',
          distance: { $first: '$distance' },
          transport: { $first: '$transport' },
          minCost: { $first: '$minCost' },
          maxCost: { $first: '$maxCost' },
        },
      },
      {
        $project: {
          _id: 0,
          route: '$_id',
          distance: 1,
          transport: 1,
          minCost: 1,
          maxCost: 1,
        },
      },
    ]);

    if (aggregatedLocations.length > 0) {
      res.status(200).json({ message: 'Aggregated locations fetched successfully', data: aggregatedLocations });
    } else {
      res.status(404).json({ message: 'No locations found for the specified type and route' });
    }
  } catch (error) {
    console.error('Error fetching aggregated locations:', error);
    res.status(500).json({ error: 'Failed to fetch aggregated locations.' });
  }
});

router.get('/latest_version', async (req, res) => {
  try {
    // Retrieve the latest version document (sorting by creation date)
    const latestVersion = await AppVersion.findOne().sort({ createdAt: -1 }).exec();

    if (!latestVersion) {
      return res.status(404).json({ error: "No version information found" });
    }

    res.status(200).json(latestVersion);
  } catch (error) {
    console.error("Error fetching version data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
