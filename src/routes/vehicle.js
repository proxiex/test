const express = require('express');
const router = express.Router();
const User  = require('../models/user');
const CarImage  = require('../models/carimage');
const CarLogo  = require('../models/carlogo');
const Vehicle = require('../models/vehicle');
const MissingCarImage = require('../models/missingcarimage');
const Agent = require('../models/agent'); 
const { VehicleRegistration } = require('../models/newvehicleregistration');








// Endpoint to check if a vehicle with the same plate number exists
router.get('/checkPlateNumber/:plateNumber', async (req, res) => {
  try {
    const plateNumberToCheck = req.params.plateNumber.toUpperCase();

    // Check if a vehicle with the provided plate number exists
    const existingVehicle = await Vehicle.findOne({ plateNumber: plateNumberToCheck });

    if (existingVehicle) {
      // Vehicle with the same plate number already exists
      return res.status(200).json({ message: 'Vehicle Exists' });
    } else {
      // Vehicle with the provided plate number does not exist
      return res.status(404).json({ message: 'Vehicle Does Not Exist' });
    }
  } catch (error) {
    console.error('Error checking plate number:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




router.post('/addvehicle/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    const vehicleId = req.body.vehicleId.toString();

    if (!user) {
      console.log('User not found');
      return res.status(404).send('User not found');
    }

    // Check if a vehicle with the same plate number already exists
    const existingPlateNumber = await Vehicle.findOne({ 'plateNumber.number': req.body.plateNumber.number });
    if (existingPlateNumber) {
      return res.status(400).send('Vehicle with the same plate number already exists');
    }

    const existingVin = await Vehicle.findOne({ 'vin': req.body.vin });
    if (existingVin) {
      return res.status(400).send('Vehicle with the same VIN already exists');
    }

    const vehicle = new Vehicle({
      _id: vehicleId,
      userId: req.params.userId,
      status: 'Active',
      make: req.body.make,
      model: req.body.model,
      year: req.body.year,
      category: req.body.category,
      color:req.body.color,
      plateNumber: [ req.body.plateNumber.number],
      vin: req.body.vin,
      
      roadWorthiness: req.body.roadWorthiness,
      vehicleLicense: req.body.vehicleLicense,
      insurance: req.body.insurance,
        
      addedOn: new Date().toISOString()  // Corrected date format
    });


    // Save the vehicle to the 'vehicles' collection
    await vehicle.save();


    // Add vehicleId to user.vehicles
    user.vehicles.push(vehicleId);
    await user.save();

    console.log('Vehicle added successfully:', vehicle);
    res.status(200).send(vehicle);
  } catch (error) {
    console.error('Error adding vehicle:', error);
    res.status(500).send(error);
  }
});





// / POST route to add new registration
router.post('/newregistration', async (req, res) => {
  try {
    const {
      userId,
      paymentReference,
      totalPrice,
      vehicleDetails,
      ownerDetails,
      documents,
      insurance,
    } = req.body;

    // Create a new registration instance
    const newRegistration = new VehicleRegistration({
      userId,
      paymentReference,
      totalPrice,
      vehicleDetails,
      ownerDetails,
      documents,
      insurance,
    });

    // Save the registration to the database
    await newRegistration.save();

    res.status(200).json({
      message: 'Registration submitted successfully.',
      // registration: newRegistration,
    });
  } catch (error) {
    console.error('Error submitting registration:', error);
    res.status(500).json({
      message: 'Failed to submit registration',
      error: error.message,
    });
  }
});





// Get all user vehicles





// Function to apply transformation to the URL
function applyTransformation(originalUrl, transformation) {
  // Split the URL into parts using '/'
  const parts = originalUrl.split('/');

  // Find the index of 'upload' in the parts
  const uploadIndex = parts.indexOf('upload');

  if (uploadIndex !== -1 && uploadIndex < parts.length - 1) {
    // Insert the transformation parameter after 'upload'
    parts.splice(uploadIndex + 1, 0, transformation);
  }

  // Join the modified parts back into a URL
  const modifiedUrl = parts.join('/');

  return modifiedUrl;
}





router.get('/:userId/', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      console.log('User not found');
      return res.status(404).send('User not found');
    }

    const vehicles = user.vehicles;

    // Fetch all vehicles from the 'vehicles' collection
    const allVehicles = await Vehicle.find({ _id: { $in: vehicles } });

    // Fetch car logos and images for each vehicle
    const vehiclesWithLogosAndImages = await Promise.all(
      allVehicles.map(async (vehicle) => {
        try {
          // Fetch car logo
          const matchingCarLogos = await CarLogo.find({
            brand: { $regex: vehicle.make, $options: 'i' },
          });

          // Check if matchingCarLogos is empty
          if (matchingCarLogos.length === 0) {
            // Use the default logo URL if no matching logo is found
            const defaultLogoUrl = 'https://res.cloudinary.com/dmrazjf6c/image/upload/v1701992055/mom/logoBig.png';
            return res.status(200).json([{ brand: 'Default', url: defaultLogoUrl }]);
          }

          // Get logo URL
          const logoUrl = matchingCarLogos[0]?.url;

          // Fetch car image
          const carImages = await CarImage.find();
          const queryString = `${vehicle.make} ${vehicle.model}`;
          const year = vehicle.year;

          // Find the first matching car image
          let firstMatchingImage = carImages.find((carImage) =>
            queryString.split(' ').every((word) =>
              carImage.name.toLowerCase().includes(word.toLowerCase())
            ) &&
            carImage.name.includes(year)
          );

          // If no match is found, add data to missingCarImage collection and perform a second search without the year
          if (!firstMatchingImage) {
            await MissingCarImage.create({
              queryString: queryString,
              year: year,
            });

            // Perform a second search without the year
            firstMatchingImage = carImages.find((carImage) =>
              queryString.split(' ').every((word) =>
                carImage.name.toLowerCase().includes(word.toLowerCase())
              )
            );
          }

          // If a match is found, use it; otherwise, use the default image
          const imageUrl = firstMatchingImage
            ? firstMatchingImage.url
            : 'https://res.cloudinary.com/dmrazjf6c/image/upload/t_withoutBackground/v1701992389/mom/brandlesscar.png';

          // Apply the transformation to the image URL
          const transformation = 't_withoutBackground/t_Grayscale';
          const transformedImageUrl =  applyTransformation(imageUrl, transformation);

          

          // Add missing vehicle details to the "missingvehicles" collection
          if (!firstMatchingImage) {
            const missingVehicle = {
              queryString: queryString,
              year: year,
            };
            await MissingCarImage.create(missingVehicle);
          }

          // Combine the vehicle data with logo and image URLs
          return {
            ...vehicle.toObject(),
            logoUrl,
            carImage: transformedImageUrl, // Use the transformed image URL
          };
        } catch (error) {
          console.error(`Error fetching details for vehicleId ${vehicle.vehicleId}:`, error);
          return null;
        }
      })
    );

    // Filter out null entries (error occurred during fetching details)
    const validVehiclesWithLogosAndImages = vehiclesWithLogosAndImages.filter((vehicle) => vehicle !== null);

    res.status(200).send(validVehiclesWithLogosAndImages);
  } catch (error) {
    console.error(error);
    res.status(500).send(error);
  }
});






