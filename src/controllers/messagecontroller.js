const request = require('request');
const OTP = require('../models/otp');
const whatsapp = require('../models/whatsapp');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const accessTokenSchema = require('../models/accessToken');
require('dotenv').config();

const sendchampToken = process.env.SENDCHAMP_TOKEN;
const sendchampsms = process.env.SENDCHAMP_SMS;
const sendchampotp = process.env.SENDCHAMP_OTP;

const TOKEN_FILE = path.join(__dirname, '..', 'data', 'whatsapp_token.json');

let accessTokenCache = null; // In-memory cache for access token

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString(); // Generates a 6-digit number
};


const sendMessage = (phoneNumber, message, callback) => {
  const options = {
    method: 'POST',
    url: sendchampsms,
    headers: {
      Accept: 'application/json,text/plain,*/*',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sendchampToken}`
    },
    json: {
      to: `234${phoneNumber}`,
      message: message,
      sender_name: 'MyOgaMech',
      route: 'dnd'
    }
  };

  request(options, function (error, response, body) {
    if (error) {
      callback(error, null);
    } else {
      // Ensure body contains the status code field as 'code'
      callback(null, body);
    }
  });
};


const sendOtpSendChamp = async (phoneNumber, role) => {
  if(!role || !phoneNumber){
    return {
      status: 400,
      error: 'Phone number or role not provided'
    };
  }
  const headers = {
    Accept: 'application/json,text/plain,*/*',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sendchampToken}`
  };

  const requestBody = {
    channel: 'sms',
    sender: 'MyOgaMech',
    token_type: 'numeric',
    token_length: 6,
    expiration_time: 10,
    customer_mobile_number: phoneNumber,
    meta_data: { description: `OTP Request for ${role}` },
    in_app_token: false
  };

  const options = {
    method: 'POST',
    url: sendchampotp,
    headers: headers,
    json: requestBody
  };

  try {
    const response = await new Promise((resolve, reject) => {
      request(options, async (error, response, body) => {
        if (error) {
          return reject({ status: 500, error: 'Request to Sendchamp failed' });
        }

        if (response.statusCode !== 200) {
          return reject({
            status: response.statusCode,
            error: 'Failed to send OTP',
            details: body
          });
        }

        if (!body || !body.data || !body.data.token) {
          return reject({
            status: 500,
            error: 'Invalid response from Sendchamp'
          });
        }

        const otpRecord = await OTP.findOne({ phoneNumber: phoneNumber, role: role });
        if (otpRecord) {
          // Update existing record
          otpRecord.otp = body.data.token;
          otpRecord.generatedAt = new Date();
          await otpRecord.save();
        } else {
          // Create new record
          await OTP.create({ 
            phoneNumber: phoneNumber, 
            role: role === 'merchant' || role === 'engineer' || role === 'servicecenter' || role === 'documentcenter' || role === 'towservice'|| role === 'vendor' ? 'vendor' : role,
            otp: body.data.token, 
            generatedAt: new Date() 
          });
        }

         // Resolve with the token
         resolve({ status: 200, message: 'OTP sent successfully', otp: body.data.token });
      });
    });

    return response;
  } catch (error) {
    // Handle any error that occurred during the request
    return error;
  }
};



const generateAccessToken = async () => {
  // Generate a new access token 
  const newAccessToken = await axios.post(process.env.WHATSAPP_TOKEN_URL, {
    client_id: process.env.WHATSAPP_CLIENT_ID,
    client_secret: process.env.WHATSAPP_CLIENT_SECRET,
    grant_type: 'client_credentials'
  })
  .then(response => response.data.access_token)
  .catch(error => {
    console.error('Error generating access token:', error);
    throw error;
  });

  // Check if an access token with type 'long-lived' exists
  const existingToken = await accessTokenSchema.findOne({ type: 'long-lived' });
  if (existingToken) {
    // Update existing token
    await accessTokenSchema.findByIdAndUpdate(existingToken.id, {
      token: newAccessToken,
      createdAt: new Date(),
      tokenValid: true
    });
  } else {
    // Create a new token if it doesn't exist
    await accessTokenSchema.create({
      type: 'long-lived',
      token: newAccessToken,
      createdAt: new Date(),
      tokenValid: true
    });
  }

  return newAccessToken;
};



