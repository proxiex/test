const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Merchant = require('../models/merchant');
const Order = require('../models/order');
const SubOrder = require('../models/suborder');
const Transaction = require('../models/transaction');
const Agent = require('../models/agent');











// Route to create a new order
// Endpoint to handle order creation
router.post('/createOrder', async (req, res) => {
  try {
    const {
      deviceId,
      reference,
      orderId,
      products,
      shippingOption,
      shippingState,
      shippingAddress,
      contactNumber,
      deliveryInstructions,
      orderCost,
      deliveryCost,
      totalCost,
      isMultipleMerchants,
      userId,
      merchantIds
    } = req.body;

    console.log(shippingState);
    const orderDate = new Date().toISOString();

    // Check if paymentRef exists in transactions
    const transaction = await Transaction.findOne({ reference });

    if (transaction) {
      // Check if an order with this paymentRef already exists
      const existingOrder = await Order.findOne({ reference });

      if (existingOrder) {
        res.status(200).json({ message: 'Order already exists', order: existingOrder });
        return;
      }
    } else {
      res.status(404).json({ message: 'There is no transaction for this order' });
      return;
    }

    if (isMultipleMerchants) {
      // Create suborders
      const createdSubOrders = [];
      for (let i = 0; i < merchantIds.length; i++) {
        const subOrderProducts = products.filter(product => product.merchantId === merchantIds[i]);
        const subOrder = new SubOrder({
          products: subOrderProducts,
          status: 'Pending',
          merchantId: merchantIds[i]
        });
        await subOrder.save();
        createdSubOrders.push(subOrder._id);
      }

      // Create main order
      const order = new Order({
        deviceId,
        _id: orderId,
        products,
        reference,
        subOrders: createdSubOrders,
        shippingOption,
        shippingState,
        shippingAddress,
        contactNumber,
        deliveryInstructions,
        orderDate,
        orderCost,
        deliveryCost,
        totalCost,
        isMultipleMerchants,
        userId,
        status: 'Pending',

        //delivery sequence
        itemPacked: false,
        assignedToDeliveryAgent: false,
        orderInTransit: false,
        orderReadyforPickup: false,
        orderDelivered: false,
        orderPickedUp: false,
      });

      await order.save();

      // Update respective Merchants merchant.orders with the respective suborderIds
      for (let i = 0; i < merchantIds.length; i++) {
        await Merchant.findByIdAndUpdate(merchantIds[i], { $push: { orders: createdSubOrders[i] } });
      }

      // Update user.orders with the main orderId
      // Assuming userId is unique
      await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });

      res.status(200).json({ message: 'Order and suborders created successfully', order: order });

    } else {
      // If isMultipleMerchants is false, create a single order
      const order = new Order({
        _id: orderId, // Generate a unique ObjectId for order
        deviceId,
        products,
        reference,
        shippingOption,
        shippingState,
        shippingAddress,
        contactNumber,
        deliveryInstructions,
        orderDate,
        orderCost,
        deliveryCost,
        totalCost,
        isMultipleMerchants,
        userId,
        status: 'Pending',


        //delivery sequence
        itemPacked: false,
        assignedToDeliveryAgent: false,
        orderInTransit: false,
        orderInWarehouse: false,
        orderDelivered: false,
        orderPickedUp: false,
      });

      await order.save();

      // Update user.orders with the orderId
      // Assuming userId is unique
      await User.findByIdAndUpdate(userId, { $push: { orders: order._id } });

      // If there is only one merchant, update their merchant.orders array
      if (merchantIds.length === 1) {
        await Merchant.findByIdAndUpdate(merchantIds[0], { $push: { orders: order._id } });
      }

      res.status(200).json({ message: 'Order created successfully', order: order });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create order', error });
  }
});

  

  



