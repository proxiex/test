const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Order = require('../models/order');
const DeliveryOption = require('../models/deliveryoption');






// Route to add a new delivery address for a user
router.post('/user/:userId/adddeliveryaddress', async (req, res) => {
 
      const { userId } = req.params;
      const { address } = req.body;
  
      if (!address || typeof address !== 'object') {
          return res.status(400).json({ error: 'Valid address object is required' });
      }
  
      try {
          // Find the user by ID
          const user = await User.findById(userId);
          if (!user) {
              return res.status(404).json({ error: 'User not found' });
          }
  
          // Add the new address to the user's deliveryAddresses array
          user.deliveryAddress.push(address);
  
          // Save the updated user
          await user.save();
          res.status(200).json({ message: 'Delivery address added successfully' });
      } catch (error) {
          res.status(500).json({ error: 'Failed to add delivery address', details: error.message });
      }
  });
  
  // Route to get all delivery addresses for a user
  router.get('/user/:userId/getalldeliveryaddresses', async (req, res) => {
    const { userId } = req.params;
    try {
        // Find the user by ID and retrieve their delivery addresses
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
      
        const deliveryOptions = await DeliveryOption.find({status: "active"});
        const deliveryAddresses = user.deliveryAddress;
  
        res.json({ deliveryAddresses: deliveryAddresses, deliveryOptions });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch delivery addresses' });
    }
  });
  
  
  // Route to delete a delivery address for a user by address
  
  router.delete('/user/:userId/deletedeliveryaddress/:addressId', async (req, res) => {
    const { userId, addressId } = req.params;
  
  
    try {
      // Find the user by ID
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Check if the address exists in the user's deliveryAddresses array
      const addressIndex = user.deliveryAddress.findIndex(addr => addr._id.toString() === addressId);
      if (addressIndex === -1) {
        return res.status(404).json({ error: 'Address not found' });
      }
  
      // Remove the address from the user's deliveryAddresses array
      user.deliveryAddress.splice(addressIndex, 1);
  
      // Save the updated user
      await user.save();
  
      res.json({ message: 'Delivery address deleted successfully' });
    } catch (error) {
      console.error('Error deleting delivery address:', error);
      res.status(500).json({ error: 'Failed to delete delivery address' });
    }
  });
  
  
  
  router.post('/orders/:orderId/review', async (req, res) => {
    const { orderId } = req.params;
    const { rating, review, userId, reviewAddedByFirstName, reviewAddedByLastName } = req.body;
  
    try {
      // Find the order by ID
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      // Update the order with the review data
      order.reviewAdded = true;
      order.rating = rating;
      order.review = review;
      order.reviewAddedAt = Date.now;
      order.userId = userId;
      order.reviewAddedByFirstName = reviewAddedByFirstName;
      order.reviewAddedByLastName = reviewAddedByLastName;
  
      // Save the updated order
      await order.save();
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add review to order' });
    }
  });
  
  
  
  // Route to add a new delivery option
  router.post('deliveryOption', async (req, res) => {
    const { type, location, amount, duration } = req.body;
  
    try {
      // Create a new delivery option document
      const newDeliveryOption = await DeliveryOption.create({
        type,
        location,
        amount,
        duration
      });
  
      res.status(200).json(newDeliveryOption);
    } catch (error) {
      console.error('Error adding delivery option:', error);
      res.status(500).json({ error: 'Failed to add delivery option' });
    }
  });
  
  
  
  
  // Route to get all delivery options
  router.get('/deliveryOptions', async (req, res) => {
    try {
      // Fetch all delivery options from the database
      const deliveryOptions = await DeliveryOption.find({status: "active"});
      res.status(200).json(deliveryOptions);
    } catch (error) {
      console.error('Error fetching delivery options:', error);
      res.status(500).json({ error: 'Failed to fetch delivery options' });
    }
  });
  
  
  
  
  router.delete('/deliveryOption/:optionId', async (req, res) => {
    const { optionId } = req.params;
  
    try {
      // Find and delete the delivery option by ID
      const deletedOption = await DeliveryOption.findByIdAndDelete(optionId);
      if (!deletedOption) {
        return res.status(404).json({ error: 'Delivery option not found' });
      }
  
      res.json({ message: 'Delivery option deleted successfully' });
    } catch (error) {
      console.error('Error deleting delivery option:', error);
      res.status(500).json({ error: 'Failed to delete delivery option' });
    }
  });
  
  


module.exports = router;
