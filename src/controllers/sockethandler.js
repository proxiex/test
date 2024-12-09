// sockethandler.js
const { io } = require('../server'); 

const activeSocketSessions = new Map(); // Map to store active socket sessions

// Function to check if a socket session exists
function isSocketSessionExists(sessionId) {
  return activeSocketSessions.has(sessionId);
}

// Function to add or update a socket session
function addOrUpdateSocketSession(sessionId, userId, socketId) {
  if (isSocketSessionExists(sessionId)) {
    // Update the existing session
    const session = activeSocketSessions.get(sessionId);
    session.userId = userId;
    session.socketId = socketId;
    activeSocketSessions.set(sessionId, session);
    console.log('New socket session creted')
    console.log(`The active session:  ${activeSocketSessions}`)

  } else {
    // Create a new session
    activeSocketSessions.set(sessionId, { userId, socketId });
    console.log('Socket session Updated')

  }
}

// Function to remove a socket session
function removeSocketSession(socketId) {
  activeSocketSessions.forEach((session, sessionId) => {
    if (session.socketId === socketId) {
      activeSocketSessions.delete(sessionId);
    }
  });
}


// Function to send a message to socketIds in a session
function sendMessageToSession(sessionId, messageData) {

  console.log(`sessionId: ${sessionId} and message ${messageData}`)
  
  // Get the socketIds associated with the sessionId
  const session = activeSocketSessions.get(sessionId);

  if (!session) {
    console.error(`No active socket session found for sessionId: ${sessionId}`);
    return;
  }

  // Emit the message to the socketIds in the session
  // req.app.get('io').to(session.socketId).emit('newMessage', messageData);
  io.to(session.socketId).emit('newMessage', messageData);
}


module.exports = { isSocketSessionExists, addOrUpdateSocketSession, removeSocketSession, sendMessageToSession };
