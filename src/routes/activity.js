// routes/activityRoutes.js
const express = require('express');
const Activity = require('../models/activityModel');

const router = express.Router();

// Endpoint to save activities to user profile and locally
router.post('/activities', async (req, res) => {
  const { userId, activities } = req.body;

  try {
    // Save activities to user profile
    // Assume user profile has an 'activities' field
    // const userProfile = await User.findByIdAndUpdate(userId, { $push: { activities } }, { new: true });

    // Save activities locally
    await Activity.insertMany(activities);

    res.status(200).json({ message: 'Activities saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Endpoint to delete an activity by activityId
router.delete('/activities/:activityId', async (req, res) => {
  const { activityId } = req.params;

  try {
    // Delete activity from user profile
    // Assume user profile has an 'activities' field
    const userProfile = await User.findOneAndUpdate(
      { 'activities.id': activityId },
      { $pull: { activities: { id: activityId } } },
      { new: true }
    );

    // Delete activity locally
    await Activity.deleteOne({ id: activityId });

    // if (userProfile) {
      res.status(200).json({ message: 'Activity deleted successfully' });
    // } else {
    //   res.status(404).json({ message: 'Activity not found' });
    // }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
