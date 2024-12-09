
const express = require('express');
const router = express.Router();
const CarBrand = require('../models/carbrand');
const Color = require('../models/color');
const  {PlateNumberRegistrationFee, NewVehicleRegistrationFee} = require('../models/newvehicleregistration');


router.get('/getall', async (req, res) => {
  try {
    // Retrieve all cars from the 'carbrands' collection
    const allCars = await CarBrand.find();

    // Transform the data
    const seen = new Set();
    const transformedData = allCars.reduce((acc, car) => {
      const { make, model, year, category } = car;

      // Create a unique key for the combination of make, model, year, and category
      const uniqueKey = `${make}-${model}-${year}-${category}`;

      // Check if this combination has already been processed
      if (seen.has(uniqueKey)) {
        return acc; // Skip this entry if it is a duplicate
      }

      seen.add(uniqueKey); // Add the combination to the set of seen entries

      // Initialize the make group if it doesn't exist
      if (!acc[make]) {
        acc[make] = {};
      }

      // Initialize the model group if it doesn't exist
      if (!acc[make][model]) {
        acc[make][model] = { bodies: {} };
      }

      // Initialize the body group if it doesn't exist
      if (!acc[make][model].bodies[category]) {
        acc[make][model].bodies[category] = [];
      }

      // Add year to the body
      if (!acc[make][model].bodies[category].includes(year)) {
        acc[make][model].bodies[category].push(year);
      }

      return acc;
    }, {});

    // Convert the transformed data to the desired format
    const result = Object.keys(transformedData).map(make => ({
      make,
      models: Object.keys(transformedData[make]).map(model => ({
        model,
        bodies: Object.keys(transformedData[make][model].bodies).map(body => ({
          body,
          years: transformedData[make][model].bodies[body]
        }))
      }))
    }));

    // Send the modified cars array as the response
    res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'An error occurred while fetching cars',
      details: error.message,
    });
  }
});

  

  

router.get('/', async (req, res) => {
  try {
    // Fetch cars and colors concurrently
    const [allCars, allColors, registrationFees, plateNumberFees] = await Promise.all([
      CarBrand.find(),
      Color.find(),
      NewVehicleRegistrationFee.find(),
      PlateNumberRegistrationFee.find()
    ]);

    // Send the cars and colors as the response
    res.status(200).json({
      cars: allCars,
      colors: allColors,
      registrationFees: registrationFees,
      plateNumberFees: plateNumberFees
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'An error occurred while fetching cars and colors',
      details: error.message,
    });
  }
});


module.exports = router;
