const express = require('express');
const ChatSession = require('../models/chat');
const Agent = require('../models/agent');
const User = require('../models/user'); 
const RepairTicket = require('../models/repair'); 
const uuid = require('uuid');
const { sendMessageWhatsApp } = require('../controllers/messagecontroller');
const router = express.Router();
const axios = require('axios');
const WhatsAppMessage = require('../models/whatsapp');










// Generate a random alphanumeric string for the session ID
function generateSessionId() {
  return uuid.v4();
}





// Create a new chat session
router.post('/create/:userId', async (req, res) => {
  const { userId } = req.params;
  const { vehicle, user:reqUser, description, sessionType, documentRef } = req.body;
  const userRole = req.header('role'); // Assuming the user role is in the request header

  try {
    // Check if a session already exists for this user and vehicle
    const existingSession = await ChatSession.findOne({ 
      $or: [
        { 'user.id': reqUser.id },
        { 'documentRef': documentRef },
        { 'vehicle.id': vehicle.id },
        { 'description': description }
      ],
      isClosed: false
    });

    if (existingSession) {
      return res.status(400).json({ 
        error: `An open session already exists for this ${sessionType}`,
        sessionId: existingSession.sessionId
      });
    }

    // Generate a new session ID
    const sessionId = generateSessionId();

    // Create a new chat session
    const newSession = new ChatSession({
      sessionId,
      vehicle,
      user:reqUser,
      sessionType,
      description,
      documentRef,
    });

    // Save the new session
    await newSession.save();

    // Find the user and update their support array based on their role
    let user;
    switch (userRole) {
      case 'user':
        user = await User.findByIdAndUpdate(
          userId,
          { $push: { support: sessionId } },
          { new: true }
        );
        break;
      case 'engineer':
        user = await Engineer.findByIdAndUpdate(
          userId,
          { $push: { support: sessionId } },
          { new: true }
        );
        break;
      case 'merchant':
        user = await Merchant.findByIdAndUpdate(
          userId,
          { $push: { support: sessionId } },
          { new: true }
        );
        break;
      default:
        return res.status(400).json({ error: 'Invalid user role' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if(sessionType === 'Dispute'){
      const dispute = await RepairTicket.findOne({repairRef: documentRef});
      if (dispute) {
        dispute.isDisputed = true;
        dispute.disputeId = sessionId;
        await dispute.save();
      } else {
        console.error(`Dispute not found for documentRef: ${documentRef}`); 
        return res.status(404).json({ error: 'Dispute not found' });
      }
    }

    res.status(201).json({
      message: 'Chat session created successfully',
      sessionId,
     
    });
  } catch (err) {
    console.error('Error creating chat session:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





// Handle sendMessage eve

router.post('/sendmessage/:sessionId', async (req, res) => {


  console.log('New message received in addmessages');
  const {sessionId}  = req.params;
  const { senderId, senderName, content, messageId } = req.body;

  try {
    const session = await ChatSession.findOneAndUpdate(
      { sessionId },
      { $push: { messages: { senderId, senderName, content, _id: messageId } } },
      { new: true } // Return the updated document
    );

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Get the messageId from the added message
    const addedMessage = session.messages.find(message => message._id === messageId);

    if (!addedMessage || !addedMessage._id) {
      console.error('Error: Added message not found or messageId is null', addedMessage);
      return res.status(201).json({ error: 'Error retrieving the added message or messageId is null' });
    }

   
    //  sendMessageToRoom(sessionId, senderName, content, messageId);

    // Return the response with the messageId
    res.status(200).json({
      message: 'Message added successfully',
      messageId2: addedMessage._id,
    });
  } catch (err) {
    // Handle specific errors (e.g., database errors) and provide informative messages
    console.error(err);
    res.status(500).json({ error: 'An error occurred' });
  }
});





router.get('/getsessions/:userId', async (req, res) => {
  const { userId } = req.params;
  const userRole = req.header('role'); // Assuming the user role is in the request header

  try {
    // Find the user using the provided userId
    let user;

    switch (userRole) {
      case 'user':
        user = await User.findById(userId);
        break;
      case 'engineer':
        user = await Engineer.findById(userId);
        break;
      case 'agent':
        user = await Agent.findById(userId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid user role' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found', userId: userId });
    }

    // Extract the session IDs from the user's support array
    const sessionIds = user.support;

    // Retrieve sessions from chat sessions using the extracted session IDs
    const sessions = await ChatSession.find({ sessionId: { $in: sessionIds } });

    if (sessions.length === 0) {
      return res.status(200).json({ message: 'No sessions found for the user' });
    }

    // Extract relevant session information
    const sessionInfo = sessions.map((session) => ({
      sessionId: session.sessionId,
      vehicle: session.vehicle,
      sessionType: session.sessionType,
      agentId: session.agentId,
      agentName: session.agentName,
      isClosed: session.isClosed,
      isAssigned: session.isAssigned,
      opened: session.opened,
      closed: session.closed
    }));

    res.status(200).json({ sessions: sessionInfo });
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





// // Get all messages from a chat session
router.get('/getmessages/:sessionId', async (req, res) => {
  const { sessionId, userId } = req.params;

  try {
    const session = await ChatSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const { sessionType, isAssigned, isClosed, messages, agentName, agentId } = session;


// Check if a socket session exists with the provided sessionId
// joinRoom(sessionId);


    if (messages.length === 0) {
      return res.status(200).json({ message: 'No messages in this chat session', sessionType, isAssigned, agentName, agentId });
    }


    // Join the socket to the room corresponding to the userId
  

    res.status(200).json({ messages, sessionType, isAssigned, isClosed });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





// Assign an agent to a chat session
router.put('/assign-agent/:sessionId', async (req, res) => {
  const { sessionId, agentId } = req.body;

  try {
    const agent = await Agent.findById(agentId );
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agentName = agent.firstName;

    const session = await ChatSession.findOneAndUpdate(
      { sessionId },
      { $set: { agentId, agentName, isAssigned: true } },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Assuming you want to add the sessionId to the agent's support array
    agent.support.push(sessionId);

    await agent.save();


    req.app.get('io').to(sessionId).emit('agentAssigned', {
      sessionId,
      agentId,
      agentName,
      isAssigned: true,
    });

    res.status(200).json({ message: 'Agent assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get all unassigned chat sessions
router.get('/unassigned', async (req, res) => {
  try {
    const sessions = await ChatSession.find({ agentId: null });
    res.status(200).json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// Endpoint to reply to the user and save the message with role 'agent'
router.post('/sendwhatsappmessage', async (req, res) => {
  try {

    const { to, body } = req.body;

    if (!to || !body) {
      throw new Error();
    }

    // Send the reply via WhatsApp
    await axios.post(process.env.WHATSAPP_SENDMESSAGEURL, {
      messaging_product: 'whatsapp',
      to: to,
      text: { body: body },
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    // Save the agent's message in the same collection
    const message = {
      id: crypto.randomUUID(), // Generate a unique ID for the agent's message
      timestamp: new Date().toISOString(),
      type: 'text',
      body: body,
      whEntry: null,  // No need for whEntry as this is a reply
      role: 'agent' // Set the role as 'agent'
    };


    // Find the existing user entry
    const existingMessageEntry = await WhatsAppMessage.findOne({ from: to });

    if (existingMessageEntry) {
      existingMessageEntry.messages.push(message);
      await existingMessageEntry.save();
    } else {
      const newMessageEntry = new WhatsAppMessage({
        from: to,
        role: 'user',
        messages: [message]
      });

      await newMessageEntry.save();
    }

    res.status(200).send('Reply sent and saved');
  } catch (err) {
    console.error('Error processing reply:', err);
    res.status(500).send('Error processing reply');
  }
});




module.exports = router;
