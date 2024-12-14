import { Server } from "socket.io";
import jwt from 'jsonwebtoken';
import { socketEvents } from './config'; // Import socket events
import Merchant from "./models/merchant";
import Engineer from "./models/engineer";
import Agent from './models/agent';
import User from './models/user';
import RepairTicket from './models/repair';
import ServiceCenter from './models/serviceCenter';
import LocationTrail from './models/locationTrail';

import ChatSession from './models/chat';
import { v4 as uuid } from 'uuid'; // Use ES6 import for uuid

const socketAuth = async (socket, next) => {
  const token = socket.handshake.headers.token;
  const deviceId = socket.handshake.headers.deviceid;
  const role = socket.handshake.headers.role;

  if (!token || !deviceId || !role) {
    return next(new Error('Access denied. Token, Device-Id, or Role not provided.'));
  }

  try {
    const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);

    const roleModelMap = {
      admin: Agent,
      user: User,
      merchant: Merchant,
      agent: Agent,
      support: Agent,
      deliveryAgent: Agent,
      engineer: Engineer,
      servicecenter: ServiceCenter,
    };

    const Model = roleModelMap[role.toLowerCase()];
    if (!Model) {
      return next(new Error('Access denied. Invalid role.'));
    }

    const user = await Model.findById(decoded.userId);
    if (!user) return next(new Error('User not found.'));
    if (user.status === 'deactivated') return next(new Error('User account deactivated.'));
    if (user.deviceId !== deviceId) return next(new Error('Invalid Device-Id.'));

    // Attach user details to the socket object
    socket.userDetails = { ...user, role, deviceId, isAgent: ['admin', 'agent', 'support'].includes(role.toLowerCase()) };
    return next();
  } catch (err) {
    return next(new Error('Access denied. Invalid token.'));
  }
}
export const listen = async (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Middleware for authentication and user verification
  io.use(socketAuth);

  let onlineUsers = []; // Track online users
  let activeSessions = []; // Track active chat sessions

  const locationNamespace = io.of('/location');
  locationNamespace.use(socketAuth);

  locationNamespace.on('connection', (socket) => {
    console.log('New client connected to /location namespace:', socket.id);

    // Listener for location updates
    socket.on('location-trail', async (data) => {
      try {
        const { userId, longitude, latitude } = data;

        if (!userId || !longitude || !latitude) {
          console.error('Invalid data received for location trail:', data);
          socket.emit('location-trail-ack', {
            status: 'error',
            message: 'Invalid data format. All fields are required.',
          });
          return;
        }

        // Save location data to MongoDB
        const locationTrail = new LocationTrail({
          userId,
          longitude,
          latitude,
          timestamp: new Date().toISOString(),
        });

        await locationTrail.save();
        console.log('Location trail saved:', locationTrail);

        // Send acknowledgment back to the client
        socket.emit('location-trail-ack', { status: 'success' });
      } catch (err) {
        console.error('Error saving location trail:', err);
        socket.emit('location-trail-ack', {
          status: 'error',
          message: 'Failed to save location trail.',
        });
      }
    });

    // Handle client disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected from /location namespace:', socket.id);
    });
  });

  io.on('connection', (socket) => {
    const userDetails = socket.userDetails;
    const { _doc: { _id: userId }, isAgent } = userDetails

    // Add the user to the list of online users
    if (!isAgent) {
      const user = { 
        userId: userDetails._doc._id,
        firstName: userDetails._doc.firstName,
        lastName: userDetails._doc.lastName,
        // support: userDetails._doc.support,
      }

      
      if (!onlineUsers.find(user => user.userId !== userDetails._doc._id)) {
        onlineUsers.push(user);
      }

      socket.broadcast.emit(socketEvents.USER_ONLINE, user );
    }

    // console.log(userDetails)

    console.log(`User ${userId} connected as role: ${isAgent ? 'Agent' : 'User'}`);

  
    // Agents receive active sessions and online users
    if (isAgent) {
      socket.broadcast.emit(socketEvents.ALL_ACTIVE_SESSIONS, activeSessions);
      socket.broadcast.emit(socketEvents.ALL_ONLINE_USERS, onlineUsers);
    }

    // console.log(onlineUsers)

    // Handle session creation
    socket.on(socketEvents.CREATE_SESSION, async ({ sessionType, vehicle, repairRef, role }) => {
      const sessionId = uuid();

      try {
        // Check if dispute session exists for this repairRef
        if (sessionType === 'Dispute' && repairRef) {
          const existingSession = await ChatSession.findOne({ 
            $or: [
              { 'messages.senderId': userId },
              { documentRef: repairRef }
            ],
            vehicle,
            isClosed: false
          });
          if (existingSession) return socket.emit('error', { message: `An open session already exists for this ${sessionType}` });
        }

        // Create and persist the session
        const newSession = await ChatSession.create({ sessionId, sessionType, documentRef: repairRef, vehicle });
        activeSessions.push(newSession);
        socket.join(newSession.sessionId);

        // Add sessionId to the user's support array
        let user;
        switch (role) {
          case 'user':
            user = await User.findByIdAndUpdate(
              userId,
              { $push: { support: newSession.sessionId } },
              { new: true }
            );
            break;
          case 'engineer':
            user = await Engineer.findByIdAndUpdate(
              userId,
              { $push: { support: newSession.sessionId } },
              { new: true }
            );
            break;
          case 'merchant':
            user = await Merchant.findByIdAndUpdate(
              userId,
              { $push: { support: newSession.sessionId } },
              { new: true }
            );
            break;
          default:
            return socket.emit('error', { message: 'Invalid user role' });
        }

        if (!user) return socket.emit('error', { message: 'User not found' });

        // Update repair ticket if dispute
        if (sessionType === 'Dispute' && repairRef) {
          const dispute = await RepairTicket.findOne({repairRef });
          if (!dispute) return socket.emit('error', { message: 'Repair ticket not found' });

          dispute.isDisputed = true;
          dispute.disputeId = sessionId;
          await dispute.save();
        }

        // Notify session creation
        console.log('====>', newSession)
        socket.broadcast.emit(socketEvents.SESSION_CREATED, newSession);
      } catch (error) {
        console.error('Error creating session:', error);
        socket.emit('error', { message: 'Failed to create session' });
      }
    });

    socket.on(socketEvents.ASSIGN_TICKET, async ({ sessionId, agentId }) => {
      try {
        const session = await ChatSession.findOne({ sessionId });
        if (!session) {
          return socket.emit('error', { message: 'Session not found' });
        }

        // Assign the ticket to the specified agent
        session.assignedAgent = agentId;
        await session.save();

        // Notify the agent about the new assignment
        socket.to(agentId).emit(socketEvents.TICKET_ASSIGNED, { sessionId, message: 'You have been assigned a new ticket.' });
        console.log(`Ticket ${sessionId} assigned to agent ${agentId}`);
      } catch (error) {
        console.error('Error assigning ticket:', error);
        socket.emit('error', { message: 'Failed to assign ticket' });
      }
    });

    // Join existing chat session
    socket.on(socketEvents.JOIN, async ({ sessionId }) => {
      console.log('= User Joined.....')
      const existingSession = await ChatSession.findOne({ 
        sessionId,
        isClosed: false
      });

      if (!existingSession) {
        return socket.emit('error', { message: 'Session not found' });
      }

      socket.join(sessionId);
      socket.emit(socketEvents.LOAD_TICKET, existingSession);
      
      // Add the joined session to active tickets
      socket.broadcast.emit(socketEvents.SESSION_CREATED, existingSession);
      console.log(`User ${userId} joined session: ${sessionId}`);
    });

    // Handle agent assignment to ticket
    socket.on(socketEvents.AGENT_ASSIGNED_TO_SESSION, async ({sessionId}) => {
      if (!isAgent) return;

      const existingSession = await ChatSession.findOne({ 
        sessionId,
        isClosed: false
      });

      if (!existingSession) {
        return socket.emit('error', { message: 'Session not found' });
      }

      if (!existingSession.isAssigned) {
        // Update the session with agent details
        existingSession.agent.push({
          id: userDetails._doc._id,
          firstName: userDetails._doc.firstName,
          lastName: userDetails._doc.lastName,
        });
        existingSession.isAssigned = true;
        await existingSession.save();
      }

      socket.join(sessionId);
      socket.emit(socketEvents.LOAD_TICKET, existingSession);

      // Notify clients about agent assignment
      socket.emit(socketEvents.AGENT_ASSIGNED_TO_SESSION, existingSession);
      activeSessions = activeSessions.filter(session => session !== sessionId);
      io.emit(socketEvents.ALL_ACTIVE_SESSIONS, activeSessions);
      // Notify everyone in the session that an agent has joined
      io.to(sessionId).emit(socketEvents.AGENT_STATUS, {
        sessionId,
        agentId: userId,
        agentName: `${userDetails._doc.firstName} ${userDetails._doc.lastName}`,
        status: 'online'
      });

    });

    // Handle agent joining a session
    socket.on(socketEvents.AGENT_JOIN_SESSION, async ({sessionId}) => {
      if (!isAgent) return;

      const existingSession = await ChatSession.findOne({ 
        sessionId,
        isClosed: false
      });

      if (!existingSession) {
        return socket.emit('error', { message: 'Session not found' });
      }

      socket.join(sessionId);
      socket.emit(socketEvents.LOAD_TICKET, existingSession);

      // Notify everyone in the session that an agent has joined
      io.to(sessionId).emit(socketEvents.AGENT_STATUS, {
        sessionId,
        agentId: userId,
        agentName: `${userDetails._doc.firstName} ${userDetails._doc.lastName}`,
        status: 'online'
      });

      console.log(`Agent ${userId} joined session: ${sessionId}`);
    });

    // Handle message sending

    socket.on(socketEvents.USER_TYPING, ({ sessionId, isTyping, userName }) => {
      // Emit typing status directly using the same event
      socket.to(sessionId).emit(socketEvents.USER_TYPING, { 
        userId,
        userName,
        isTyping,
        sessionId
      });
    });
    socket.on(socketEvents.MESSAGE_SENT, async ({ sessionId, senderId, senderName, message }) => {
      try {
        console.log('user data =---->',  sessionId, senderId, senderName, message)
        const session = await ChatSession.findOneAndUpdate(
          { sessionId },
          { $push: { messages: { senderId, senderName, content: message, _id:  uuid() } } },
          { new: true } // Return the updated document
        );

        if (!session) {
          console.error('Session not found for sessionId:', sessionId);
          return socket.emit('error', { message: 'Session not found' });
        }

        console.log('Session found ...', session)
        // Get the last message sent
        const lastMessage = session.messages[session.messages.length - 1];
        if (lastMessage) {
          console.log('Last message saved:', lastMessage);
        } else {
          console.log('No messages found in the session.');
        }

        console.log('---- tell agent message sent ', session)

        // Emit the saved message directly instead of wrapping it in another object
        io.to(sessionId).emit(socketEvents.NEW_MESSAGE, session);
        console.log('message sent....', session)
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('error', { message: 'Message could not be delivered' });
      }
    });

    // Handle message status updates
    const updateMessageStatusHandler = async (data, status) => {
      const { messageId } = data;
      try {
        await updateMessageStatus(messageId, status);
        console.log(`Message ${status}: ${messageId}`);
        io.emit(socketEvents[`MESSAGE_${status.toUpperCase()}`], { messageId });
      } catch (error) {
        console.error(`Error updating message ${status}:`, error);
      }
    };
    socket.on(socketEvents.MESSAGE_DELIVERED, (data) => updateMessageStatusHandler(data, 'delivered'));
    socket.on(socketEvents.MESSAGE_READ, (data) => updateMessageStatusHandler(data, 'read'));

    // Handle typing notifications
    socket.on(socketEvents.TYPING, ({ sessionId, isTyping }) => {
      socket.to(sessionId).emit(socketEvents.USER_TYPING, { userId, isTyping });
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      onlineUsers = onlineUsers.filter(user => user.userId !== userId);
      socket.emit(socketEvents.USER_OFFLINE, { userId });

      socket.emit(socketEvents.ALL_ONLINE_USERS, onlineUsers);

      // Remove the user from active sessions
      // activeSessions.forEach((users, sessionId) => {
      //   users.delete(userId);
      //   if (users.size === 0) activeSessions.delete(sessionId);
      // });
      console.log(`User ${userId} disconnected`);

      // If the disconnected user was an agent, notify their sessions
      if (isAgent) {
        // Get all sessions this agent was part of
        activeSessions.forEach((users, sessionId) => {
          if (users.has(userId)) {
            io.to(sessionId).emit(socketEvents.AGENT_STATUS, {
              sessionId,
              agentId: userId,
              agentName: `${userDetails._doc.firstName} ${userDetails._doc.lastName}`,
              status: 'offline'
            });
          }
        });
      }
    });

    // Function to send message to a room (external access)
    socket.sendMessageToRoom = async (sessionId, senderName, content, messageId) => {
      try {
        const session = await ChatSession.findOneAndUpdate(
          { sessionId },
          { $push: { messages: { senderId: userId, senderName, content, _id: messageId } } },
          { new: true }
        );
        if (!session) return console.error('Chat session not found');

        io.to(sessionId).emit(socketEvents.NEW_MESSAGE, { senderName, content, messageId });
      } catch (error) {
        console.error('Error sending message to room:', error);
      }
    };
  });

  return io;
};

export default { listen };
