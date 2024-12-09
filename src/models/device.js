const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  
    userId:String,
    agentId:String,
    engineerId:String,
    deviceId: String,
    deviceName: String,
    operatingSystem: String,
    status: String,
    logins: [
        {
          date: {
            type: Date,
            default: Date.now,
          },
          event: {
            type: String,
            enum: ['login', 'ProfileFetch', 'UserUpdate', 'Initializepayment', 'Initiatetransfer', 'CreateRecipient', 'Booking' ],
            default: 'login',
          },
        },
      ],

    registrationDate: {
        type: Date,
        default: Date.now, 
    },
    

});





const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;

