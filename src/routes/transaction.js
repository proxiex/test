const express = require('express');
const router = express.Router();
const axios = require('axios');
const Transaction = require('../models/transaction');
const Engineer = require('../models/engineer');
const UnassignedTransaction = require('../models/unassignedTransaction');
const User = require('../models/user');
const Device = require('../models/device');
const crypto = require("crypto");
const uuid = require('uuid');
const RepairTicket = require('../models/repair');
const jwt = require('jsonwebtoken');
const Merchant = require('../models/merchant');
const Order = require('../models/order');
const PayoutRequest = require('../models/payout');
const Agent = require('../models/agent');



require('dotenv').config();






router.post('/initializepayment', async (req, res) => {
  try {
    const { email, userId, amount, paymentfor, narration } = req.body;
    const deviceId = req.header('deviceid');
    
    const amountDouble = parseFloat(amount);
    const amountforpaystack = amountDouble * 100;

    // Make a request to Paystack API to initialize the transaction
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amountforpaystack,
        // callback_url: 'your_callback_url', // Replace with your callback URL
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PSK}`, // Replace with your Paystack secret key
        },
      }
    );


    
    
    // Extract relevant information from the Paystack response
    const { access_code, reference, authorization_url } = paystackResponse.data.data;
    
    // console.log('Paystack API Response:', paystackResponse.data);

 

    // Save the extracted information to the transactions collection
    const transaction = new Transaction({
      status: 'Initialized',
      userId: userId,
      amount: amount,
      reference: reference,
      paymentfor:paymentfor,
      narration: narration,
      // Save the entire Paystack response
    });

    await transaction.save();

    const transactionId = transaction._id;
 
    await User.findByIdAndUpdate(userId, { $push: { transactions: transactionId } });

    // Ensure that the transactions array is initialized before pushing
 

    // Save the updated user document

    await Device.findOneAndUpdate(
      { deviceId },
      { $push: { logins: { date: new Date(), event: 'Initializepayment' } } },
      { new: true }
    );

    // Respond with the extracted information and the Paystack response
    res.status(200).json({
      status: 'success',
      paystackReference: reference,
      paystackAccessCode: access_code,
      authorization_url: authorization_url,
      responseData: paystackResponse.data
    //   paystackResponse: paystackResponse.data,
    });
  } catch (error) {
    console.error('Error initializing transaction:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});


// Initiate parts Transfer
router.post('/ptransfer/:repairRef', async (req, res) => {

  console.log('PartsTrsnafer Started');

  const apiUrl = 'https://api.paystack.co/transfer';

  const { repairRef } = req.params;
  const deviceId = req.header('deviceid');
  const role = req.header('role');

  try {
    // Retrieve repairTicket based on repairRef
    const repairTicket = await findRepairTicketByRef(repairRef);

    if (!repairTicket) {
      return res.status(400).json({ error: 'Repair ticket not found.' });
    }

     // Check if the transfer reference already exists
     if (repairTicket.partsTransferReference) {
      return res.status(200).json({ message: 'Transaction Exists', TransferReference: repairTicket.partsTransferReference });
    }

    // Extract PTToken from repairTicket
    const PTToken = repairTicket.PTToken;
    const plateNumber = repairTicket.plateNumber;
    

    // Verify the PTToken
    const verificationResult = verifyToken(PTToken, process.env.PT_SECRET);
    

     // Check if PTToken is marked as used
     if (repairTicket.PTToken === 'Used') {
      return res.status(400).json({ error: 'Transfer already intiniated' });
    }
    

    if (!verificationResult.valid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Token' });
    }

    const { userId, repairRef: tokenRepairRef, plateNumber: tokenPlateNumber, type: tokenType } = verificationResult.decoded;

    if (deviceId !== repairTicket.deviceId || userId !== repairTicket.userId || repairRef !== tokenRepairRef || 'PT' !== tokenType || plateNumber !== tokenPlateNumber) {
      return res.status(400).json({ error: 'Transfer not possible.' });
    }

    

    const { partsCost, engineer, vehicle } = repairTicket;
    const narration = `Parts Transfers for RepairTicket: ${repairRef} ${vehicle.make} ${vehicle.model} ${vehicle.plateNumber}`;

   

    const requestData = {
      source: 'balance',
      amount: partsCost * 100,
      recipient: engineer.recipient_code,
      reason: narration,
    };
    
    
    const response = await initiateTransfer(apiUrl, requestData);
    console.log('PartsTrsnafer successful');

    // Extract relevant information from the Paystack response
    const { reference, status, transfer_code } = response.data.data;


    await RepairTicket.findOneAndUpdate(
      { repairRef },
      { $set: { PTToken: 'Used' } },
      { new: true }
    );



    // Save the extracted information to the transactions collection
    await saveTransaction('Initialized', engineer.id, role, reference, repairRef, partsCost, transfer_code, 'PartsTransfer', narration);

    // Update repairTicket with transferReference for parts transfer
    await updateRepairTicketTransferReference(repairRef, 'partsTransferReference', reference);

    // Update device logins
    await updateDeviceLogins(deviceId, 'PartsTransfer');

    // Return only the necessary fields in the response
  console.log('PartsTrsnafer all process completed');

    res.status(200).json({
      message: 'Transfer initiated successfully',
      transfer_code,
      status,
      TransferReference: reference,
    });
  } catch (error) {
    console.error('Error initiating parts transfer:', error.response ? error.response.data : error.message);
    const errorMessage = getErrorMessage(error);
    res.status(500).json({ error: errorMessage });
  }
});



// Labor Transfer Endpoint
router.post('/ltransfer/:repairRef', async (req, res) => {
  console.log('LabourTrsnafer Started');

  const apiUrl = 'https://api.paystack.co/transfer';

  const { repairRef } = req.params;
  const deviceId = req.header('deviceid');
  const role = req.header('role');

  try {
    // Retrieve repairTicket based on repairRef
    const repairTicket = await findRepairTicketByRef(repairRef);

    if (!repairTicket) {
      return res.status(400).json({ error: 'Repair ticket not found.' });
    }



    // Check if the transfer reference already exists
    if (repairTicket.labourTransferReference) {
      return res.status(200).json({ message: 'Transaction Exists', TransferReference: repairTicket.labourTransferReference });
    }
    
    // Extract LTToken from repairTicket
    const LTToken = repairTicket.LTToken;
    const plateNumber = repairTicket.plateNumber;

    // Verify the LTToken
    const verificationResult = verifyToken(LTToken, process.env.LT_SECRET);


     // Check if LTToken is marked as used
     if (repairTicket.LTToken === 'Used') {
      return res.status(201).json({ error: 'Transfer already initiated' });
    }

    if (!verificationResult.valid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Token', token: LTToken });
    }

    const { userId, repairRef: tokenRepairRef, plateNumber: tokenPlateNumber, type: tokenType } = verificationResult.decoded;

    if (deviceId !== repairTicket.deviceId || userId !== repairTicket.userId || repairRef !== tokenRepairRef || 'LT' !== tokenType || plateNumber !== tokenPlateNumber) {
      return res.status(400).json({ error: 'Transfer not possible.' });
    }

    // Check if LTToken is marked as used
    if (repairTicket.LTToken === 'Used') {
      return res.status(201).json({ error: 'Transfer already initiated' });
    }

    const { labourCost, engineer, vehicle } = repairTicket;
    const narration = `Labour Transfers for RepairTicket: ${repairRef} ${vehicle.make} ${vehicle.model} ${vehicle.plateNumber}`;
    const roundedLabourCost = Math.round(labourCost); // Round to the nearest whole number
    const amountInKobo = roundedLabourCost * 100;


    

    const requestData = {
      source: 'balance',
      amount: amountInKobo,
      recipient: engineer.recipient_code,
      reason: narration,
    };

    const response = await initiateTransfer(apiUrl, requestData);

  console.log('LabourTrsnafer completed');


    // Extract relevant information from the Paystack response
    const { reference, status, transfer_code } = response.data.data;

    await RepairTicket.findOneAndUpdate(
      { repairRef },
      { $set: { LTToken: 'Used' } },
      { new: true }
    );

    // Save the extracted information to the transactions collection
    await saveTransaction('Initialized', engineer.id, role, reference, repairRef, labourCost, transfer_code, 'LabourTransfer', narration);
    

    // Update repairTicket with transferReference for labour transfer
    await updateRepairTicketTransferReference(repairRef, 'labourTransferReference', reference);

    // Update device logins
    await updateDeviceLogins(deviceId, 'LabourTransfer');
    console.log('LabourTrsnafer all process completed');



    // Return only the necessary fields in the response
    res.status(200).json({
      message: 'Transfer initiated successfully',
      transfer_code,
      status,
      TransferReference: reference,
    });
  } catch (error) {
    console.error('Error initiating labour transfer:', error.response ? error.response.data : error.message);
    const errorMessage = getErrorMessage(error);
    res.status(500).json({ error: errorMessage });
  }
});




const verifyToken = (token, secretKey) => {
  try {
    const decoded = jwt.verify(token, secretKey);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

async function findRepairTicketByRef(repairRef) {
  return await RepairTicket.findOne({ repairRef });
}

async function initiateTransfer(apiUrl, requestData) {
  return await axios.post(apiUrl, requestData, {
    headers: {
      Authorization: `Bearer ${process.env.PSK}`,
      'Content-Type': 'application/json',
    },
  });
  
}


async function saveTransaction(status, userId, role, reference, repairRef, amount, transfer_code, paymentfor, narration) {
  const transaction = new Transaction({
    status,
    userId,
    role,
    reference,
    repairRef,
    amount,
    transfer_code,
    paymentfor,
    narration,
  });

  await transaction.save();
}


async function updateRepairTicketTransferReference(repairRef, fieldToUpdate, reference) {
  await RepairTicket.findOneAndUpdate(
    { repairRef },
    { $set: { [fieldToUpdate]: reference} },
    { new: true }
  );
}

async function updateDeviceLogins(deviceId, event) {
  await Device.findOneAndUpdate(
    { deviceId },
    { $push: { logins: { date: new Date(), event } } },
    { new: true }
  );
}

function getErrorMessage(error) {
  if (error.response && error.response.data && error.response.data.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  } else {
    return 'Internal Server Error';
  }
}






router.get('/transferstatus/:reference', async (req, res) => {
  try {
    const reference = req.params.reference;

    console.log('Transaction Reference:', reference);

    // Find the transaction in the database
    const transaction = await Transaction.findOne({ reference });

    if (!transaction) {
      console.log('Transaction not found in the database');
      return res.status(404).json({ status: 'error', message: 'Transaction not found' });
    }

    // Respond with the transaction status
    res.json({ status: 'success', transactionStatus: transaction.status });
  } catch (error) {
    console.error('Error checking transaction status:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});



router.post('/paymentstatus/:reference', async (req, res) => {
  const reference = req.params.reference;


  try {
    // Make a request to Paystack API to verify transaction status
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PSK}`,
      },
    });

    // Check if the request to Paystack was successful (status code 200)
    if (response.status === 200) {
      const transactionStatus = response.data.data.status;

      // Check if the transaction status is "success"
      if (transactionStatus === 'success') {
        res.json({ status: 'success', transactionStatus });
      } else {
        res.status(400).json({ status: 'error', message: 'Transaction verify was not successful.' });
      }
    } else {
      res.status(400).json({ status: 'error', message: 'Transaction verify was not successful.' });
    }
  } catch (error) {
    console.error('Error checking transaction status:', error.response.data);
    res.status(500).json({ status: 'error', message: 'Error checking transaction status.' });
  }
});