const getAccessToken = async () => {
  // Check if access token is cached
  if (accessTokenCache) {
    return accessTokenCache;
  }

  // Retrieve the access token from MongoDB if not cached
  const accessTokenFromDB = await accessTokenSchema.findOne({ type: 'long-lived' });
  if (accessTokenFromDB) {
    if (accessTokenFromDB.tokenValid) {
      accessTokenCache = accessTokenFromDB.token; // Store in cache
      return accessTokenCache;
    } else {
      // Token is invalid, generate a new one
      const newAccessToken = await generateAccessToken();
      accessTokenCache = newAccessToken; // Store in cache
      return accessTokenCache;
    }
  }

  return null;
};



const sendWhatsappOtp = async (phoneNumber, otp) => {
  const responseMessage = `Your My Oga Mechanic OTP is ${otp}`;
  accessTokenCache = await getAccessToken();
  
  const headers = {
    'Authorization': `Bearer ${accessTokenCache}`, // Use the access token from cache
    'Content-Type': 'application/json',
  };
  const data = {
    "messaging_product": "whatsapp",    
    "recipient_type": "individual",
    "to": phoneNumber,
    "type": "text",
    "text": {
        "preview_url": false,
        "body": responseMessage
    }
  };

  try {
    const response = await axios.post(process.env.WHATSAPP_SENDMESSAGEURL, data, { headers });
    return { status: 200, message: 'OTP sent successfully', response };
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Check for specific error indicating token expiration
    if (error.response?.data?.error?.message.includes("Error validating access token")) {
      accessTokenCache = null; // Invalidate the cache
      await accessTokenSchema.findOneAndUpdate({ type: 'long-lived' }, { tokenValid: false });

      return{
        status: 500,
        error: 'Token expired',
        details: error.response?.data,
      }; // Retry sending OTP with a new token
    }

    return {
      status: error.response?.status || 500,
      error: error.message,
      details: error.response?.data,
    };
  }
};



const sendWhatsappOtp2 = async (phoneNumber, otp) => {
  const responseMessage = `Your My Oga Mechanic OTP is ${otp}`;
  accessTokenCache = await getAccessToken();
  
  const headers = {
    'Authorization': `Bearer ${accessTokenCache}`, // Use the access token from cache
    'Content-Type': 'application/json',
  };
  const data = {
    "messaging_product": "whatsapp",    
    "recipient_type": "individual",
    "to": phoneNumber,
    "type": "text",
    "text": {
        "preview_url": false,
        "body": responseMessage
    }
  };

  try {
    const response = await axios.post(process.env.WHATSAPP_SENDMESSAGEURL, data, { headers });
    return { status: 200, message: 'OTP sent successfully', response };
  } catch (error) {
    console.error('Error sending OTP:', error);
    
    // Check for specific error indicating token expiration
    if (error.response?.data?.error?.message.includes("Error validating access token")) {
      accessTokenCache = null; // Invalidate the cache

      return sendWhatsappOtp(phoneNumber, otp); // Retry sending OTP with a new token
    }

    return {
      status: error.response?.status || 500,
      error: error.message,
      details: error.response?.data,
    };
  }
};







const emailerSender = nodemailer.createTransport({
  host: 'mail.myogamechanic.com',
  port: 465,
  secure: true,
  auth: {
    user: 'verify@myogamechanic.com',
    pass: process.env.EMAIL_PASSWORD, // Use environment variable for password
  },
  // Increase timeouts and add error handling
  connectionTimeout: 120000, // 120 seconds
  greetingTimeout: 60000, // 60 seconds
  socketTimeout: 120000, // 120 seconds
  tls: {
    rejectUnauthorized: false // Only use this in development/testing
  },
  debug: true, // Enable debugging
  logger: true, // Enable logging
});



module.exports = { sendMessage, sendOtpSendChamp,  sendWhatsappOtp, emailerSender };
