const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User  = require('../models/user');
const Transaction  = require('../models/transaction');
const UnassignedTransaction  = require('../models/unassignedTransaction');
const { emailerSender } = require('../controllers/messagecontroller');
const crypto = require("crypto");
const axios = require('axios');
const secretGenKey = 'sk_test_a6bf2e91bdef10b0a318899c76a49050f47fbc70'; 
const secretKey = 'sk_test_a6bf2e91bdef10b0a318899c76a49050f47fbc70'; 
const jwt = require('jsonwebtoken'); 
const { addIdentity, modifyIdentity, deleteIdentity } = require('../controllers/usercontroller');
const Identification = require('../models/identification');

require('dotenv').config();





// Encryption function (as defined earlier)
function encrypt(text, key, iv) {
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv));
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString('hex');
}








// Getting user profile along with identifications
router.get('/:userId', async (req, res) => {
  try {
    // Fetch the user by ID and populate identifications
    const user = await User.findById(req.params.userId).populate('identifications');
    
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Fetch identifications from the user's identifications
    const identifications = await Identification.find({ _id: { $in: user.identifications } });
    const transactions = await Transaction.find({ _id: { $in: user.transactions } });

    // Construct user profile response with identifications
    const userProfile = {
      ...user.toObject(),
      identifications: identifications,
      transactions: transactions
    };

    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).send('Internal Server Error');
  }
});




// Updating user details
router.put('/update/:userId', async (req, res) => {

  try {
    const userId = req.params.userId;

        // Extract updated address details from request body
    const updatedAddress = req.body.address ? {
      state: req.body.address.state,
      lga: req.body.address.lga,
      area: req.body.address.area,
      street: req.body.address.street,
      building: req.body.address.building,
      address: req.body.address.address,

    } : undefined;
    
    const updatedDetails = {
      emailVerified: false,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      gender: req.body.gender,
      dob: req.body.dob,
      address: updatedAddress, 
    };


    const updatedUser = await User.findByIdAndUpdate(userId, updatedDetails, {
          new: true, 
    });

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.status(200).send(updatedUser);
  } catch (error) {
    res.status(500).send(error);
  }
});


// Updating user details
router.put('/updatedriverslicnse/:userId', async (req, res) => {

  try {
    const userId = req.params.userId;
    const nowDate = new Date().toISOString();
    
    const updatedDetails = {
      driversLicenseId: req.body.id,
      driversLicenseExpiringDate: req.body.expiringDate,
      driversLicenseUpdated: nowDate,
    };


    const updatedUser = await User.findByIdAndUpdate(userId, updatedDetails, {
          new: true, 
    });

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.status(200).send(updatedUser);
  } catch (error) {
    res.status(500).send(error);
  }
});

// link User card
router.put('/linkcard/:userId', async (req, res) => {
  
  try {
    const userId = req.params.userId;
    console.log('Received userId:', userId);
    const updatedDetails = {
      email: req.body.email,
      cardToken: req.body.cardToken,
      cardType: req.body.cardType,
      last4digits: req.body.last4digits,
      cardLinked: req.body.cardLinked,
     
    };

    console.log(updatedDetails)
    const updatedUser = await User.findByIdAndUpdate(userId, updatedDetails, {
      new: true, // Return the updated user
    });
    console.log('passed the id check')

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.status(200).send(updatedUser);
  } catch (error) {
    res.status(500).send(error);
  }
});




// link User card
router.put('/delinkcard/:userId', async (req, res) => {
  
  try {
    const userId = req.params.userId;
    console.log('Received userId:', userId);
    const updatedDetails = {
      cardToken: '',
      cardType: '',
      last4digits: '',
      cardLinked: false,
     
    };

  
    const updatedUser = await User.findByIdAndUpdate(userId, updatedDetails, {
      new: true, // Return the updated user
    });
    

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.status(200).send(updatedUser);
  } catch (error) {
    res.status(500).send(error);
  }
});


// verify user email
router.put('/updateemail/:userId', async (req, res) => {
  
  try {
    const userId = req.params.userId;
    const email = req.body.email;
    const updatedDetails = {
      emailVerified: true,
      email: email,
     
    };

    console.log(updatedDetails)
    const updatedUser = await User.findByIdAndUpdate(userId, updatedDetails, {
      new: true, // Return the updated user
    });
    console.log('passed the id check')

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.status(200).send(updatedUser);
  } catch (error) {
    res.status(500).send(error);
  }
});