router.get('/:orderId', async (req, res) => {
    try {
      // Find the order by orderId
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId);
  
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      // Check if the order has suborders
      if (order.subOrders && order.subOrders.length > 0) {
        // If suborders exist, fetch them from the suborder collection
        const subOrders = await SubOrder.find({ _id: { $in: order.subOrders } });
  
        // Return the suborders
        return res.status(200).json({ subOrders: subOrders });
      } else {
        // If no suborders, return the order itself
        return res.status(200).json({ order: order });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch order details' });
    }
  });
  



  // Route to get orders by user ID
  router.get('/user/:userId', async (req, res) => {
    const userId = req.params.userId;
    const role = req.header('role');
  
    try {
      switch (role) {
        case 'merchant':
          const merchant = await Merchant.findById(userId);
          if (!merchant) {
            return res.status(404).json({ message: 'Merchant not found' });
          }
          const merchantOrderIds = merchant.orders;
          const merchantOrders = await Order.find({ _id: { $in: merchantOrderIds } });
          return res.status(200).json({ message: 'Merchant orders fetched', orders: merchantOrders });
  
        case 'user':
          const user = await User.findById(userId);
          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }
          const userOrderIds = user.orders;
          const userOrders = await Order.find({ _id: { $in: userOrderIds } });
          return res.status(200).json({ message: 'User orders fetched', orders: userOrders });
  
        case 'deliveryAgent':
          const deliveryAgent = await DeliveryAgent.findById(userId);
          if (!deliveryAgent) {
            return res.status(404).json({ message: 'Delivery agent not found' });
          }
          const deliveryAgentOrderIds = deliveryAgent.orders;
          const deliveryAgentOrders = await Order.find({ _id: { $in: deliveryAgentOrderIds } });
          return res.status(200).json({ message: 'Delivery agent orders fetched', orders: deliveryAgentOrders });
  
        case 'admin':  
        case 'support':
          const allOrders = await Order.find();
          return res.status(200).json({ message: 'All orders fetched', orders: allOrders });
  
        case 'agent':
          const agent = await Agent.findById(userId);
          if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
          }
  
          const fulfillmentAgentOrders = await Order.find({ fulfillmentAgentId: userId });
  
          const pendingOrders = await Order.find({ fulfillmentAgentId: { $exists: false } });
  
          const combinedOrders = [
            ...fulfillmentAgentOrders,
            ...pendingOrders.filter(order => !fulfillmentAgentOrders.find(fao => fao._id.equals(order._id)))
          ];
  
          return res.status(200).json({ message: 'Fulfillment agent orders fetched', orders: combinedOrders });
  
        default:
          return res.status(403).json({ message: 'Unauthorized' });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders', error: error.message, stack: error.stack });
    }
  });
  

  




router.post('/updatefulfillment', async (req, res) => {
  const { images, orderId, productId, fulfillmentAgentId } = req.body;

  try {
    
    // Find the order by ID
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Find the product in the order by product ID
    const productIndex = order.products.findIndex(product => product.productId === productId);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found in the order' });
    }

    // Update the fulfillmentImages for the product
    order.products[productIndex].fulfillmentImages = images;
    order.products[productIndex].fulfilled = true;
    order.fulfillmentAgentId = fulfillmentAgentId,


    // Save the updated order
    await order.save();

    res.status(200).json({ message: 'Fulfilment images updated successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update fulfilment images', error });
  }
});







  // Endpoint to mark item as packed and upload images to Cloudinary

  router.post('/:orderId/packed', async (req, res) => {

    const { images, orderId, agentId } = req.body;
  
    try {
      // Find the order by ID
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      // Update itemPackedDate to now
      order.itemPackedDate = new Date().toISOString();
  
      // Set itemPacked to true
      order.itemPacked = true,
      order.status = 'Packed',
  
      // Pass fulfilmentImages to packedOrderImages
      order.packedOrderImages = images;
  
      // Save the updated order
      await order.save();
  
      res.status(200).json({ message: 'packedOrderImages updated successfully', order });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update packedOrderImages', error });
    }
  });
  

  
  // Route to find and change status of an order by orderId
  router.post('/:orderId/assign', async (req, res) => {
    const orderId = req.params.orderId;
    const {agentId, agentName, agentNumber} = req.body;
  
    try {
      // Find the order by orderId
      const order = await Order.findById(orderId);
    const assignDate = new Date().toISOString();

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      // Update the order status to "cancel"
      order.status = 'Assigned';
      order.assignedToDeliveryAgent = true;
      order.deliveryAgentId = agentId;
      order.agentName = agentName;
      order.agentNumber = agentNumber;
      order.assignmentDate = assignDate,
      await order.save();
  
      const agent = await DeliveryAgent.findById(agentId);
      if (!agent) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      agent.orders.push(orderId);
      await agent.save();
  
      res.status(200).json({message: 'Assigned  to an Delivery Agent Successfully', order});
    } catch (error) {
      res.status(500).json({ error: 'Failed to cancel order' });
    }
  });
  
  

  // Endpoint to update order to in transit status
  router.post('/:orderId/intransit', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const inTransitDate = new Date().toISOString(); // Assuming in transit date is current date

    // Update order status and in transit date
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found (in transit)' });
    }

       order.orderInTransit = true,
       order.orderInTransitDate = inTransitDate,
       order.status = 'In Transit'
      
       await order.save();

    res.status(200).send({message:'Order updated to in transit successfully.', order});
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating order to in transit.');
  }
});




// Endpoint to update order to order ready for pickup status
router.post('/:orderId/readyforpickup', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { images, agentId } = req.body;
    const readyDate = new Date().toISOString();


    // Update order status to indicate order ready for pickup
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
        order.orderReadyforPickup = true,
        order.orderReadyforPickupDate = readyDate,
        order.status = 'PickUp Ready',
        order.orderReadyforPickupImages = images,

        await order.save();

    

    res.status(200).send({message: 'Order Ready for pickup set successfully!', order });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating order ready for pickup status.');
  }
});




