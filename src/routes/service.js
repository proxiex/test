const express = require('express');
const router = express.Router();
const { ServiceNumber, EngineerService, AppService } = require('../models/service');
const EngineercategorySubService = require('../models/engineercategorySubService');
const Subscription = require('../models/subscription');
const Announcement = require('../models/announcement');
const AllowedLocation = require('../models/allowedLocation');
const AdBanner = require('../models/advertBanner');

// Fetch all services
//get service categories
router.get('/', async (req, res) => {
    try {
      // Fetch all data from the ServiceCategory collection
      const engineercategorySubService = await EngineercategorySubService.find().exec();
      const servicesNumbers = await ServiceNumber.find();
      const appservices = await AppService.find();
      const engineerServices = await EngineerService.find({status: 'active'});
      const subscriptionData = await Subscription.find({status: 'active'});
      const allowedLocations = await AllowedLocation.find({status: 'active'});
      const announcements = await Announcement.find({status: 'active'});
      const adBanners = await AdBanner.find({status: 'active'});

      res.status(200).json({
        success: true,
        message: 'Service categories fetched successfully',
        engineercategorySubService: engineercategorySubService,
        appservices: appservices,
        servicesNumbers: servicesNumbers,
        engineerServices: engineerServices,
        subscriptionData: subscriptionData,
        allowedLocations: allowedLocations,
        announcements: announcements,
        adBanners: adBanners
      });
    } catch (error) {
      console.error('Error fetching service categories:', error);
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: error.message, // You can include the specific error message if needed
      });
    }
  });
  
  
  

module.exports = router;