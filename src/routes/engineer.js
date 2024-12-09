const express = require('express');
const router = express.Router();
import { Client, GeocodingAddressComponentType, PlaceType2 } from '@googlemaps/google-maps-services-js';

const Engineer = require('../models/engineer');
const RepairTicket = require('../models/repair');
const Booking = require('../models/booking');
const User = require('../models/user');



router.get('/checkid/', async (req, res) => {
  const engineerId = req.body.engineerId;

  try {
    // Find a engineer with the given engineer ID
    const engineer = await Engineer.findById(engineerId);

    if (engineer) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking engineer ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/updateAllCoordinates', async (req, res) => {
  try {
    const engineers = await Engineer.find(); // Fetch all engineers
    const results = []; // Array to hold success messages

    const client = new Client();

    for (const engineer of engineers) {
      const address = engineer.address;

      // Call Google Maps Geocoding API to get coordinates
      console.log('Getting coords...', engineers.length)
      const response = await client.geocode({
        params: {
          address: `${address.building} ${address.street} ${address.area} ${address.lga} ${address.state}`,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.status === 'OK') {
        const location = response.data.results[0].geometry.location;
        console.log('Updating records...', engineer)
        engineer.address.location = { type: 'Point', coordinates: [location.lng, location.lat] };
        console.log('Updating records...', engineer)
        await engineer.save();

        results.push({ engineerId: engineer._id, address: engineer.address, message: 'Coordinates updated successfully' });
      } else {
        results.push({ engineerId: engineer._id, message: 'Unable to get coordinates for the provided address' });
      }
    }

    res.status(200).json({
      message: 'Coordinates update process completed',
      results: results
    });
  } catch (error) {
    console.error('Error updating coordinates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/getengineers/:userId', async (req, res) => {
  try {
    const { make, availability, category, state, latitude, longitude } = req.body; // Expect user location in body
    const userId = req.params.userId;

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Build the filter for additional conditions
    const filter = { status: 'active' };

    if (category) filter.category = category;
    if (availability) filter.availability = { $regex: availability, $options: 'i' };
    if (make) filter.make = { $in: [make] };
    if (state) filter['address.state'] = { $regex: new RegExp(state, 'i') };

    // GeoNear aggregation with additional filters
    const engineers = await Engineer.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            // coordinates: [3.323, 6.660]
            coordinates: [Number(longitude), Number(latitude)],
          },
          distanceField: 'proximity',
          spherical: true,
          query: { 'address.location': { $exists: true }, ...filter }, // Ensure location exists
        },
      },
      // { $limit: 5 },
      {
        $lookup: {
          from: 'repairTickets',
          localField: 'repairRefs',
          foreignField: 'repairRef',
          as: 'repairTickets',
        },
      },
      {
        $addFields: {
          totalRepairs: { $size: { $filter: { input: '$repairTickets', cond: { $eq: ['$$this.isCompleted', true] } } } },
          averageCommunication: {
            $cond: {
              if: { $gt: [{ $size: { $filter: { input: '$repairTickets', cond: { $eq: ['$$this.isCompleted', true] } } } }, 0] },
              then: {
                $avg: {
                  $map: {
                    input: { $filter: { input: '$repairTickets', cond: { $eq: ['$$this.isCompleted', true] } } },
                    as: 'ticket',
                    in: '$$ticket.communicationRating',
                  },
                },
              },
              else: 0,
            },
          },
          averageKnowledgeOfProblem: {
            $cond: {
              if: { $gt: [{ $size: { $filter: { input: '$repairTickets', cond: { $eq: ['$$this.isCompleted', true] } } } }, 0] },
              then: {
                $avg: {
                  $map: {
                    input: { $filter: { input: '$repairTickets', cond: { $eq: ['$$this.isCompleted', true] } } },
                    as: 'ticket',
                    in: '$$ticket.knowledgeOfProblem',
                  },
                },
              },
              else: 0,
            },
          },
        },
      },
      {
        $project: {
          repairTickets: 0, // Exclude raw repair ticket data
        },
      },
    ]);

    // Format the response
    const formattedEngineers = engineers.map((engineer) => ({
      engineerId: engineer._id,
      engineerImage: engineer.engineerImage,
      firstName: engineer.firstName,
      lastName: engineer.lastName,
      phoneNumber: engineer.phoneNumber,
      address: engineer.address,
      proximity: engineer.proximity / 1000, // Distance in kilometers
      totalRepairs: engineer.totalRepairs,
      averageCommunication: engineer.averageCommunication,
      averageKnowledgeOfProblem: engineer.averageKnowledgeOfProblem,
    }));

    res.status(200).json({
      message: 'Engineers fetched successfully',
      engineers: formattedEngineers,
      totalEngineers: engineers.length,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'An error occurred while fetching engineers',
      details: error.message,
    });
  }
});



// inQueue endpoint
router.post('/inqueue', async (req, res) => {
  try {
    const { engineerId } = req.body;

    // Check if the engineer exists
    const engineer = await Engineer.findById(engineerId);
    if (!engineer) {
      return res.status(404).json({ error: 'Engineer not found' });
    }

    // Get bookingIds from engineer.bookings
    const bookingIds = Array.isArray(engineer.bookings)
      ? engineer.bookings.map((booking) => booking.bookingId)
      : [];

    // Fetch bookings from bookings collection
    const bookings = await Booking.find({ bookingId: { $in: bookingIds } });

    // Count the bookings with status "Active"
    const inQueueCount = bookings.reduce(
      (count, booking) => (booking.status === 'Active' ? count + 1 : count),
      0
    );

    res.status(200).json({ inQueue: inQueueCount });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'An error occurred while fetching inQueue count',
      details: error.message,
    });
  }
});







// Get all engineers
router.get('/admin', async (req, res) => {
  try {
    const engineers = await Engineer.find(); // Retrieve all engineers from the database
    res.status(200).json(engineers);
  } catch (error) {
    res.status(500).json({ error: 'An error occurred while fetching engineers' });
  }
});

module.exports = router;
