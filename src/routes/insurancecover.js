const express = require('express');
const { InsurancePartner, InsuranceCompany } = require('../models/insurancecover');
const DocumentPrice = require('../models/documentprice');
const router = express.Router();






// Create a new insurance company
router.post('/create', async (req, res) => {
  try {
    const allInsurancePartners = new InsurancePartner(req.body);
    await allInsurancePartners.save();
    res.status(201).json({ message:'Successfully added', allInsurancePartners});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// Gett all insurance Companies
router.get('/allcompanies', async (req, res) => {
  try {
    
    const allInsuranceCovers = await InsuranceCompany.find();
    const count = allInsuranceCovers.length;

// Respond with the list of companies and the count
      res.status(200).json({
        message:"Successfully fetched",
        count: count,
        data: allInsuranceCovers
      });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'An error occurred while fetching insurance covers',
      details: error.message,
    });
  }
});


// Gett all insurance Partners
router.get('/allpartners', async (req, res) => {
    try {
      const partners = await InsurancePartner.find({ status: 'Active' });
      const documentPrices = await DocumentPrice.find();
      const count =  partners.length;
      const docCount =  documentPrices.length;

      res.status(200).json({message:"Successfully fetched",
                            partners: partners,
                            documentPrices: documentPrices,
                            partnerCount: count,
                            documentCount: docCount
                          });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error' });
    }
  });




// Update an insurance company by ID
router.put('/update/:id', async (req, res) => {
  try {
    const insuranceCompany = await InsurancePartner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!insuranceCompany) {
      return res.status(404).json({ error: 'Insurance company not found' });
    }
    res.status(200).json(insuranceCompany);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete an insurance company by ID
router.delete('/delete/:id', async (req, res) => {
  try {
    const insuranceCompany = await InsurancePartner.findByIdAndDelete(req.params.id);
    if (!insuranceCompany) {
      return res.status(404).json({ error: 'Insurance company not found' });
    }
    res.status(200).json({ message: 'Insurance company deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




module.exports = router;
