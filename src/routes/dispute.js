const express = require('express');
const router = express.Router();
const { RepairTicket, Dispute } = require('../models/user'); // Make sure to import your models



 
  // Adding a dispute and updating the repair ticket
  router.post('/adddispute/', async (req, res) => {
    try {
      const repairTicket = await RepairTicket.findById(req.body.repairTicketId);
  
      if (!repairTicket) {
        return res.status(404).send('Repair ticket not found');
      }
  
      const dispute = {
        repairTicketId: repairTicket._id,
        userId: req.body.userId,
        description: req.body.description,
        evidence: req.body.evidence,
      };
  
      const savedDispute = await Dispute.create(dispute);
  
      // Update the repair ticket
      repairTicket.isDisputed = true;
      repairTicket.isDisputedClosed = false;
      repairTicket.disputes.push(savedDispute._id);
      await repairTicket.save();
  
      res.status(200).send(savedDispute);
    } catch (error) {
      res.status(500).send(error);
    }
  });
  
  

// Get all disputes using the disputeIds string
router.get('/:disputeIds', async (req, res) => {
    try {
      const disputeIds = req.params.disputeIds.split(',');
  
      const disputes = await Dispute.find({ _id: { $in: disputeIds } });
  
      if (!disputes || disputes.length === 0) {
        return res.status(404).send('No disputes found');
      }
  
      res.status(200).json(disputes);
    } catch (error) {
      res.status(500).send(error);
    }
  });




// Update dispute status and related repair ticket status
router.put('/closed/:disputeId/', async (req, res) => {
    try {
      const disputeId = req.params.disputeId;
  
      // Find the dispute by disputeId and update isDisputeClosed
      const updatedDispute = await Dispute.findByIdAndUpdate(
        disputeId,
        { isDisputeClosed: false },
        { new: true }
      );
  
      if (!updatedDispute) {
        return res.status(404).send('Dispute not found');
      }
  
      // Find the repair ticket by repairTicketId and update isDisputed and isCompleted
      const repairTicket = await RepairTicket.findById(updatedDispute.repairTicketId);
  
      if (!repairTicket) {
        return res.status(404).send('Repair ticket not found');
      }
  
      repairTicket.isDisputed = false;
      repairTicket.isCompleted = true;
      await repairTicket.save();
  
      res.status(200).json({
        dispute: updatedDispute,
        repairTicket: repairTicket,
      });
    } catch (error) {
      res.status(500).send(error);
    }
  });
  
  

module.exports = router;
