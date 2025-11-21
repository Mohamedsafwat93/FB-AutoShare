const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { Readable } = require('stream');

let driveService = null;
let authenticated = false;

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Initialize Google Drive service
async function initializeGoogleDrive() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      console.log('ℹ️ Google Drive: credentials.json not found');
      return false;
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if token exists
    let token = null;
    if (fs.existsSync(TOKEN_PATH)) {
      token = JSON.parse(fs.readFileSync(TOKEN_PATH));
      oauth2Client.setCredentials(token);
    } else {
      console.log('⚠️ Google Drive: token.json not found - OAuth authentication required');
      console.log('   Run: node setup-google-drive.js');
      return false;
    }

    driveService = google.drive({ version: 'v3', auth: oauth2Client });
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

// Upload file to Google Drive
async function uploadToGoogleDrive(fileBuffer, fileName, folderId = null) {
  if (!authenticated) {
    throw new Error('Google Drive not authenticated');
  }

  try {
    const fileMetadata = { name: fileName };
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: 'application/octet-stream',
      body: Readable.from(fileBuffer)
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
  deleteFromGoogleDrive,
  isAuthenticated: () => authenticated
};
