const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
    initiatorId: { type: String, required: true },
    role: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    approvalCode: { type: String, required: true },
    access: { type: Number, required: true },
    generatedAt: Date
});


const Approval = mongoose.model('Approval', approvalSchema);

module.exports = Approval;

