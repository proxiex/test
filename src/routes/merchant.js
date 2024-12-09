const express = require('express');
const mongoose = require('mongoose');
const Merchant = require('../models/merchant'); // Adjust the path to where your Merchant model is located

const router = express.Router();

// Endpoint to fetch all merchants
router.get('/', async (req, res) => {
  try {
    const merchants = await Merchant.find();

    res.status(200).json({ message: 'All merchants', data: merchants });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//Fetch merchant profile 
router.get('/:merchantId', async (req, res) => {
  try {
    const merchantId = req.params.merchantId;

    if (!merchantId || !mongoose.Types.ObjectId.isValid(merchantId)) {
      return res.status(400).json({ error: 'Invalid merchantId' });
    }

    const merchant = await Merchant.findById(merchantId).select('-pin'); // Exclude the pin field

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    res.status(200).json({ message: 'Merchant Profile', data: merchant });
  } catch (error) {
    console.error('Error fetching merchant profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//add New account 

router.post('/addaccount', async (req, res) => {
  try {
    const { merchantId, recipient_code, bank_name, account_name, account_number } = req.body;

    // Input Validation
    if (!merchantId || !recipient_code || !bank_name || !account_name || !account_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if merchant exists
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Check if the account is already added
    if (merchant.paymentAccounts.some(acc => acc.account_number === account_number && acc.bank_name === bank_name)) {
      return res.status(400).json({ error: 'Payment account already exists' });
    }

    // Create new payment account object
    const newPaymentAccount = {
      recipient_code,
      bank_name,
      account_name,
      account_number,
      isDefault: false, // Initially set as not default
    };

    // Add payment account to merchant's paymentAccounts array
    merchant.paymentAccounts.push(newPaymentAccount);

    // Save the updated merchant
    const updatedMerchant = await merchant.save();

    res.status(201).json({
      message: 'Payment account added successfully',
      newPaymentAccount: newPaymentAccount
    });
  } catch (error) {
    console.error('Error adding payment account:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.delete('/deleteaccount/:merchantId/:accountId', async (req, res) => {
  const { merchantId, accountId } = req.params;

  try {
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      return res.status(404).send({ message: 'Merchant not found' });
    }

    const accountIndex = merchant.paymentAccounts.findIndex(
      (account) => account._id.toString() === accountId
    );

    if (accountIndex === -1) {
      return res.status(404).send({ message: 'Payment account not found' });
    }

    merchant.paymentAccounts.splice(accountIndex, 1);

    await merchant.save();

    res.status(200).send({ message: 'Payment account deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Server error' });
  }
});


router.patch('/updateaccount/:merchantId/:accountId', async (req, res) => {
  try {
    const { merchantId, accountId } = req.params;

    if (!merchantId || !accountId || !mongoose.Types.ObjectId.isValid(merchantId) || !mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json({ error: 'Invalid merchantId or accountId' });
    }

    // Update the merchant document directly in the database
    const updatedMerchant = await Merchant.findOneAndUpdate(
      { 
        _id: merchantId,
        'paymentAccounts._id': accountId 
      },
      {
        $set: {
          // Set all accounts to isDefault: false
          'paymentAccounts.$[elem].isDefault': false,
          // Then set the specified account to isDefault: true
          'paymentAccounts.$[accountToUpdate].isDefault': true
        }
      },
      {
        arrayFilters: [
          { 'elem.isDefault': true }, // Reset all existing default accounts
          { 'accountToUpdate._id': accountId } // Update the specified account
        ],
        new: true // Return the updated merchant document
      }
    );

    if (!updatedMerchant) {
      return res.status(404).json({ error: 'Merchant or payment account not found' });
    }

    res.status(200).json({ 
      message: 'Default payment account updated successfully',
      accountId: accountId
    });
  } catch (error) {
    console.error('Error updating default payment account:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;