// Endpoint to update order to order picked up status
// Endpoint to update order to order picked up status
router.post('/:orderId/pickedup', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const { images, orderPickedUpbyName, orderPickedUpbyNumber } = req.body;  // corrected destructuring

    // Assuming order picked up date is current date
    const pickedUpDate = new Date().toISOString();

    // Update order status and order picked up date
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
      
        order.orderPickedUp = true,
        order.orderPickedUpDate = pickedUpDate,
        order.status = 'Completed',
        order.orderPickedUpbyImage = images,
        order.orderPickedUpbyName = orderPickedUpbyName,
        order.orderPickedUpbyNumber = orderPickedUpbyNumber
      
        await order.save();

    res.status(200).send({message:'Order picked up successfully.', order});
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating order picked up status.');
  }
});






// Endpoint to update order to delivered status
router.post('/:orderId/delivered', async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const deliveredDate = new Date().toISOString(); // Assuming delivered date is current date
    const { image, orderDeliveredToName, orderDeliveredToPhoneNumber } = req.body;  // corrected destructuring

    // Update order status, delivered status, delivered date, and save delivered item images
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    
        order.orderDelivered = true,
        order.orderDeliveredDate = deliveredDate,
        order.status = 'Completed',
        order.orderDeliveredImage = image,
        order.orderDeliveredToName = orderDeliveredToName,
        order.orderDeliveredToPhoneNumber = orderDeliveredToPhoneNumber,


        await order.save();
   

    res.status(200).send({message: 'Order updated to delivered successfully.', order});
  } catch (err) {
    console.error(err);
    res.status(500).send({message:'Error updating order to delivered.', err});
  }
});


  
  // Route to find and change status to delivered an order by orderId
  router.put('/:orderId/status', async (req, res) => {
    const orderId = req.params.orderId;
    const orderStatus = req.body.orderStatus;
  
    try {
      // Find the order by orderId
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
  
      // Update the order status to "cancel"
      order.status = orderStatus;
      await order.save();
  
      res.status(200).json(order);
    } catch (error) {
      res.status(500).json({ message: 'Failed to cancel order' });
    }


});
  





router.get('/deliveryagent/all', async (req, res) => {
  try {
    // Retrieve all delivery agents from the database
    const deliveryAgents = await Agent.find();


    // Create an array to store modified delivery agent objects
    const modifiedDeliveryAgents = [];

    // Loop through each delivery agent
    for (const deliveryAgent of deliveryAgents) {
      let deliveryReviews = [];
      let totalCommunicationRating = 0;
      let totalTimelyDeliveryRating = 0;
      let numberOfReviews = 0;

      // Check if the delivery agent has orders
      if (deliveryAgent.orders.length > 0) {
        // Loop through each orderId in the delivery agent's orders array
        for (const orderId of deliveryAgent.orders) {
          // Find the order by orderId
          const order = await Order.findById(orderId);

          // If the order exists
          if (order) {
            // If the order has delivery reviews, add them to the deliveryReviews array
            if (order.deliveryReviews && order.deliveryReviews.length > 0) {
              deliveryReviews.push(...order.deliveryReviews);
              for (const review of order.deliveryReviews) {
                totalCommunicationRating += review.communicationRating || 0;
                totalTimelyDeliveryRating += review.timelyDeliveryRating || 0;
                numberOfReviews++;
              }
            }
          } else {
            console.warn(`Order ${orderId} not found for delivery agent ${deliveryAgent._id}`);
          }
        }

        // Calculate the mean values for communicationRating and TimelyDeliveryRating
        const meanCommunicationRating = numberOfReviews > 0 ? totalCommunicationRating / numberOfReviews : 0;
        const meanTimelyDeliveryRating = numberOfReviews > 0 ? totalTimelyDeliveryRating / numberOfReviews : 0;

        // Create a modified delivery agent object including delivery reviews and mean ratings
        const modifiedAgent = {
          agentId: deliveryAgent._id,
          firstName: deliveryAgent.firstName,
          lastName: deliveryAgent.lastName,
          email: deliveryAgent.email,
          phoneNumber: deliveryAgent.phoneNumber,
          status: deliveryAgent.status,
          image: deliveryAgent.image,
          deliveryReviews,
          meanCommunicationRating,
          meanTimelyDeliveryRating,
          numberOfReviews
        };

        // Add the modified agent to the array
        modifiedDeliveryAgents.push(modifiedAgent);
      } else {
        // Create a modified delivery agent object without reviews
        const modifiedAgent = {
          agentId: deliveryAgent._id,
          firstName: deliveryAgent.firstName,
          lastName: deliveryAgent.lastName,
          phoneNumber: deliveryAgent.phoneNumber,
          status: deliveryAgent.status,
          image: deliveryAgent.image,
          deliveryReviews: [], // Empty reviews array
          meanCommunicationRating: 0, // Default rating
          meanTimelyDeliveryRating: 0, // Default rating
          numberOfReviews
        };

        // Add the modified agent to the array
        modifiedDeliveryAgents.push(modifiedAgent);
      }
    }

    // Send the modified delivery agents array as a response
    res.status(200).json({deliveryAgents: modifiedDeliveryAgents});
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      message: 'An error occurred while fetching delivery agents',
      details: error.message,
    });
  }
});

module.exports = router;
