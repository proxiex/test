const express = require('express');
const router = express.Router();
const { default: ResponseLib } = require("../libs/Response.lib");
const LogisticsConfig = require("../models/config");

router.post('/config/logistics', async (req, res, next) => {
  try {
    const { engineer, delivery } = req.body;

    const data = await LogisticsConfig.create({ 
      engineer,
      delivery
    })

    return new ResponseLib(req, res).json({
      status: true,
      data
    })

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      message: 'An error occurred',
      details: error.message,
    });
  }
})



router.get('/config/logistics', async (req, res, next) => {
  try {
    const data = await LogisticsConfig.findOne();

    return new ResponseLib(req, res).json({
      status: true,
      data
    })

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      message: 'An error occurred',
      details: error.message,
    });
  }
})

router.put('/config/logistics/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { engineer, delivery } = req.body;

    const updatedData = await LogisticsConfig.findByIdAndUpdate(id, { 
      engineer,
      delivery
    }, { new: true });

    return new ResponseLib(req, res).json({
      status: true,
      data: updatedData
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      message: 'An error occurred',
      details: error.message,
    });
  }
});

router.delete('/config/logistics/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await LogisticsConfig.findByIdAndDelete(id);

    return new ResponseLib(req, res).json({
      status: true,
      message: 'Configuration deleted successfully'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      message: 'An error occurred',
      details: error.message,
    });
  }
})


router.post('/generate-access-token', async (req, res) => {
  try {
      // Exchange short-lived token for long-lived token
      const response = await axios.get(
          `https://graph.facebook.com/v17.0/oauth/access_token`, {
              params: {
                  grant_type: 'fb_exchange_token',
                  client_id: process.env.APP_ID,
                  client_secret: process.env.APP_SECRET,
                  fb_exchange_token: SHORT_LIVED_TOKEN
              }
          }
      );

      // Response with the long-lived token
      res.status(200).json({
          success: true,
          accessToken: response.data.access_token,
          expiresIn: response.data.expires_in, // Token expiration time in seconds
      });
  } catch (error) {
      console.error('Error generating access token:', error.response?.data || error.message);
      res.status(500).json({
          success: false,
          message: 'Failed to generate access token',
          error: error.response?.data || error.message,
      });
  }
});

module.exports = router;
