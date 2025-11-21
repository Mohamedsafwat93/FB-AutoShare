const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

let driveService = null;
let authenticated = false;

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const KEYFILEPATH = path.join(__dirname, 'google_service.json');

// Initialize Google Drive service
async function initializeGoogleDrive() {
  try {
    if (!fs.existsSync(KEYFILEPATH)) {
      console.log('ℹ️ Google Drive: google_service.json not found');
      return false;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES
    });

    driveService = google.drive({ version: 'v3', auth });
    authenticated = true;
    console.log('✅ Google Drive authenticated');
    return true;
  } catch (error) {
    console.log(`ℹ️ Google Drive initialization failed: ${error.message}`);
    return false;
  }
}

// Get storage quota
async function getStorageQuota() {
  if (!authenticated) return null;

  try {
    const response = await driveService.about.get({
      fields: 'storageQuota'
    });

    const quota = response.data.storageQuota;
    const total = parseInt(quota.limit);
    const used = parseInt(quota.usage);
    const free = total - used;

    return {
      total: Math.round(total / (1024 ** 3) * 100) / 100,
      used: Math.round(used / (1024 ** 3) * 100) / 100,
      free: Math.round(free / (1024 ** 3) * 100) / 100
    };
  } catch (error) {
    console.error(`Storage quota error: ${error.message}`);
    return null;
  }
}

// Upload file to Google Drive (from file path)
async function uploadFileToGoogleDrive(filePath, fileName, folderId = null) {
  if (!authenticated) {
    throw new Error('Google Drive not authenticated');
  }

  try {
    const fileMetadata = { name: fileName };
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      body: fs.createReadStream(filePath)
    };

    const response = await driveService.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, size'
    });

    return {
      success: true,
      fileId: response.data.id,
      fileName: response.data.name,
      url: response.data.webViewLink,
      size: response.data.size,
      storage: 'google-drive'
    };
  } catch (error) {
    throw new Error(`Google Drive upload failed: ${error.message}`);
  }
}

// Upload file to Google Drive (from buffer)
async function uploadToGoogleDrive(fileBuffer, fileName, folderId = null) {
  if (!authenticated) {
    throw new Error('Google Drive not authenticated');
  }

  try {
    if (!Buffer.isBuffer(fileBuffer)) {
      throw new Error('File must be a Buffer');
    }

    // Save buffer to temp file and upload
    const tempFilePath = path.join(__dirname, `.tmp_${Date.now()}_${fileName}`);
    fs.writeFileSync(tempFilePath, fileBuffer);

    try {
      const result = await uploadFileToGoogleDrive(tempFilePath, fileName, folderId);
      return result;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  } catch (error) {
    throw new Error(`Google Drive upload failed: ${error.message}`);
  }
}

// Delete file from Google Drive
async function deleteFromGoogleDrive(fileId) {
  if (!authenticated) {
    throw new Error('Google Drive not authenticated');
  }

  try {
    await driveService.files.delete({
      fileId: fileId
    });

    return {
      success: true,
      fileId: fileId,
      message: 'File deleted from Google Drive'
    };
  } catch (error) {
    throw new Error(`Google Drive delete failed: ${error.message}`);
  }
}

module.exports = {
  initializeGoogleDrive,
  getStorageQuota,
  uploadToGoogleDrive,
  uploadFileToGoogleDrive,
  deleteFromGoogleDrive,
  isAuthenticated: () => authenticated
};
