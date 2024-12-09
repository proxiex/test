const User = require("../models/user");
const request = require('request');



const addIdentity = async (req, res) => {
    try {
      const { userId } = req.params;
      const identityData = req.body;
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      if (user.identity) {
        return res.status(400).json({ error: 'Identity already exists. Use update to modify the identity.' });
      }
  
      user.identity = identityData;
      await user.save();
  
      res.status(201).json({ message: 'Identity added successfully', identity: user.identity });
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while adding identity', details: error.message });
    }
  };

  


  const modifyIdentity = async (req, res) => {
    try {
      const { userId } = req.params;
      const identityData = req.body;
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      if (!user.identity) {
        return res.status(400).json({ error: 'No identity found. Use add to create an identity.' });
      }
  
      user.identity = { ...user.identity.toObject(), ...identityData };
      await user.save();
  
      res.status(200).json({ message: 'Identity modified successfully', identity: user.identity });
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while modifying identity', details: error.message });
    }
  };
  

const deleteIdentity = async (req, res) => {
    try {
      const { userId } = req.params;
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      if (!user.identity) {
        return res.status(400).json({ error: 'No identity found to delete.' });
      }
  
      user.identity = undefined; // Or use `null` to explicitly set it as null
      await user.save();
  
      res.status(200).json({ message: 'Identity deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while deleting identity', details: error.message });
    }
  };
  

module.exports = { addIdentity, modifyIdentity, deleteIdentity, };