const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString(); // Generates a 6-digit number
};



// POST /send-email endpoint
router.post('/sendemailcode/:userId', async (req, res) => {
  const { to } = req.body;
  const subject = 'Email verification';

  const otp = generateOtp();
  const currentYear = new Date().getFullYear().toString();
  
  const htmlContent = `

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
<title></title>
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<!--[if !mso]>-->
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<!--<![endif]-->
<meta name="x-apple-disable-message-reformatting" content="" />
<meta content="target-densitydpi=device-dpi" name="viewport" />
<meta content="true" name="HandheldFriendly" />
<meta content="width=device-width" name="viewport" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
<style type="text/css">
table {
border-collapse: separate;
table-layout: fixed;
mso-table-lspace: 0pt;
mso-table-rspace: 0pt
}
table td {
border-collapse: collapse
}
.ExternalClass {
width: 100%
}
.ExternalClass,
.ExternalClass p,
.ExternalClass span,
.ExternalClass font,
.ExternalClass td,
.ExternalClass div {
line-height: 100%
}
body, a, li, p, h1, h2, h3 {
-ms-text-size-adjust: 100%;
-webkit-text-size-adjust: 100%;
}
html {
-webkit-text-size-adjust: none !important
}
body, #innerTable {
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale
}
#innerTable img+div {
display: none;
display: none !important
}
img {
Margin: 0;
padding: 0;
-ms-interpolation-mode: bicubic
}
h1, h2, h3, p, a {
line-height: inherit;
overflow-wrap: normal;
white-space: normal;
word-break: break-word
}
a {
text-decoration: none
}
h1, h2, h3, p {
min-width: 100%!important;
width: 100%!important;
max-width: 100%!important;
display: inline-block!important;
border: 0;
padding: 0;
margin: 0
}
a[x-apple-data-detectors] {
color: inherit !important;
text-decoration: none !important;
font-size: inherit !important;
font-family: inherit !important;
font-weight: inherit !important;
line-height: inherit !important
}
u + #body a {
color: inherit;
text-decoration: none;
font-size: inherit;
font-family: inherit;
font-weight: inherit;
line-height: inherit;
}
a[href^="mailto"],
a[href^="tel"],
a[href^="sms"] {
color: inherit;
text-decoration: none
}
img,p{margin:0;Margin:0;font-family:Lato,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}h1{margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:400;font-style:normal;font-size:28px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}h2{margin:0;Margin:0;font-family:Lato,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:30px;font-weight:400;font-style:normal;font-size:24px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}h3{margin:0;Margin:0;font-family:Lato,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:26px;font-weight:400;font-style:normal;font-size:20px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}
</style>
<style type="text/css">
@media (min-width: 481px) {
.hd { display: none!important }
}
</style>
<style type="text/css">
@media (max-width: 480px) {
.hm { display: none!important }
}
</style>
<style type="text/css">
@media (min-width: 481px) {
h1,img,p{margin:0;Margin:0}.t17,.t20{display:block!important}.t1,.t15,.t18,.t5,.t9{width:480px!important}img,p{font-family:Lato,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}h1{font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:400;font-style:normal;font-size:28px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}h2,h3{margin:0;Margin:0;font-family:Lato,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;font-weight:400;font-style:normal;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}h2{line-height:30px;font-size:24px}h3{line-height:26px;font-size:20px}.t17{mso-line-height-alt:60px!important;line-height:60px!important}.t20{mso-line-height-alt:6px!important;line-height:6px!important}.t18{padding:60px!important;border-radius:8px!important;overflow:hidden!important}.t69,.t72,.t75,.t77{width:520px!important}.t68{text-align:left!important}.t26{mso-line-height-alt:inherit!important;line-height:inherit!important;font-size:0px!important}.t27{width:20%!important}.t24{padding-right:15px!important}.t23{Margin-left:0px!important}.t67{width:80%!important}.t65{padding-bottom:10px!important}.t33,.t39,.t45,.t51,.t63{width:15.14423%!important}.t57{width:16.34615%!important}
}
</style>
<style type="text/css">@media (min-width: 481px) {[class~="x_t17"]{mso-line-height-alt:60px!important;line-height:60px!important;display:block!important;} [class~="x_t20"]{mso-line-height-alt:6px!important;line-height:6px!important;display:block!important;} [class~="x_t18"]{padding-left:60px!important;padding-top:60px!important;padding-bottom:60px!important;padding-right:60px!important;border-top-left-radius:8px!important;border-top-right-radius:8px!important;border-bottom-right-radius:8px!important;border-bottom-left-radius:8px!important;overflow:hidden!important;width:480px!important;} [class~="x_t1"]{width:480px!important;} [class~="x_t5"]{width:480px!important;} [class~="x_t15"]{width:480px!important;} [class~="x_t9"]{width:480px!important;} [class~="x_t77"]{width:520px!important;} [class~="x_t69"]{width:520px!important;} [class~="x_t68"]{text-align:left!important;} [class~="x_t26"]{mso-line-height-alt:inherit!important;line-height:inherit!important;font-size:0px!important;} [class~="x_t27"]{width:20%!important;} [class~="x_t24"]{padding-right:15px!important;} [class~="x_t23"]{Margin-left:0px!important;} [class~="x_t67"]{width:80%!important;} [class~="x_t65"]{padding-bottom:10px!important;} [class~="x_t33"]{width:15.14423%!important;} [class~="x_t45"]{width:15.14423%!important;} [class~="x_t51"]{width:15.14423%!important;} [class~="x_t57"]{width:16.34615%!important;} [class~="x_t63"]{width:15.14423%!important;} [class~="x_t72"]{width:520px!important;} [class~="x_t75"]{width:520px!important;} [class~="x_t39"]{width:15.14423%!important;}}</style>
<style type="text/css" media="screen and (min-width:481px)">.moz-text-html img,.moz-text-html p{margin:0;Margin:0;font-family:Lato,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}.moz-text-html h1{margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:400;font-style:normal;font-size:28px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}.moz-text-html h2{margin:0;Margin:0;font-family:Lato,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:30px;font-weight:400;font-style:normal;font-size:24px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}.moz-text-html h3{margin:0;Margin:0;font-family:Lato,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:26px;font-weight:400;font-style:normal;font-size:20px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}.moz-text-html .t17{mso-line-height-alt:60px!important;line-height:60px!important;display:block!important}.moz-text-html .t20{mso-line-height-alt:6px!important;line-height:6px!important;display:block!important}.moz-text-html .t18{padding:60px!important;border-radius:8px!important;overflow:hidden!important;width:480px!important}.moz-text-html .t1,.moz-text-html .t15,.moz-text-html .t5,.moz-text-html .t9{width:480px!important}.moz-text-html .t69,.moz-text-html .t77{width:520px!important}.moz-text-html .t68{text-align:left!important}.moz-text-html .t26{mso-line-height-alt:inherit!important;line-height:inherit!important;font-size:0px!important}.moz-text-html .t27{width:20%!important}.moz-text-html .t24{padding-right:15px!important}.moz-text-html .t23{Margin-left:0px!important}.moz-text-html .t67{width:80%!important}.moz-text-html .t65{padding-bottom:10px!important}.moz-text-html .t33,.moz-text-html .t45,.moz-text-html .t51{width:15.14423%!important}.moz-text-html .t57{width:16.34615%!important}.moz-text-html .t63{width:15.14423%!important}.moz-text-html .t72,.moz-text-html .t75{width:520px!important}.moz-text-html .t39{width:15.14423%!important}</style>
<!--[if !mso]>-->
<link href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@400;700;800&amp;family=Inter+Tight:wght@500&amp;display=swap" rel="stylesheet" type="text/css" />
<!--<![endif]-->
<!--[if mso]>
<style type="text/css">
img,p{margin:0;Margin:0;font-family:Lato,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:22px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}h1{margin:0;Margin:0;font-family:Roboto,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:34px;font-weight:400;font-style:normal;font-size:28px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}h2{margin:0;Margin:0;font-family:Lato,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:30px;font-weight:400;font-style:normal;font-size:24px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}h3{margin:0;Margin:0;font-family:Lato,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:26px;font-weight:400;font-style:normal;font-size:20px;text-decoration:none;text-transform:none;letter-spacing:0;direction:ltr;color:#333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px}div.t17{mso-line-height-alt:60px !important;line-height:60px !important;display:block !important}div.t20{mso-line-height-alt:6px !important;line-height:6px !important;display:block !important}td.t18{padding:60px !important;border-radius:8px !important;overflow:hidden !important}div.t68{text-align:left !important}div.t26{mso-line-height-alt:inherit !important;line-height:inherit !important;font-size:0px !important}div.t27{width:20% !important}td.t24{padding-right:15px !important}table.t23{Margin-left:0px !important}div.t67{width:80% !important}td.t65{padding-bottom:10px !important}div.t33,div.t45,div.t51{width:15.14423% !important}div.t57{width:16.34615% !important}div.t39,div.t63{width:15.14423% !important}
</style>
<![endif]-->
<!--[if mso]>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
<![endif]-->
</head>
<body id=body class=t82 style="min-width:100%;Margin:0px;padding:0px;background-color:#000000;"><div class=t81 style="background-color:#000000;"><table role=presentation width=100% cellpadding=0 cellspacing=0 border=0 align=center><tr><td class=t80 style="font-size:0;line-height:0;mso-line-height-rule:exactly;background-color:#000000;" valign=top align=center>
<!--[if mso]>
<v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false">
<v:fill color=#000000/>
</v:background>
<![endif]-->
<table role=presentation width=100% cellpadding=0 cellspacing=0 border=0 align=center id=innerTable><tr><td><div class=t17 style="mso-line-height-rule:exactly;font-size:1px;display:none;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t19 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;">
<tr>
<!--[if mso]>
<td width=600 class=t18 style="background-color:#FFFFFF;padding:40px 40px 40px 40px;">
<![endif]-->
<!--[if !mso]>-->
<td class=t18 style="background-color:#FFFFFF;width:400px;padding:40px 40px 40px 40px;">
<!--<![endif]-->
<table role=presentation width=100% cellpadding=0 cellspacing=0 style="width:100%!important;"><tr><td align=center>
<table class=t2 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;">
<tr>
<!--[if mso]>
<td width=480 class=t1>
<![endif]-->
<!--[if !mso]>-->
<td class=t1 style="width:400px;">
<!--<![endif]-->
<h1 class=t0 style="margin:0;Margin:0;font-family:Albert Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:41px;font-weight:800;font-style:normal;font-size:39px;text-decoration:none;text-transform:none;letter-spacing:-1.56px;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:1px;">Confirm your email address</h1></td>
</tr></table>
</td></tr><tr><td><div class=t3 style="mso-line-height-rule:exactly;mso-line-height-alt:16px;line-height:16px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t6 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;">
<tr>
<!--[if mso]>
<td width=480 class=t5>
<![endif]-->
<!--[if !mso]>-->
<td class=t5 style="width:400px;">
<!--<![endif]-->
<p class=t4 style="margin:0;Margin:0;font-family:Albert Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:21px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;letter-spacing:-0.64px;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">Your verification code is:</p></td>
</tr></table>
</td></tr><tr><td><div class=t8 style="mso-line-height-rule:exactly;mso-line-height-alt:26px;line-height:26px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t10 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;">
<tr>
<!--[if mso]>
<td width=480 class=t9>
<![endif]-->
<!--[if !mso]>-->
<td class=t9 style="width:400px;">
<!--<![endif]-->
<p class=t7 style="margin:0;Margin:0;font-family:Albert Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:21px;font-weight:400;font-style:normal;font-size:60px;text-decoration:none;text-transform:none;letter-spacing:-0.64px;direction:ltr;color:#333333;text-align:center;mso-line-height-rule:exactly;mso-text-raise:-12px;">${otp}</p></td>
</tr></table>
</td></tr><tr><td><div class=t11 style="mso-line-height-rule:exactly;mso-line-height-alt:34px;line-height:34px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t16 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;">
<tr>
<!--[if mso]>
<td width=480 class=t15>
<![endif]-->
<!--[if !mso]>-->
<td class=t15 style="width:400px;">
<!--<![endif]-->
<p class=t14 style="margin:0;Margin:0;font-family:Albert Sans,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:21px;font-weight:400;font-style:normal;font-size:16px;text-decoration:none;text-transform:none;letter-spacing:-0.64px;direction:ltr;color:#333333;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">This code is valid for <span class=t13 style="margin:0;Margin:0;mso-line-height-rule:exactly;"><span class=t12 style="margin:0;Margin:0;font-weight:700;mso-line-height-rule:exactly;">24 hours</span></span>. If you did not initiate this request, please ignore this email and contact us so we can help secure your account.</p></td>
</tr></table>
</td></tr></table></td>
</tr></table>
</td></tr><tr><td><div class=t20 style="mso-line-height-rule:exactly;font-size:1px;display:none;">&nbsp;&nbsp;</div></td></tr><tr><td align=center>
<table class=t78 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;">
<tr>
<!--[if mso]>
<td width=600 class=t77 style="background-color:#FFFFFF;overflow:hidden;padding:13px 40px 20px 40px;border-radius:10px 10px 10px 10px;">
<![endif]-->
<!--[if !mso]>-->
<td class=t77 style="background-color:#FFFFFF;overflow:hidden;width:400px;padding:13px 40px 20px 40px;border-radius:10px 10px 10px 10px;">
<!--<![endif]-->
<table role=presentation width=100% cellpadding=0 cellspacing=0 style="width:100%!important;"><tr><td align=center>
<table class=t70 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;">
<tr>
<!--[if mso]>
<td width=520 class=t69>
<![endif]-->
<!--[if !mso]>-->
<td class=t69 style="width:400px;">
<!--<![endif]-->
<div class=t68 style="display:inline-table;width:100%;text-align:center;vertical-align:middle;">
<!--[if mso]>
<table role=presentation cellpadding=0 cellspacing=0 align=left valign=middle width=520><tr><td width=104 valign=middle><![endif]-->
<div class=t27 style="display:inline-table;text-align:initial;vertical-align:inherit;width:100%;max-width:200px;">
<table role=presentation width=100% cellpadding=0 cellspacing=0 class=t25 style="width:100%!important;"><tr>
<td class=t24><table role=presentation width=100% cellpadding=0 cellspacing=0 style="width:100%!important;"><tr><td align=left>
<table class=t23 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;">
<tr>
<!--[if mso]>
<td width=55 class=t22>
<![endif]-->
<!--[if !mso]>-->
<td class=t22 style="width:55px;">
<!--<![endif]-->
<a href="https://www.myogamechanic.com" style="font-size:0px;" target=_blank><img class=t21 style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width=55 height=42.421875 alt="" src="https://res.cloudinary.com/dmrazjf6c/image/upload/v1724558972/mom/socialLogos/1.png"/></a></td>
</tr></table>
</td></tr></table></td>
</tr></table>
<div class=t26 style="mso-line-height-rule:exactly;mso-line-height-alt:15px;line-height:15px;font-size:1px;display:block;">&nbsp;&nbsp;</div></div>
<!--[if mso]>
</td><td width=416 valign=middle><![endif]-->
<div class=t67 style="display:inline-table;text-align:initial;vertical-align:inherit;width:100%;max-width:800px;">
<table role=presentation width=100% cellpadding=0 cellspacing=0 class=t66 style="width:100%!important;"><tr>
<td class=t65 style="padding:10px 0 11px 0;"><div class=t64 style="display:inline-table;width:100%;text-align:right;vertical-align:middle;">
<!--[if mso]>
<table role=presentation cellpadding=0 cellspacing=0 align=right valign=middle width=383><tr><td class=t29 style="width:17px;" width=17></td><td width=29 valign=middle><![endif]-->
<div class=t33 style="display:inline-table;text-align:initial;vertical-align:inherit;width:7.875%;max-width:63px;"><div class=t32 style="padding:0 17px 0 17px;">
<table role=presentation width=100% cellpadding=0 cellspacing=0 class=t31 style="width:100%!important;"><tr>
<td class=t30><a href="https://wa.me/07011962523?text=Hello,%20I%20need%20more%20information%20on%20My%20Oga%20Mechanic" style="font-size:0px;" target=_blank><img class=t28 style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width=29 height=28.984375 alt="" src="https://res.cloudinary.com/dmrazjf6c/image/upload/v1724558972/mom/socialLogos/2.png"/></a></td>
</tr></table>
</div></div>
<!--[if mso]>
</td><td class=t29 style="width:17px;" width=17></td><td class=t35 style="width:17px;" width=17></td><td width=29 valign=middle><![endif]-->
<div class=t39 style="display:inline-table;text-align:initial;vertical-align:inherit;width:7.875%;max-width:63px;"><div class=t38 style="padding:0 17px 0 17px;">
<table role=presentation width=100% cellpadding=0 cellspacing=0 class=t37 style="width:100%!important;"><tr>
<td class=t36><a href="https://www.instagram.com/myogamechanic/" style="font-size:0px;" target=_blank><img class=t34 style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width=29 height=28.984375 alt="" src="https://res.cloudinary.com/dmrazjf6c/image/upload/v1724558971/mom/socialLogos/7.png"/></a></td>
</tr></table>
</div></div>
<!--[if mso]>
</td><td class=t35 style="width:17px;" width=17></td><td class=t41 style="width:17px;" width=17></td><td width=29 valign=middle><![endif]-->
<div class=t45 style="display:inline-table;text-align:initial;vertical-align:inherit;width:7.875%;max-width:63px;"><div class=t44 style="padding:0 17px 0 17px;">
<table role=presentation width=100% cellpadding=0 cellspacing=0 class=t43 style="width:100%!important;"><tr>
<td class=t42><a href="https://web.facebook.com/myogamechanic/" style="font-size:0px;" target=_blank><img class=t40 style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width=29 height=28.328125 alt="" src="https://res.cloudinary.com/dmrazjf6c/image/upload/v1724558971/mom/socialLogos/3.png"/></a></td>
</tr></table>
</div></div>
<!--[if mso]>
</td><td class=t47 style="width:17px;" width=17></td><td class=t53 style="width:17px;" width=17></td><td width=34 valign=middle><![endif]-->
<div class=t57 style="display:inline-table;text-align:initial;vertical-align:inherit;width:8.5%;max-width:68px;"><div class=t56 style="padding:0 17px 0 17px;">
<table role=presentation width=100% cellpadding=0 cellspacing=0 class=t55 style="width:100%!important;"><tr>
<td class=t54><a href="https://www.youtube.com/@myogamechanic" style="font-size:0px;" target=_blank><img class=t52 style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width=34 height=23.71875 alt="" src="https://res.cloudinary.com/dmrazjf6c/image/upload/v1724558971/mom/socialLogos/5.png"/></a></td>
</tr></table>
</div></div>
<!--[if mso]>
</td><td class=t53 style="width:17px;" width=17></td><td class=t59 style="width:17px;" width=17></td><td width=29 valign=middle><![endif]-->
<div class=t63 style="display:inline-table;text-align:initial;vertical-align:inherit;width:7.875%;max-width:63px;"><div class=t62 style="padding:0 17px 0 17px;">
<table role=presentation width=100% cellpadding=0 cellspacing=0 class=t61 style="width:100%!important;"><tr>
<td class=t60><a href="https://x.com/myogamechanic" style="font-size:0px;" target=_blank><img class=t58 style="display:block;border:0;height:auto;width:100%;Margin:0;max-width:100%;" width=29 height=28.984375 alt="" src="https://res.cloudinary.com/dmrazjf6c/image/upload/v1724558971/mom/socialLogos/6.png"/></a></td>
</tr></table>
</div></div>
<!--[if mso]>
</td><td class=t59 style="width:17px;" width=17></td>
</tr></table>
<![endif]-->
</div></td>
</tr></table>
</div>
<!--[if mso]>
</td>
</tr></table>
<![endif]-->
</div></td>
</tr></table>
</td></tr><tr><td align=center>
<table class=t73 role=presentation cellpadding=0 cellspacing=0 style="Margin-left:auto;Margin-right:auto;">
<tr>
<!--[if mso]>
<td width=520 class=t72>
<![endif]-->
<!--[if !mso]>-->
<td class=t72 style="width:400px;">
<!--<![endif]-->
<p class=t71 style="margin:0;Margin:0;font-family:Inter Tight,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:21px;font-weight:500;font-style:normal;font-size:14px;text-decoration:none;text-transform:none;direction:ltr;color:#777777;text-align:left;mso-line-height-rule:exactly;mso-text-raise:2px;">www.myogamechanic.com</p></td>
</tr></table>
</td></tr><tr><td align=left>
<table class=t76 role=presentation cellpadding=0 cellspacing=0 style="Margin-right:auto;">
<tr>
<!--[if mso]>
<td width=520 class=t75>
<![endif]-->
<!--[if !mso]>-->
<td class=t75 style="width:400px;">
<!--<![endif]-->
<p class=t74 style="margin:0;Margin:0;font-family:Inter Tight,BlinkMacSystemFont,Segoe UI,Helvetica Neue,Arial,sans-serif;line-height:21px;font-weight:500;font-style:normal;font-size:12px;text-decoration:none;text-transform:none;direction:ltr;color:#777777;text-align:left;mso-line-height-rule:exactly;mso-text-raise:3px;">Copyright © ${currentYear} All rights reserved.</p></td>
</tr></table>
</td></tr></table></td>
</tr></table>
</td></tr><tr><td><div class=t79 style="mso-line-height-rule:exactly;mso-line-height-alt:45px;line-height:45px;font-size:1px;display:block;">&nbsp;&nbsp;</div></td></tr></table></td></tr></table></div></body>
</html>`;


  try {
    // Define the email options
    const mailOptions = {
      from: '"My Oga Mechanic" <verify@myogamechanic.com>', // Sender address
      to,        // List of recipients
      subject,   // Subject line
      html: htmlContent,      // HTML body (optional)
    };

    console.log('Attempting to send email...');
    const info = await emailerSender.sendMail(mailOptions);

    console.log('Message sent: %s', info.messageId);
    res.status(200).json({ message: 'Email sent successfully', otp: otp });
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.code === 'ETIMEDOUT') {
      console.error('Connection timed out. Check your SMTP settings and network.');
    }
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});


