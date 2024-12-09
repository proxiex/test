const express = require('express');
const router = express.Router();
const Affiliate = require('../models/affiliate');
const Merchant = require('../models/merchant');
const Engineer = require('../models/engineer');



router.get('/getmerchantsandengineers', async (req, res) => {

  const referralCode = req.query.referralCode;  
  try {
    const merchants = await Merchant.find({referralCode});
    const engineers = await Engineer.find({referralCode});
    res.status(200).json({ merchants, engineers });
  } catch (error) {
    console.error('Error fetching merchants and engineers:', error);
    res.status(500).json({ error: 'An error occurred while fetching merchants and engineers' });
  }
});

module.exports = router;

