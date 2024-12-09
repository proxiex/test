const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/user');
const Transaction = require('../models/transaction');
const Engineer = require('../models/engineer');
const Booking = require('../models/booking');
const Location = require('../models/location');


const { isValidObjectId } = require('mongoose');




//booking endpoint
router.post('/addbooking', async (req, res) => {
  try {
    // Extract data from the request body
    const {
      bookingId,
      userData,
      engineerData,
      bookingType,
      amount,
      transactionId,
      bookingDate,
      serviceType,
      category,
      vehicleData
    } = req.body;

    // Check if booking already exists
    const existingBooking = await Booking.findById(bookingId);
    if (existingBooking) {
      return res.status(409).json({ message: 'Booking already exists', booking: existingBooking });
    }

    // Create a new Booking instance
    const newBooking = new Booking({
      _id: bookingId,
      user: userData,
      engineer: engineerData,
      status: 'Active',
      bookingType,
      amount,
      transactionId,
      bookingDate,
      serviceType,
      category,
      vehicle: vehicleData
    });

    // Save the booking to the database
    const savedBooking = await newBooking.save();

    // Update the engineer profile with the booking ID
    const engineer = await Engineer.findById(engineerData.id);

    if (!engineer) {
      return res.status(404).json({ message: 'Engineer not found.' });
    }

    // Add the booking ID to the bookings array
    engineer.bookings.push(savedBooking._id.toString());

    // Save the updated engineer profile
    await engineer.save();

    res.status(201).json({message: 'Booking added successfully', booking: savedBooking});
  } catch (error) {
    console.error('Error saving booking:', error);

    // Provide more detailed error information
    res.status(500).json({ 
      message: 'Failed to save booking.',
      error: error.message,
      stack: error.stack
    });
  }
});








// delete booking
router.delete('/deletebooking', async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Check if the provided bookingId is valid
    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({ message: 'Invalid booking ID.', bookingId });
    }

    // Find the booking by ID
    const booking = await Booking.findById(bookingId);

    // Check if the booking exists
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.', bookingId });
    }

    // Find the associated engineer
    const engineer = await Engineer.findById(booking.engineerId);

    if (!engineer) {
      return res.status(404).json({ message: 'Engineer not found.', bookingId });
    }

    // Remove the booking ID from the engineer's profile bookings array
    engineer.bookings = engineer.bookings.filter((id) => id.toString() !== bookingId);

    // Save the updated engineer profile
    await engineer.save();

    // Delete the booking
    await Booking.deleteOne({ _id: bookingId });

    res.status(200).json({ message: 'Booking deleted successfully.', bookingId });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Failed to delete booking.', bookingId });
  }
});