router.post('/addcarimages', async (req, res) => {
  try {
    const { newData } = req.body;

    // Prepare the array of image details
    const carImages = newData.map((file) => ({
      name: file.name,
      url: file.url,
    }));

    // Iterate through each car image and update or insert it into the database
    for (const carImage of carImages) {
      await CarImage.updateOne(
        { name: carImage.name },
        { $set: carImage },
        { upsert: true }
      );
    }

    res.status(201).json({ message: 'Car images uploaded successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





router.post('/getcarimage', async (req, res) => {
  try {
    // Retrieve all car images from the "carimages" collection
    const carImages = await CarImage.find();

    // Extract the query string and year from the request body
    const { queryString, year } = req.body;

    // Find the first matching car image for the combined search
    const firstMatchingImageCombinedSearch = carImages.find(carImage =>
      queryString.split(' ').every(word =>
        carImage.name.toLowerCase().includes(word.toLowerCase())
      ) &&
      carImage.name.includes(year)
    );

    // If a match is found, use it; otherwise, add/update the missing image in the "MissingCarImage" collection
    if (firstMatchingImageCombinedSearch) {
      const matchingCarImages = [{
        _id: firstMatchingImageCombinedSearch._id,
        name: firstMatchingImageCombinedSearch.name,
        url: firstMatchingImageCombinedSearch.url,
        alternativeImage: false,
        // Add more properties if needed
      }];

      res.status(200).json(matchingCarImages);
      return; // Exit the function early since a match was found
    }

    // If no images are found in the first search, perform a second search using only the query string
    const firstMatchingImageQueryStringSearch = carImages.find(carImage =>
      queryString.split(' ').every(word =>
        carImage.name.toLowerCase().includes(word.toLowerCase())
      )
    );

    // Prepare the result array with the first matching car image URL and alternativeImage flag
    const matchingCarImages = firstMatchingImageQueryStringSearch
      ? [{
        _id: firstMatchingImageQueryStringSearch._id,
        name: firstMatchingImageQueryStringSearch.name,
        url: firstMatchingImageQueryStringSearch.url,
        alternativeImage: true,
        // Add more properties if needed
      }]
      : [{
        _id: 'defaultImageId', // Replace with the actual ID of the default image in your database
        name: 'Default Image',
        url: 'https://res.cloudinary.com/dmrazjf6c/image/upload/t_withoutBackground/v1701992389/mom/brandlesscar.png',
        alternativeImage: true,
        // Add more properties if needed
      }];

    // Add missing vehicle details to the "missingvehicles" collection
    const missingVehicle = {
      queryString: queryString,
      year: year,
    };
    await MissingCarImage.create(missingVehicle);

    res.status(200).json(matchingCarImages);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while fetching car images' });
  }
});



//add car logo


router.post('/addcarlogos', async (req, res) => {
  try {
    const { newData } = req.body;

    // Prepare the array of logo details
    const carLogos = newData.map((file) => ({
      brand: file.name,
      url: file.url,
    }));

    // Iterate through each car logo and update or insert it into the database
    for (const carLogo of carLogos) {
      await CarLogo.updateOne(
        { brand: carLogo.brand },
        { $set: carLogo },
        { upsert: true }
      );
    }

    res.status(201).json({ message: 'Car Logos uploaded successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




router.post('/getcarlogo', async (req, res) => {
  try {
    // Extract the "make" from the request body
    const { make } = req.body;

    // Use a case-insensitive query to find matching car logos
    const matchingCarLogos = await CarLogo.find({
      brand: { $regex: make, $options: 'i' },
    });

    // Check if matchingCarLogos is empty
    if (matchingCarLogos.length === 0) {
      // Use the default logo URL if no matching logo is found
      const defaultLogoUrl = 'https://res.cloudinary.com/dmrazjf6c/image/upload/v1701992055/mom/logoBig.png';
      return res.status(200).json([{ brand: 'Default', url: defaultLogoUrl }]);
    }

    res.status(200).json(matchingCarLogos);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while fetching car logos' });
  }
});



// Update vehicle insurance or document data

const roleModelMap = {
  'admin': Agent,
  'agent': Agent,
  'support': Agent,
};

// Update vehicle data based on documentType
router.put('/documentupdate', async (req, res) => {
  const { userId, plateNumber, updateType, updateData } = req.body;
  // const role = req.header('role');

  // console.log('Update Data:', updateData);

  try {
    // Find the vehicle by plateNumber
    let vehicle = await Vehicle.findOne({ plateNumber });
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

  
    // Update the vehicle based on documentType
    switch (updateType) {
      case 'insurance':
        vehicle.insurance = updateData.insurance;
        break;

      case 'documents':
        vehicle.roadWorthiness = updateData.roadWorthiness;
        vehicle.vehicleLicense = updateData.vehicleLicense;
        vehicle.hackney = updateData.hackney;
        vehicle.insurance = updateData.insurance;
        break;

      case 'hackney':
        vehicle.hackney = updateData.hackney;
        break;

      default:
        return res.status(400).json({ error: 'Invalid document type' });
    }

    // Save the updated vehicle data
    await vehicle.save();

    res.status(200).json({ message: 'Vehicle data updated successfully', vehicle });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ error: 'An error occurred while updating the vehicle' });
  }
});









router.get('/newVehicleRegistrationFees', async (req, res) => {
  try {
    const newVehicleRegistrationFees = await NewVehicleRegistration.find();
    res.json({message:'Successfull', registrationFees: newVehicleRegistrationFees});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching vehicle categories' });
  }
});






// router.put('/documentupdate', async (req, res) => {
//   const { userId, plateNumber, updateType, updateData } = req.body;
//   const role = req.header('role');

//   console.log('Update Data:', updateData);

//   try {
//     // Find the vehicle by plateNumber
//     let vehicle = await Vehicle.findOne({ plateNumber });
//     if (!vehicle) {
//       return res.status(404).json({ error: 'Vehicle not found' });
//     }

//     // If the role is not 'user', verify the existence of the user in their respective collection
//     if (role !== 'user') {
//       const RoleModel = roleModelMap[role];
//       if (!RoleModel) {
//         return res.status(400).json({ error: 'Invalid role' });
//       }

//       const userExists = await RoleModel.findOne({ _id: userId });
//       if (!userExists) {
//         return res.status(404).json({ error: 'User not found in the role-specific collection' });
//       }
//     }

//     // Verify the user is authorized to update the vehicle
//     if (vehicle.userId !== userId) {
//       return res.status(403).json({ error: 'Unauthorized user' });
//     }

//     // Update the vehicle based on documentType
//     switch (updateType) {
//       case 'insurance':
//         vehicle.insurance = {
//           id: updateData.insurance.id,  // Use lowercase 'id' to match your model
//           issuer: updateData.insurance.issuer,
//           plan: updateData.insurance.plan,
//           cover: updateData.insurance.cover,
//           duration: updateData.insurance.duration,
//           rate: updateData.insurance.rate,
//           expiringDate: updateData.insurance.expiringDate,
//           activated: updateData.insurance.activated,  // Properly update activated
//           momManaged: updateData.insurance.momManaged,  // Properly update momManaged
//         };
//         break;

//       case 'documents':
//         vehicle.roadWorthiness = updateData.roadWorthiness;
//         vehicle.vehicleLicense = updateData.vehicleLicense;
//         vehicle.hackney = updateData.hackney;
//         vehicle.insurance = {
//           id: updateData.insurance.id,  // Use lowercase 'id' to match your model
//           issuer: updateData.insurance.issuer,
//           plan: updateData.insurance.plan,
//           cover: updateData.insurance.cover,
//           duration: updateData.insurance.duration,
//           rate: updateData.insurance.rate,
//           expiringDate: updateData.insurance.expiringDate,
//           activated: updateData.insurance.activated,  // Properly update activated
//           momManaged: updateData.insurance.momManaged,  // Properly update momManaged
//         };
        
//         break;

//       case 'hackney':
//         vehicle.hackney = updateData.hackney;
//         break;

//       default:
//         return res.status(400).json({ error: 'Invalid document type' });
//     }

//     // Save the updated vehicle data
//     await vehicle.save();

//     res.status(200).json({ message: 'Vehicle data updated successfully', vehicle });
//   } catch (error) {
//     console.error('Error updating vehicle:', error);
//     res.status(500).json({ error: 'An error occurred while updating the vehicle' });
//   }
// });


module.exports = router;
