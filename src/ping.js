const http = require('http');

// Function to ping the server and log the date and time
const pingServer = () => {
  const currentTime = new Date().toLocaleString();

  const options = {
    hostname: 'localhost',
    port: 3800, // Replace with your server's port
    path: '/pinged', // Use the '/pinged' route
    method: 'GET',
  };

  const req = http.request(options, (res) => {
    console.log(`Ping at ${currentTime}: Status ${res.statusCode}`);
    res.on('data', (chunk) => {
      console.log('Response:', chunk.toString());
    });
  });

  req.on('error', (error) => {
    console.error(`Error pinging server at ${currentTime}:`, error.message);
  });

  req.end();
};

// Function to schedule pinging at intervals
const schedulePinging = () => {
  const interval = 10 * 60 * 1000; // 10 seconds in milliseconds

  setInterval(pingServer, interval);
};

// Start pinging
schedulePinging();
