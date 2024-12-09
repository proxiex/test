const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    userId:  String, 
    status: String,
    repairRefs: [String],
    vehicleDocumentVeririfed: Boolean,
    image: [String,],
    
        make: String,
        model: String,
        year: Number,
        category: String,
        color: String,
        plateNumber: [String],
        vin: String,
        engineNumber: [String],
        vehicleReceipt: {
            documentId: String,
            added: String,
            documentAdded: Boolean,

        },

        roadWorthiness: {
            documentId: String,
            expiring: String,
            documentAdded: Boolean,

        },
        vehicleLicense: {
            documentId: String,
            expiring: String,
            documentAdded: Boolean,

        },

        hackney: {
            documentId: String,
            expiring: String,
            documentAdded: Boolean,

        },
        insurance: {
            id: String,  
            policyNumber: String,
            issuer: String,
            plan: String,
            expiring: String,
            cover: String,
            description: String,
            duration: String,
            rate: String,
            activated: Boolean,
            documentAdded: Boolean,
            documentId: String,  

        },
  
        documents: [String],
        
        addedOn: { type: Date, default: Date.now }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;

