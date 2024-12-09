const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Merchant = require('../models/merchant');
const ProductReview = require('../models/productReview');
const Product = require('../models/product'); 
const Category = require('../models/productcategory');
const User = require('../models/user');







router.get('/search', async (req, res) => {
  try {
      const { query } = req.body;

      // Search for products containing the query string
      const foundProducts = await Product.find({
          $or: [
              { name: { $regex: query, $options: 'i' } }, // Case-insensitive search for product name
              { category: { $regex: query, $options: 'i' } }, // Case-insensitive search for category
              { subcategory: { $regex: query, $options: 'i' } }, // Case-insensitive search for category
              { brand: { $regex: query, $options: 'i' } }, // Case-insensitive search for brand
              { compatibility: { $regex: query, $options: 'i' } } // Case-insensitive search for compatibility
          ]
      }).populate('orders');

      // Iterate over found products
      for (const product of foundProducts) {
          const orderIds = product.orders.map(order => order._id);

          // Fetch all orders using order IDs
          const orders = await Order.find({ _id: { $in: orderIds } });

          // Calculate average rating and extract reviews for each product
          let totalRating = 0;
          const productReviews = [];

          for (const order of orders) {
              if (order.reviewAdded) {
                  // Add review to productReviews array
                  productReviews.push({
                      review: order.review,
                      rating: order.rating,
                      userId: order.userId,
                      reviewAddedByFirstName: order.reviewAddedByFirstName,
                      reviewAddedByLastName: order.reviewAddedByLastName
                  });
                  // Sum up ratings
                  totalRating += order.rating;
              }
          }

          // Calculate average rating for the product
          const productRating = totalRating / productReviews.length;

          // Add reviews and average rating to the product
          product.reviews = productReviews;
          product.averageRating = productRating;

          // Find merchant details for the product
          const merchant = await Merchant.findById(product.merchantId);
          if (merchant) {
              product.merchantName = merchant.name;
              product.merchantImage = merchant.image;
              product.merchantState = merchant.state;
              product.isVerified = merchant.isVerified;
          }
      }

      res.status(200).json({ message: 'Search results', data: foundProducts });
  } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});




// Endpoint to fetch all categories
router.get('/categories', async (req, res) => {
  try {
      const categories = await Category.find({}, 'Category Subcategory');
      res.json({
          success: true,
          message: 'Categories retrieved successfully',
          data: categories
      });
  } catch (error) {
      res.status(500).json({ 
          success: false, 
          error: 'An error occurred while fetching categories' 
      });
  }
});


// POST endpoint to add a new product
router.post('/addproduct', async (req, res) => {
  try {
    const {
      id,
      name,
      compatibility,
      images,
      description,
      brand,
      warranty,
      category,
      subcategory,
      merchantId,
      priceOption,
    
    } = req.body;

    // Create a new product instance with default values for createdAt and Status
    const newProduct = new Product({
      _id: id,
      status: 'Under Review', // Set default Status to 'Pending'
      name,
      compatibility,
      images,
      description,
      brand,
      warranty,
      category,
      subcategory,
      merchantId,
      priceOption,
      featured: false,
      onsale: false,
      topselling: false,
      createdAt: new Date(Date.now()).toISOString(), // Set default createdAt to current date and time
    });

    // Save the product to the database
    await newProduct.save();

      // Find the merchant and update their products array
      const merchant = await Merchant.findByIdAndUpdate(
        merchantId, // Find the merchant by ID
        { $push: { products: id } }, // Add the product ID to the products array
        { new: true } // Return the updated merchant object
      );
  
      if (!merchant) {
        // Handle the case where the merchant is not found
        return res.status(404).json({ error: 'Merchant not found' }); 
      }

    res.status(201).json({
      message: 'Product created successfully',
      product: newProduct,
    });
  } catch (error) {
    res.status(400).json({
      message: 'Error creating product',
      error: error.message,
    });
  }
});



