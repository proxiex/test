const express = require('express');
const router = express.Router();
const UnassignedTransaction = require('../models/unassignedTransaction');
const Transaction = require('../models/transaction');
const WhatsAppMessage = require('../models/whatsapp');
const axios = require('axios');
const crypto = require('crypto');
const OTP = require('../models/otp');
// Import and configure dotenv
require('dotenv').config();









  //webhook endpoint
  router.post('/payment-webhook', async (req, res) => {
    const secretKey = process.env.PSK;
  
    try {
      // Validate Paystack webhook
      const hash = crypto.createHmac('sha512', secretKey).update(JSON.stringify(req.body)).digest('hex');
      if (hash !== req.headers['x-paystack-signature']) {
        return res.status(403).json({ status: 'error', message: 'Invalid Paystack signature' });
      }
  
      // Retrieve the request's body
      const event = req.body;
      console.log(event);
  
      // Check if the event starts with "charge"
      
// Check if the event starts with "charge"
if (event.event.startsWith('charge')) {
  const { reference, amount, status, customer, session, createdAt } = event.data;

  // Find the corresponding transaction in the database
  const transaction = await Transaction.findOne({ reference });

  if (!transaction) {
    // If transaction not found, add details to the unassignedTransaction collection
    const unassignedTransaction = new UnassignedTransaction({
      status: status,
      amount: amount,
      reference: reference,
      customer: {
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone,
      },
      session: session,
      createdAt: createdAt,
    });

    console.error('Transaction not found:', reference);
    await unassignedTransaction.save();

    return res.status(404).json({ status: 'error', message: 'Transaction not found' });
  }

  // Update the transaction status based on the Paystack event
  if (event.event === 'charge.success') {
    transaction.status = 'success';
  } else if (event.event === 'charge.failed') {
    transaction.status = 'failed';
  }

  // Save the updated transaction status
  await transaction.save();

  // Notify the Flutter app about the payment status
  const responseData = {
    status: 'success',
    message: 'Transaction status updated successfully',
    paymentStatus: transaction.status, // Include payment status in the response
  };

  // Respond to Paystack with a success status
  return res.status(200).json(responseData);
} else if (event.event.startsWith('transfer')) {
  // Handle "transfer" events as before
  const { reference, amount, status, recipient, reason, session, createdAt } = event.data;

 // Check if the reference exists in Transaction or UnassignedTransaction
 const transaction = await Transaction.findOne({ reference });
 const nassignedTransaction = await UnassignedTransaction.findOne({ reference });

  if (!transaction && !nassignedTransaction) {
    const unassignedTransaction = new UnassignedTransaction({
      status: status,
      amount: amount,
      reference: reference,
      reason: reason,
      customer: {
        name: recipient.name,
        account_number: recipient.account_number,
        account_name: recipient.account_name,
        bank_name: recipient.bank_name,
        email: recipient.email,
        recipient_code: recipient.recipient_code,
      },
      session: session,
      createdAt: createdAt,
    });

    console.error('Transaction not found:', reference);
    await unassignedTransaction.save();

    return res.status(404).json({ status: 'error', message: 'Transaction not found' });
  }

  // Update the transaction status based on the Paystack event
  if (event.event === 'transfer.success') {
    transaction.status = 'success';
  } else if (event.event === 'transfer.failed') {
    transaction.status = 'failed';
  }

  const paymentFor = transaction.paymentfor;
  const repairRef = transaction.repairRef;

  // Check paymentFor value and update repairTicket status accordingly
  if (paymentFor === 'PartsTransfer') {
    const repairTicket = await RepairTicket.findOne({ repairRef });

    if (repairTicket.partsTransferStatus === 'Pending') {
      repairTicket.partsTransferStatus = 'Success';
      await repairTicket.save();
    }
  } else if (paymentFor === 'LabourTransfer') {
    const repairTicket = await RepairTicket.findOne({ repairRef });

    if (repairTicket.labourTransferStatus === 'Pending') {
      repairTicket.labourTransferStatus = 'Success';
      await repairTicket.save();
    }
  }

  // Save the updated transaction status
  await transaction.save();

  // Notify the Flutter app about the payment status
  const responseData = {
    status: 'success',
    message: 'Transaction status updated successfully',
    paymentStatus: transaction.status, // Include payment status in the response
  };

  // Respond to Paystack with a success status
console.log('Webhool loaded successfull')
  return res.status(200).json();
} else {
  console.error('Unsupported event type:', event.event);
  return res.status(400).json({});
}
    } catch (error) {
      console.error('Error handling Paystack webhook:', error);
      res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
  });
  


// Function to generate a 6-digit OTP
const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString(); // Generates a 6-digit number
};

