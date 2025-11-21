const weedClient = require('seaweedfs');

let seaweedfs = null;

// Initialize SeaweedFS client
function initializeSeaweedFS() {
  try {
    const master = process.env.SEAWEEDFS_MASTER || 'localhost';
    const port = process.env.SEAWEEDFS_PORT || 9333;
    
    seaweedfs = new weedClient({
      server: master,
      port: port
    });
    
    console.log(`✅ SeaweedFS initialized (${master}:${port})`);
    return true;
  } catch (error) {
    console.log(`ℹ️ SeaweedFS unavailable: ${error.message}`);
    return false;
  }
}

// Upload file to SeaweedFS
async function uploadToSeaweedFS(fileBuffer, fileName) {
  if (!seaweedfs) {
    throw new Error('SeaweedFS not initialized');
  }
  
  try {
    const fileInfo = await seaweedfs.write(fileBuffer, {
      name: fileName
    });
    
    return {
      success: true,
      fid: fileInfo.fid,
      fileName: fileName,
      size: fileBuffer.length,
      url: `http://${process.env.SEAWEEDFS_MASTER || 'localhost'}:8080/static/${fileInfo.fid}`,
      storage: 'seaweedfs'
    };
  } catch (error) {
    throw new Error(`SeaweedFS upload failed: ${error.message}`);
  }
}

// Read file from SeaweedFS
async function readFromSeaweedFS(fid) {
  if (!seaweedfs) {
    throw new Error('SeaweedFS not initialized');
  }
  
  try {
    const buffer = await seaweedfs.read(fid);
    return buffer;
  } catch (error) {
    throw new Error(`SeaweedFS read failed: ${error.message}`);
  }
}

// Delete file from SeaweedFS
async function deleteFromSeaweedFS(fid) {
  if (!seaweedfs) {
    throw new Error('SeaweedFS not initialized');
  }
  
  try {
    await seaweedfs.remove(fid);
    return {
      success: true,
      fid: fid,
      message: 'File deleted from SeaweedFS'
    };
  } catch (error) {
    throw new Error(`SeaweedFS delete failed: ${error.message}`);
  }
}

// Get SeaweedFS master status
async function getSeaweedFSStatus() {
  if (!seaweedfs) {
    return { status: 'unavailable' };
  }
  
  try {
    const status = await seaweedfs.masterStatus();
    return status;
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

module.exports = {
  initializeSeaweedFS,
  uploadToSeaweedFS,
  readFromSeaweedFS,
  deleteFromSeaweedFS,
  getSeaweedFSStatus
};
