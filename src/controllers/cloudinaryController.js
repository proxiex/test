
const dotenv = require('dotenv');
const axios = require('axios');
const FormData = require('form-data');
dotenv.config();

const cloudinaryApiUrl = process.env.CLOUDINARY_API_URL;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(fileBuffer, uploadType, documentType, userIdOrVehicleId) {
  try {
    const formattedDate = new Date().toISOString().replace(/:/g, '-');
    
    let folderPath = '';
    if (uploadType === 'userIdentity') {
      folderPath = `documents/users/${ userIdOrVehicleId}`;
    } else if (uploadType === 'vehicleDocuments') {
      folderPath = `documents/vehicles/${ userIdOrVehicleId}`;
    } else {
      throw new Error('Unsupported upload type');
    }

    const publicId = `${folderPath}/${documentType}_${formattedDate}`;

    const form = new FormData();
    form.append('file', fileBuffer, { filename: 'file' }); // Use buffer with filename
    form.append('upload_preset', uploadPreset);
    form.append('public_id', publicId);

    const response = await axios.post(cloudinaryApiUrl, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    return {
      success: true,
      url: response.data.secure_url,
      publicId: response.data.public_id,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  uploadToCloudinary,
};