// // Webhook endpoint to handle incoming messages
// router.post('/whatsapp-webhook', async (req, res) => {
//   try {
//     console.log('whatsapp-webhook post hook reached');

//     // Validate the incoming request structure
//     const entry = req.body.entry;
//     console.log('Entry:', entry);
//     if (!entry || !entry[0]) { 
//       throw new Error('No entry found in request body');
//     }

//     // Convert the entry to a JSON string for saving in whEntry
//     const whEntry = JSON.stringify(entry);
//     console.log('whEntry:', whEntry);

//     const changes = entry[0].changes;
//     console.log('Changes:', changes);
//     if (!changes || !changes[0]) {
//       throw new Error('No changes found in entry');
//     }

//     const messageData = changes[0].value.messages;
//     console.log('Message Data:', messageData);
//     if (!messageData) {
//       throw new Error('No messages found in changes');
//     }

//     const contactData = changes[0].value.contacts;
//     console.log('Contact Data:', contactData);
//     if (!contactData || !contactData[0]) {
//       throw new Error('No contacts found in changes');
//     }

//     const metadata = changes[0].value.metadata;
//     console.log('Metadata:', metadata);
//     if (!metadata) {
//       throw new Error('No metadata found in changes');
//     }

//     // Extract the message details and include whEntry
//     const message = {
//       id: messageData[0].id,
//       timestamp: new Date(parseInt(messageData[0].timestamp) * 1000).toISOString(),
//       type: messageData[0].type,
//       body: messageData[0].text?.body || null,
//       whEntry: whEntry,  // Save the entire entry JSON string here
//       image: messageData[0].image || null,
//       location: messageData[0].location || null,
//       button: messageData[0].button || null,
//       interactive: messageData[0].interactive || null,
//       system: messageData[0].system || null,
//     };

//     console.log('Processed Message:', message);

//     // Check if the message is 'OTP'
//     if (message.body && message.body.toLowerCase() === 'otp') {
//       const otp = generateOtp();
//       const responseMessage = `Your OTP is ${otp}. This code expires in 10 minutes.`;

//       // Send OTP via WhatsApp
//       await axios.post(process.env.WHATSAPP_SENDMESSAGEURL, {
//         messaging_product: 'whatsapp',
//         to: messageData[0].from,
//         text: { body: responseMessage },
//       }, {
//         headers: {
//           'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
//           'Content-Type': 'application/json',
//         },
//       });

//       // Upsert the OTP in the database
//       await OTP.findOneAndUpdate(
//         { phoneNumber: messageData[0].from },
//         { otp: otp },
//         { upsert: true, new: true }
//       );
//     }

//     // Check if there's a WhatsAppMessage entry with the same 'from'
//     const existingMessageEntry = await WhatsAppMessage.findOne({ from: messageData[0].from });

//     if (existingMessageEntry) {
//       const existingMessage = existingMessageEntry.messages.find(m => m.id === messageData[0].id);

//       if (existingMessage) {
//         const isIdentical = JSON.stringify(existingMessage) === JSON.stringify(message);
//         if (isIdentical) {
//           console.log('Duplicate message with the same ID and content, skipping save.');
//           return res.status(200).send('Duplicate message, not saved.');
//         }
//       }

//       existingMessageEntry.messages.push(message);
//       await existingMessageEntry.save();
//     } else {
//       const newMessageEntry = new WhatsAppMessage({
//         from: messageData[0].from,
//         role: 'user',
//         metadata: {
//           display_phone_number: metadata.display_phone_number,
//           phone_number_id: metadata.phone_number_id
//         },
//         contact: {
//           name: contactData[0].profile.name,
//           wa_id: contactData[0].wa_id
//         },
//         messages: [message]
//       });

//       await newMessageEntry.save();
//     }

//     console.log('whatsapp-webhook post hook successful');
//     res.status(200).send('Message received and saved');
//   } catch (err) {
//     console.error('Error processing message:', err);
//     res.status(500).send('Error processing message');
//   }
// });



router.get('/whatsapp-webhook', (req, res) => {
  console.log('Webhook GET request received');
  console.log('Full URL:', req.url);
  console.log('Query parameters:', req.query);
  console.log('Headers:', req.headers);
  
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  console.log('Mode:', mode);
  console.log('Token:', token);
  console.log('Challenge:', challenge);
  
  const expectedToken = process.env.VERIFY_TOKEN || 'wavt';
  
  if (mode === 'subscribe' && token === expectedToken) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('Webhook verification failed');
    res.sendStatus(403);
  }
});


module.exports = router; // Export the router
