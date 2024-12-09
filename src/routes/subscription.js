const express = require('express');
const router = express.Router();
const Subscription = require('../models/subscription');





// Create subscription
router.post('/', async (req, res) => {
  try {
    const { name, amount, cycle } = req.body;
    const subscription = new Subscription({ name, amount, cycle });
    await subscription.save();
    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update subscription
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, cycle } = req.body;
    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { name, amount, cycle },
      { new: true }
    );
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// / Get all subscriptions
router.get('/', async (req, res) => {
  try {
    const subscriptions = await Subscription.find();

    // Map the required fields (id, name, amount)
    const mappedSubscriptions = subscriptions.map(subscription => ({
      id: subscription._id,
      name: subscription.name,
      cycle: subscription.cycle,
      amount: subscription.amount,
      numberOfCars: subscription.numberOfCars,
      description: subscription.description,
      status: subscription.status,
    }));

    res.json(mappedSubscriptions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;