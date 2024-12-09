// config.js
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

const firebaseConfig = {
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

admin.initializeApp(firebaseConfig);

module.exports = {
  port: process.env.PORT || 3000,
  firebaseAdmin: admin,
};