// Updating or creating a single subscription for the user
router.put('/subscription/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    // Extract subscription data from the request body sent by Flutter
    const updatedSubscription = req.body.subscription;

    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Update or create the subscription field
    user.subscription = {
      isSubscribed: updatedSubscription.isSubscribed,
      name: updatedSubscription.name,
      cycle: updatedSubscription.cycle,
      renewalDate: updatedSubscription.renewalDate,
      numberOfCars: updatedSubscription.numberOfCars,
    };

    // Save the updated user
    const updatedUser = await user.save();

    res.status(200).send(updatedUser);
  } catch (error) {
    res.status(500).send({ error: error.message || 'Server Error' });
  }
});





//add Id route
router.post('/addid/:userId', async (req, res) => {
  try {
      const { userId } = req.params;
      const { idNumber, idType, expiringDate } = req.body;

      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).send('User not found');
      }

      const updated = new Date().toISOString();

      user.identity = { 
                      idNumber, 
                      idType, 
                      expiringDate,
                      updated 
                      };

      await user.save();

      res.status(200).send(user);
  } catch (error) {
      res.status(500).send(error.message);
  }
});


//Update Id route

router.put('/updateid/:userId', async (req, res) => {
  try {
      const { userId } = req.params;
      const { idNumber, idType, expiringDate } = req.body;

      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).send('User not found');
      }

      // Update the identity details
      user.identity.idNumber = idNumber || user.identity.idNumber;
      user.identity.idType = idType || user.identity.idType;
      user.identity.expiringDate = expiringDate || user.identity.expiringDate;
      
      // Set updated date to the current time
      user.identity.updated = new Date().toISOString();

      await user.save();

      res.status(200).send(user);
  } catch (error) {
      res.status(500).send(error.message);
  }
});