// Define a route for the "getbank" endpoint
router.get('/getbank', async (req, res) => {
  try {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: '/bank?currency=NGN',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PSK}`, // Replace with your Paystack secret key
      }
    };

    const paystackResponse = await axios.get(`https://${options.hostname}${options.path}`, {
      headers: options.headers
    });

    // Respond with the Paystack response for the "getbank" endpoint
    res.status(200).json({
      status: 'success',
      paystackResponse: paystackResponse.data,
    });
  } catch (error) {
    console.error('Error getting bank details:', error);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});



// Define a route for the "accountdetails" endpoint
router.post('/getaccountdetails', async (req, res) => {
  try {
    const { account_number, bank_code } = req.body;

    if (!account_number || !bank_code) {
      return res.status(400).json({ error: 'Missing account_number or bank_code in the request body' });
    }

    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path: `/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PSK}`, // Replace with your Paystack secret key
      }
    };

    const paystackResponse = await axios.get(`https://${options.hostname}${options.path}`, {
      headers: options.headers
    });

    // Respond with the Paystack response for the "accountdetails" endpoint
    res.status(200).json({
      status: 'success',
      paystackResponse: paystackResponse.data,
    });
  } catch (error) {
    console.error('Error getting account details:', error);
    res.status(500).json({ status: 'Failed', error: error });
  }
});






