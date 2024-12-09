const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User  = require('../models/user');
const Agent  = require('../models/agent');
const Engineer  = require('../models/engineer');
const Merchant  = require('../models/merchant');
const ServiceCenter = require('../models/serviceCenter');
const TowService = require('../models/towservice');
const DocumentCenter = require('../models/documentCenter');
// const { app, io, server } = require('../server'); // 


require('dotenv').config();



// Middleware to verify JWT token with deviceId requirement
const verifyToken = async (req, res, next) => {
  const token = req.header('authorization');
  const deviceId = req.header('deviceid');
  const role = req.header('role'); // Add a new header for role

  if (!token || !deviceId || !role) {
    return res.status(401).json({ error: 'API: Access denied. Token, Device-Id, or Role not provided.' });
  }

  try {
    // Remove 'Bearer ' prefix if present
    const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);

    const roleModelMap = {
      'admin': Agent,
      'agent': Agent,
      'support': Agent,
      'deliveryAgent': Agent,
      'user': User,
      'merchant': Merchant,
      'engineer': Engineer,
      'servicecenter': ServiceCenter,
      'towservice': TowService, 
      'documentcenter': DocumentCenter,


    };

    const Model = roleModelMap[role.toLowerCase()];
    if (!Model) {
      return res.status(403).json({ error: 'Access denied. Invalid role.' });
    }

    const user = await Model.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.status === 'deactivated') {
      return res.status(470).json({
        code: 'USER_DEACTIVATED',
        message: 'This user account has been deactivated.'
      });
    }

    if (!user.deviceId) {
      return res.status(403).json({ error: 'Access denied. Device not registered.' });
    }

    if (user.deviceId !== deviceId) {
      return res.status(403).json({ error: 'Access denied. Invalid Device-Id.' });
    }

    req.user = { ...decoded, role, deviceId };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access denied. Token has expired.' });
    }
    console.error('Token verification error:', err);
    return res.status(403).json({ error: 'Access denied. Invalid token.' });
  }
};





const authRoutes = require('../routes/auth');
const webhookRoutes = require('../routes/webhooks');
const userRoutes = require('../routes/user');
const agentRoutes = require('../routes/agent');
const chatRoutes = require('../routes/chat');
const engineerRoutes = require('../routes/engineer');
const vehicleRoutes = require('../routes/vehicle');
const repairTicketRoutes = require('../routes/repair');
const transactionRoutes = require('../routes/transaction');
const subRoutes = require('../routes/subscription');
const bookingRoutes = require('../routes/booking');
const carRoutes = require('../routes/car');
const insuranceRoutes = require('../routes/insurancecover');
const productRoutes = require('../routes/product');
const deliveryRoutes = require('../routes/delivery');
const orderyRoutes = require('../routes/order');
const merchantRoute = require('../routes/merchant');
const documentRoute = require('../routes/document');
const identificationRoute = require('../routes/identification');
const imageuploadRoute = require('../routes/imageupload');
const servicesRoute = require('../routes/service');
const affiliateRoute = require('../routes/affiliate');

const logisticsRoute = require('../routes/logistics');
const adminRoute = require('../routes/admin');
const registerRoute = require('../routes/resgister');



router.use('/auth', authRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/affiliates', affiliateRoute);
router.use('/users', verifyToken, userRoutes);
router.use('/agents', verifyToken, agentRoutes);
router.use('/sessions', verifyToken, chatRoutes);  
router.use('/engineers', verifyToken, engineerRoutes);
router.use('/vehicles', verifyToken, vehicleRoutes);
router.use('/repairs', verifyToken, repairTicketRoutes);
router.use('/transactions', verifyToken, transactionRoutes);
router.use('/subdata', verifyToken, subRoutes);
router.use('/bookings', verifyToken, bookingRoutes);
router.use('/cars', verifyToken, carRoutes);
router.use('/insurancecover', verifyToken, insuranceRoutes);
router.use('/products', verifyToken, productRoutes);
router.use('/deliveries', verifyToken, deliveryRoutes);
router.use('/orders', verifyToken, orderyRoutes);
router.use('/merchants', verifyToken, merchantRoute);
router.use('/documents', verifyToken, documentRoute);
router.use('/identifications', verifyToken, identificationRoute);
router.use('/imageuploads', verifyToken, imageuploadRoute);
router.use('/services', verifyToken, servicesRoute);
router.use('/logistics', logisticsRoute);
router.use('/admin', verifyToken, adminRoute);
router.use('/register', verifyToken, registerRoute);

module.exports = router;
