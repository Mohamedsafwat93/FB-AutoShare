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

    const credentials = JSON.parse(fs.readFileSync(KEYFILEPATH, 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
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

// Delete all files in a folder
async function deleteAllFilesInFolder(folderId) {
  if (!authenticated) {
    throw new Error('Google Drive not authenticated');
  }

  try {
    const response = await driveService.files.list({
      q: `'${folderId}' in parents`,
      fields: 'files(id, name)',
      pageSize: 1000
    });

    const files = response.data.files || [];
    
    for (const file of files) {
      await driveService.files.delete({ fileId: file.id });
    }

    return {
      deletedCount: files.length,
      files: files
    };
  } catch (error) {
    throw new Error(`Error deleting files: ${error.message}`);
  }
}

// Upload all files from a local folder
async function uploadAllFilesFromFolder(localFolderPath, folderId) {
  if (!authenticated) {
    throw new Error('Google Drive not authenticated');
  }

  if (!fs.existsSync(localFolderPath)) {
    throw new Error(`Local folder not found: ${localFolderPath}`);
  }

  try {
    const files = fs.readdirSync(localFolderPath);
    const results = [];

    for (const fileName of files) {
      const filePath = path.join(localFolderPath, fileName);
      const stats = fs.statSync(filePath);

      if (stats.isFile()) {
        try {
          const result = await uploadFileToGoogleDrive(filePath, fileName, folderId);
          results.push({
            file: fileName,
            status: 'uploaded',
            fileId: result.fileId,
            url: result.url
          });
        } catch (err) {
          results.push({
            file: fileName,
            status: 'failed',
            error: err.message
          });
        }
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Error uploading files: ${error.message}`);
  }
}

module.exports = {
  initializeGoogleDrive,
  getStorageQuota,
  uploadToGoogleDrive,
  uploadFileToGoogleDrive,
  deleteFromGoogleDrive,
  deleteAllFilesInFolder,
  uploadAllFilesFromFolder,
  isAuthenticated: () => authenticated
};