//Delete Id route
router.delete('/deleteid/:userId', async (req, res) => {
  try {
      const { userId } = req.params;

      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).send('User not found');
      }

      // Remove the identity details
      user.identity = undefined;
      await user.save();

      res.status(200).send('Identity removed');
  } catch (error) {
      res.status(500).send(error.message);
  }
});




router.post('/identity/add/:userId', addIdentity);
router.put('/identity/modify/:userId', modifyIdentity);
router.delete('/identity/delete/:userId', deleteIdentity);



// Define the route for handling the API request
router.post('/identification/add', async (req, res) => {
  const { userId, IDImage, IDNumber, IDType, status, firstName, lastName, dob } = req.body;

  try {
    // Create a new identification
    const newIdentification = new Identification({
      IDImage,
      IDNumber,
      IDType,
      status,
      firstName,
      lastName,
      dob
    });

    // Save the identification to the database
    await newIdentification.save();

    // Find the user and update the identification array
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add the new identification to the user's identification array
    user.identification.push(newIdentification._id);
    await user.save();

    res.status(201).json({
      message: 'Identification added successfully',
      identification: newIdentification,
    });
  } catch (error) {
    console.error('Error adding identification:', error);
    res.status(500).json({ message: 'Failed to add identification', error: error.message });
  }
});