router.post('/cancel', async (req, res) => {
  try {
    const { bookingId, reason } = req.body;

    console.log('bookingCanceling started');

    // Find the booking using bookingId from the Booking collection
    const booking = await Booking.findOne({ _id: bookingId });

    console.log('Booking:', booking);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found', code: 404 });
    }

    const { engineerId, userId, amount } = booking;

    if (booking.bookingType === 'FOS') {
      // Find the user using userId from the User collection
      const user = await User.findOne({ id: userId });

      if (!user) {
        return res.status(404).json({ message: 'User not found', code: 404 });
      }

      // Save the extracted information to the transactions collection
      const transaction = new Transaction({
        status: 'Initialized',
        userId: userId,
        engineerId: engineerId,
        amount: amount,
        bookingId: bookingId,
        paymentfor: 'Booking Cancellation',
        narration: `Cancellation for booking ${bookingId}`,
      });

      await transaction.save();

      const transactionId = transaction._id;

      await User.findByIdAndUpdate(userId, { $push: { transactions: transactionId } });

    }

    // Update reason and status
    booking.reason = reason;
    booking.status = 'Cancel';

    // Save the updated booking to the Booking collection
    await booking.save();

    console.log('Cancellation successful');

    return res.json({ message: 'Cancellation successful', updatedBooking: booking, code: 200 });
  } catch (error) {
    console.error('Error during cancellation:', error);
    return res.status(500).json({ message: 'Internal Server Error', code: 500 });
  }
});






  function formatRoute(route) {
    return route
      .split(',')
      .map((location) => location.trim())
      .sort()
      .join(' - ');
  }
  
  // Endpoint to aggregate and fetch records by type and optionally route
  router.get('/findlocationlogisticcots', async (req, res) => {
    try {
      const { type, route } = req.query; // Use req.query for GET request parameters
  
      if (!type) {
        return res.status(400).json({ message: 'Type parameter is required' });
      }
  
      let matchCondition = { type: type };
  
      if (route !== 'all') {
        // Format the route by splitting, sorting, and joining it back
        const formattedRoute = formatRoute(route);
        matchCondition.route = formattedRoute;
      }
  
      // Aggregate locations by type and optionally route
      const aggregatedLocations = await Location.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: '$route',
            distance: { $first: '$distance' },
            transport: { $first: '$transport' },
            minCost: { $first: '$minCost' },
            maxCost: { $first: '$maxCost' },
          },
        },
        {
          $project: {
            _id: 0,
            route: '$_id',
            distance: 1,
            transport: 1,
            minCost: 1,
            maxCost: 1,
          },
        },
      ]);
  
      if (aggregatedLocations.length > 0) {
        res.status(200).json({ message: 'Aggregated locations fetched successfully', data: aggregatedLocations });
      } else {
        res.status(404).json({ message: 'No locations found for the specified type and route' });
      }
    } catch (error) {
      console.error('Error fetching aggregated locations:', error);
      res.status(500).json({ message: 'Failed to fetch aggregated locations.' });
    }
  });






// Add location
router.post('/addlocation', async (req, res) => {
  try {
    const { route, distance, transport, minCost, maxCost } = req.body;

    // Format the route string
    const formattedRoute = formatRoute(route);

    // Check if the route already exists in the database
    const existingLocation = await Location.findOne({ route: formattedRoute });

    if (existingLocation) {
      // Route already exists, return it
      res.status(200).json({ message: 'Route exists', data: existingLocation });
    } else {
      // Route does not exist, add it to the database
      const newLocation = new Location({
        route: formattedRoute,
        type:
        distance,
        transport,
        minCost,
        maxCost,
      });

      const savedLocation = await newLocation.save();

      res.status(201).json({ message: 'Route added', data: savedLocation });
    }
  } catch (error) {
    console.error('Error saving or checking route:', error);
    res.status(500).json({ message: 'Failed to save or check route.' });
  }
});


// Update location
router.put('/updatelocation', async (req, res) => {
  try {
    const { route, distance, transport, minCost, maxCost } = req.body;

    // Format the route string
    const formattedRoute = formatRoute(route);

    // Find the route in the database
    const foundLocation = await Location.findOne({ route: formattedRoute });

    if (foundLocation) {
      // Update the fields
      foundLocation.distance = distance;
      foundLocation.transport = transport;
      foundLocation.minCost = minCost;
      foundLocation.maxCost = maxCost;

      const updatedLocation = await foundLocation.save();

      res.status(200).json({ message: 'Route updated successfully', data: updatedLocation });
    } else {
      res.status(404).json({ message: 'Route not found' });
    }
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({ message: 'Failed to update route.' });
  }
});


// Delete location
router.delete('/deletelocation', async (req, res) => {
  try {
    const { route } = req.body;

    // Format the route string
    const formattedRoute = formatRoute(route);

    // Find the route in the database
    const foundLocation = await Location.findOne({ route: formattedRoute });

    if (foundLocation) {
      // Delete the route
      await foundLocation.remove();

      res.status(200).json({ message: 'Route deleted successfully' });
    } else {
      res.status(404).json({ message: 'Route not found' });
    }
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ message: 'Failed to delete route.' });
  }
});




module.exports = router;
