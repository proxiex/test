const { AssertionError } = require('assert');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const http = require('http');
const routes = require('./routes');
const { listen: socketListen } = require('./socket');

const httpContext = require('express-http-context')
const { v4: uuidv4 } = require('uuid');
const { default: ResponseLib } = require('./libs/Response.lib');
const { default: ErrorLib } = require('./libs/Error.lib');
const LoggerLib = require('./libs/Logger.lib');
const cors = require('cors');  // Add this line
const NewsLetterSubscription = require('./models/newslette');

const app = express();

const server = http.createServer(app);

require('dotenv').config();


const allowedOrigins = ['https://affiliate.myogamechanic.com', 'http://localhost:3000'];


app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(httpContext.middleware);

app.use((req, res, next) => {
  httpContext.set('request-id', uuidv4().toString());
  LoggerLib.log('API Request:', {
    url: req.url, method: req.method, request: req.body
  });
  next()
})

// MongoDB Connection
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    LoggerLib.log('Connected to MongoDB');
  } catch (error) {
    LoggerLib.error('MongoDB connection error:', error);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
}

connectToMongoDB();



try {
  app.use('/api/v1/', routes);
} catch (error) {
  LoggerLib.error('Error loading routes:', error);
  new ResponseLib(req, res).status(500).json({ error: 'Internal Server Error' });
}


app.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Assuming there's a Subscription model to handle subscriptions
  const existingSubscription = await NewsLetterSubscription.findOne({ email });

  if (existingSubscription) {
    return res.status(409).json({ message: 'Email already subscribed.' });
  }

  const newSubscription = new NewsLetterSubscription({
    email,
  });

  try {
    await newSubscription.save();
    res.status(200).json({ message: 'Subscription successful.' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'An error occurred while subscribing' });
  }
});

// Add this catch-all route
app.use((req, res) => {
  new ResponseLib(req, res).status(404).json({ message: 'Not Found' });
});

app.use((err, req, res, next) => {
  LoggerLib.error(typeof err);
  let message = 'Server Error', statusCode = 500;
  if (err instanceof ErrorLib) {
    message = err.message;
    statusCode = err.code;
  } else if (err instanceof AssertionError) {
    message = err.message;
    statusCode = 400;
  }
  new ResponseLib(req, res).status(statusCode).json({ message });
});

socketListen(server);
server.listen(process.env.PORT || 3800, () => {
  LoggerLib.log(`Server started on port ${server.address().port}`);
});

// Graceful Shutdown
process.on('SIGINT', () => {
  LoggerLib.log('Server shutting down gracefully...');
  server.close(() => {
    LoggerLib.log('Server shut down.');
    process.exit(0);
  });
});