router.post('/verify', async (req, res) => {
  const { firstName, lastName, dob, searchParameter, idType } = req.body;

  // Map the idType to the corresponding verificationType and API key
  let verificationType;
  let apiKey;
  let requestBody = {}; // Initialize an empty request body

  switch (idType) {
      case "NIN":
          verificationType = "NIN-VERIFY";  // For National Identity Number
          apiKey = process.env.SEAMFIX_NIN_APIKEY;  // API key for NIN
          requestBody = {
              verificationType: verificationType,
              countryCode: "NG",
              searchParameter: searchParameter
          };
          break;
      case "DL":
          verificationType = "DRIVER-LICENSE-FULL-DETAIL-VERIFICATION";  // For Driver's License
          apiKey = process.env.SEAMFIX_DRIVERSLINCENS_APIKEY;  // API key for Driver's License
          requestBody = {
              dob: dob,
              searchParameter: searchParameter,
              verificationType: verificationType
          };
          break;
      case "VC":
          verificationType = "VIN-FULL-DETAILS-VERIFICATION";  // For Voter's Card
          apiKey = process.env.SEAMFIX_VOTERSCARD_APIKEY;  // API key for Voter's Card
          requestBody = {
              searchParameter: searchParameter,
              countryCode: "NG",
              verificationType: verificationType
          };
          break;
      case "IP":
          verificationType = "PASSPORT-FULL-DETAILS";  // For International Passport
          apiKey = process.env.SEAMFIX_INTERNATIONALPASSPORT_APIKEY;  // API key for International Passport
          requestBody = {
              verificationType: verificationType,
              searchParameter: searchParameter,
              lastName: lastName
          };
          break;
      default:
          return res.status(400).json({ message: 'Invalid ID type provided' });
  }

  try {
      const response = await axios.post('https://api.verified.africa/sfx-verify/v3/id-service/', 
          requestBody, 
          {
              headers: {
                  'accept': 'application/json',
                  'apiKey': apiKey,
                  'content-type': 'application/json',
                  'userid': process.env.SEAMFIX_USERID
              }
          }
      );

      res.status(200).json(response.data);
  } catch (error) {
      console.error('Error verifying ID:', error);
      res.status(500).json({ message: 'Failed to verify ID', error: error.response ? error.response.data : error.message });
  }
});



router.put('/deactivate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;  // Get the reason from the request body

    if (!reason) {
      return res.status(400).json({ error: 'Reason for deactivation is required' });
    }

    // Find user by userId and update the status to 'deactivated' and add the reason
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { 
        status: 'deactivated',
        deactivationReason: reason,
        deactivatedAt: new Date().toISOString()  // Add a timestamp for when the account was deactivated
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ 
      message: 'User has been deactivated', 
      
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});



// Update PIN endpoint
router.post('/changepin', async (req, res) => {
  try {
    const { currentPin, newPin, userId } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if the current PIN matches
    const isMatch = bcrypt.compare(currentPin, user.pin);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect PIN provided' });
    }

    // Hash the new PIN
    const saltRounds = 10;
    const hashedNewPin = await bcrypt.hash(newPin, saltRounds);

    // Update the PIN
    user.pin = hashedNewPin;
    await user.save();

    res.status(200).json({ message: 'PIN updated successfully' });
  } catch (error) {
    console.error('Error updating PIN:', error);
    res.status(500).json({ error: 'An error occurred while updating the PIN' });
  }
});


module.exports = router;