router.get('/all', async (req, res) => {
  try {
    // Fetch all products from the database
    let products = await Product.find();

    // If products exceed 100, truncate the array to 100
    // if (products.length > 100) {
    //   products = products.slice(0, 100);
    // }

    // Promise array to store asynchronous order fetching
    const orderPromises = products.map(async (product) => {
      if (!product.reviews) {
        product.reviews = []; // Initialize reviews if it's undefined or null
      }

      // Assuming reviewIds is an array of review IDs stored in product.reviews
      const reviewIds = product.reviews;

      // Fetch reviews using reviewIds
      const reviews = await ProductReview.find({ _id: { $in: reviewIds } });

      // Calculate mean rating for the product based on reviews
      const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
      const meanRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      // Fetch merchant details for the product
      const merchant = await Merchant.findById(product.merchantId);

      // Check if merchant exists
      if (!merchant) {
        console.warn(`Merchant not found for product ID: ${product._id}`);
      }

      // Update product rating with the mean rating
      product.rating = meanRating;

      // Construct the final product map
      const formattedProduct = {
        id: product._id,
        status: product.status,
        name: product.name,
        rating: parseFloat(meanRating), // Assuming rating is a number
        compatibility: product.compatibility,
        category: product.category,
        subcategory: product.subcategory,
        priceOption: product.priceOption,
        featured: product.featured,
        onsale: product.onsale,
        topselling: product.topselling,
        images: product.images,
        description: product.description,
        brand: product.brand,
        merchantId: merchant ? merchant._id : null,
        merchantName: merchant ? `${merchant.firstName} ${merchant.lastName}` : null, // Concatenate first and last name
        merchantCompany: merchant ? merchant.company : null,
        merchantState: merchant ? merchant.state : null,
        merchantCountry: merchant ? merchant.country : null,
        merchantImage: merchant ? merchant.companyLogo : null,
        merchantIsVerified: merchant ? merchant.isVerified : null,
        reviews: reviews,
      };

      return formattedProduct; // Return the formatted product object
    });

    // Wait for all order fetches to complete
    const enrichedProducts = await Promise.all(orderPromises);

    // Send the formatted products as the response
    res.status(200).json({ message: 'All products', data: enrichedProducts });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.get('/:merchantId', async (req, res) => {
  try {
    const merchantId = req.params.merchantId;

    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId is required' });
    }

    // Find the merchant by merchantId
    const merchant = await Merchant.findById(merchantId);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // Extract productIds from the merchant's products array
    const productIds = merchant.products;

    if (!productIds || productIds.length === 0) {
      return res.status(200).json({ message: 'No products found', data: [] });
    }

    // Fetch products using the productIds
    let products = await Product.find({ _id: { $in: productIds } });

  

    // Promise array to store asynchronous order fetching
    const orderPromises = products.map(async (product) => {
      if (!product.reviews) {
        product.reviews = []; // Initialize reviews if it's undefined or null
      }

      // Assuming reviewIds is an array of review IDs stored in product.reviews
      const reviewIds = product.reviews;

      // Fetch reviews using reviewIds
      const reviews = await ProductReview.find({ _id: { $in: reviewIds } });

      // Calculate mean rating for the product based on reviews
      const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
      const meanRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      // Update product rating with the mean rating
      product.rating = meanRating;

      // Construct the final product map
      const formattedProduct = {
        id: product._id,
        status: product.status,
        name: product.name,
        rating: parseFloat(meanRating), // Assuming rating is a number
        compatibility: product.compatibility,
        category: product.category,
        subcategory: product.subcategory,
        priceOption: product.priceOption,
        featured: product.featured,
        onsale: product.onsale,
        topselling: product.topselling,
        images: product.images,
        description: product.description,
        brand: product.brand,
        merchantId: merchant ? merchant._id : null,
        merchantCompany: merchant ? merchant.company : null,
        merchantState: merchant ? merchant.state : null,
        merchantCountry: merchant ? merchant.country : null,
        merchantImage: merchant ? merchant.companyLogo : null,
        merchantIsVerified: merchant ? merchant.isVerified : null,
        reviews: reviews,
      };

      return formattedProduct; // Return the formatted product object
    });

    // Wait for all order fetches to complete
    const enrichedProducts = await Promise.all(orderPromises);

    // Send the formatted products as the response
    res.status(200).json({ message: 'All products', data: enrichedProducts });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});




// Endpoint to write a product review
router.post('/addreview', async (req, res) => {
  try {
    const {
      orderId,
      productId,
      firstName,
      lastName,
      rating,
      review
    } = req.body;

    // Create a new product review
    const newReview = new ProductReview({
      orderId,
      productId,
      firstName,
      lastName,
      rating,
      review
    });

    // Save the review to the database
    const savedReview = await newReview.save();

    // Update the product's reviews array with the new review ID
    await Product.findByIdAndUpdate(productId, { $push: { reviews: savedReview._id } });

    // Update the order's products array with the review details
    await Order.findOneAndUpdate(
      { _id: orderId, 'products.productId': productId },
      {
        $set: {
          'products.$.reviewAdded': true,
          'products.$.reviewId': savedReview._id
        }
      }
    );

    res.status(200).json({ message: 'Product review added successfully', review: savedReview });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add product review', error });
  }
});







// Endpoint to add product to user's bookmarks
router.post('/bookmark', async (req, res) => {
  const { userId, productId } = req.body;

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    // Check if the user and product exist
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send({ message: 'Product not found' });
    }

    // Check if the product is already bookmarked
    if (user.bookmarks.includes(productId)) {
      return res.status(400).send({ message: 'Product already bookmarked' });
    }

    // Add the productId to the user's bookmarks array
    user.bookmarks.push(productId);
    await user.save();

    res.status(200).send({ message: 'Product bookmarked successfully', bookmarks: user.bookmarks });
  } catch (error) {
    console.error('Error bookmarking product:', error);
    res.status(500).send({ message: 'Server error' });
  }
});


// Endpoint to remove product from user's bookmarks
router.post('/removebookmark', async (req, res) => {
  const { userId, productId } = req.body;

  try {
    // Find the user by ID
    const user = await User.findById(userId);

    // Check if the user exists
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Check if the product is bookmarked
    if (!user.bookmarks.includes(productId)) {
      return res.status(400).send({ message: 'Product not bookmarked' });
    }

    // Remove the productId from the user's bookmarks array
    user.bookmarks.pull(productId);
    await user.save();

    res.status(200).send({ message: 'Product removed from bookmarks successfully', bookmarks: user.bookmarks });
  } catch (error) {
    console.error('Error removing product from bookmarks:', error);
    res.status(500).send({ message: 'Server error' });
  }
});


module.exports = router;