router.post('/createrecipient', async (req, res) => {
  try {
    const { bank_name, account_number, bank_code, account_name, userId, user_role } = req.body;
    const apiUrl = 'https://api.paystack.co/transferrecipient';

    // Validate required parameters
    if (!bank_name || !account_number || !bank_code || !account_name || !userId || !user_role) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const validRoles = {
      user: User,
      engineer: Engineer,
      merchant: Merchant,
      deliveryagent: Agent,
    };

    const UserModel = validRoles[user_role];
    if (!UserModel) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Find the user and check if the payment account already exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingAccount = user.paymentAccounts.find(account =>
      account.account_number === account_number &&
      account.bank_name === bank_name &&
      account.account_name === account_name
    );

    if (existingAccount) {
      return res.status(401).json({ 
        message: 'Account already exists', 
        recipient_code: existingAccount.recipient_code 
      });
    }

    const requestData = {
      type: 'nuban',
      name: account_name,
      account_number,
      bank_code,
      currency: 'NGN',
    };

    const { data: { data: { recipient_code } } } = await axios.post(apiUrl, requestData, {
      headers: {
        Authorization: `Bearer ${process.env.PSK}`,
        'Content-Type': 'application/json',
      },
    });

    const newPaymentAccount = {
      recipient_code,
      account_number,
      account_name,
      bank_name,
      isDefault: false,
    };

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId },
      { $push: { paymentAccounts: newPaymentAccount } },
      { new: true, upsert: false, returnDocument: 'after' }
    );

    // Retrieve the newly added payment account
    const addedAccount = updatedUser.paymentAccounts.find(account =>
      account.account_number === account_number &&
      account.bank_name === bank_name &&
      account.account_name === account_name &&
      account.recipient_code === recipient_code
    );

    res.json({
      message: 'Payment account created successfully',
      newPaymentAccount: {
        _id: addedAccount._id,
        recipient_code: addedAccount.recipient_code,
        account_number: addedAccount.account_number,
        account_name: addedAccount.account_name,
        bank_name: addedAccount.bank_name,
        isDefault: addedAccount.isDefault,
      },
    });
  } catch (error) {
    console.error('Error creating transfer recipient:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





router.post('/wallet/pay/', async (req, res) => {
  try {
    const { userId, amount, transactionId, transactionType, paymentDescription } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (transactionType === 'debit') {
      if (user.walletBalance < amount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }
      user.walletBalance -= amount;
    } else if (transactionType === 'credit') {
      user.walletBalance += amount;
    } else {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    await user.save();

    const transaction = new Transaction({
      userId: user._id,
      transactionId,
      amount,
      paymentDescription,
      transactionType,
    });

    await transaction.save();

    await User.findByIdAndUpdate(userId, { $push: { transactions: transactionId } });

    res.json({
      userId,
      updatedWalletBalance: user.walletBalance,
      transactionId,
      amount,
      paymentDescription,
      transactionType,
    });
  } catch (error) {
    console.error('Error in /wallet/pay/ route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



router.post('/addtransaction', async (req, res) => {
  try {
    const { transactionId, repairRef, userId, EngineerId, amount, labourCost, paymentDescription } = req.body;

    const transaction = new Transaction({
      transactionId,
      repairRef,
      status: 'Pending',
      userId,
      EngineerId,
      amount,
      labourCost,
      paymentDescription,
      timestamp: new Date(),
    });

    await transaction.save();

    

    res.status(200).json( transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create the transaction' });
  }
});



//get user transactions
router.get('/gettransactions/:userId', async(req, res)=>{

  try{

    const userId = req.params.userId;
    const user = await User.findById(userId);

    if (!user){
      return res.status(404).json({message: 'User not found'});
    }

    const treansactionIds = user.transactions || [];

    const transactions = await Transaction.find({ _id: { $in: treansactionIds } })
      .sort({ startDate: -1 }); // Sort by createdAt in descending order

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ message: 'No matching transactions found' });
    }

    res.status(200).json({message:'transactions retireved successfully', transactions:  transactions})

  }catch{

    res.status(500).json({ success: false, error: 'An error occurred while fetching transactions', message: error.message });


  }


});




//

router.post('/requestpayout', async (req, res) => {
  const { userId, paymentAccount, withdrawalAmount } = req.body;
  const role = req.header('role');

  try {
    let user;
    if (role === 'merchant') {
      user = await Merchant.findById(userId);
    } else if (role === 'deliveryagent') {
      user = await Agent.findById(userId);
    } else {
      return res.status(400).send({ message: 'Invalid role' });
    }

    if (!user || !user.orders || user.orders.length === 0) {
      return res.status(400).send({ message: `No orders found for this ${role}` });
    }

    const orderIds = user.orders;

    // Fetch only orders with pendingPayout = true
    const orders = await Order.find({ orderId: { $in: orderIds }, pendingPayout: true });

    if (orders.length === 0) {
      return res.status(400).send({ message: 'No orders with pending payout found' });
    }

    // Extract order details
    const orderDetails = orders.map(order => ({
      orderId: order.orderId,
      commission: order.commission,
      amount: order.amount,
    }));

    // Calculate total amount and commission
    const totalAmount = orderDetails.reduce((sum, order) => sum + order.amount, 0);
    const totalCommission = orderDetails.reduce((sum, order) => sum + order.commission, 0);
    const totalAfterCommission = totalAmount - totalCommission;

    // Check if the withdrawal amount is sufficient
    if (withdrawalAmount < totalAfterCommission) {
      return res.status(400).send({ message: 'Withdrawal amount is less than the total amount after commission' });
    }

    // Update merchant's available balance and pending payout balance
    user.availableBalance -= withdrawalAmount;
    user.pendingPayoutBalance += withdrawalAmount;

    await user.save();

    // Create a new payment request
    const payoutRequest = new PayoutRequest({
      userId,
      role,
      orderIds: orders.map(order => order.orderId),
      orderDetails,
      paymentAccount,
      withdrawalAmount,
    });

    // Save the payment request to the database
    await payoutRequest.save();

    res.status(200).send({ message: 'Payment request created successfully', payoutRequest });
  } catch (error) {
    console.error('Error creating payment request:', error);
    res.status(500).send({ message: 'Server error' });
  }
});




router.post('/payouttransfer/:payoutId', async (req, res) => {
  const { payoutId } = req.params;

  try {
    // Find the payment request using the payoutId
    const payoutRequest = await PayoutRequest.findById(payoutId);

    if (!payoutRequest) {
      return res.status(404).send({ message: 'Payment request not found' });
    }

    // Calculate total amount and commission
    const withdrawalAmount = payoutRequest.withdrawalAmount;
    const role = payoutRequest.role;
    const totalAmount = payoutRequest.orderDetails.reduce((sum, order) => sum + order.amount, 0);
    const totalCommission = payoutRequest.orderDetails.reduce((sum, order) => sum + order.commission, 0);
    const totalAfterCommission = totalAmount - totalCommission;

    // Check if the withdrawal amount is equal to or greater than the totalAfterCommission
    if (withdrawalAmount < totalAfterCommission) {
      return res.status(400).send({ message: 'Withdrawal amount is less than the total amount' });
    }

    // Initiate the transfer
    const apiUrl = 'https://api.paystack.co/transfer';
    const requestData = {
      source: 'balance',
      amount: totalAfterCommission * 100, // Convert to kobo
      recipient: payoutRequest.paymentAccount.recipient_code,
      reason: `Payout for ${role} ${payoutRequest.userId}`,
    };

    const response = await initiateTransfer(apiUrl, requestData);

    // Extract relevant information from the Paystack response
    const { reference, status, transfer_code } = response.data.data;


    const transaction = new Transaction({
      status,
      userId,
      role,
      reference,
      paymentId,
      amount: withdrawalAmount,
      transfer_code,
      paymentfor,
      narration,
    });
  
    await transaction.save();
    

    // Update the payment request with transactionId and status
    payoutRequest.transactionId = transaction._id;
    payoutRequest.status = 'Initialized';
    await payoutRequest.save();

    res.status(200).send({
      message: 'Payout request and transfer initiated successfully',
      payoutRequest,
      transferDetails: { transfer_code, status, reference }
    });
  } catch (error) {
    console.error('Error creating payout request and initiating transfer:', error.response ? error.response.data : error.message);
    res.status(500).send({ message: 'Server error' });
  }
});

module.exports = router;
