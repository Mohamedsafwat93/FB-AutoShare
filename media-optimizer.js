const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Optimize image for Facebook
async function optimizeImage(filePath, maxWidth = 1200, maxHeight = 1200, quality = 80) {
  try {
    const outputPath = filePath.replace(/\.[^.]+$/, '-optimized.jpg');
    
    await sharp(filePath)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: quality, progressive: true })
      .toFile(outputPath);
    
    // Remove original and rename optimized
    fs.unlinkSync(filePath);
    fs.renameSync(outputPath, filePath);
    
    const stats = fs.statSync(filePath);
    console.log(`✅ Image optimized: ${path.basename(filePath)} (${(stats.size / 1024).toFixed(2)} KB)`);
    
    return true;
  } catch(err) {
    console.error('⚠️ Image optimization failed:', err.message);
    // Return true anyway - continue with original file
    return true;
  }
}

// Validate image before upload
async function validateImage(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    
    if(!metadata.format) {
      return { valid: false, error: 'Invalid image format' };
    }
    
    if(metadata.width < 200 || metadata.height < 200) {
      return { valid: false, error: 'Image too small (minimum 200x200)' };
    }
    
    return { valid: true, format: metadata.format, dimensions: `${metadata.width}x${metadata.height}` };
  } catch(err) {
    return { valid: false, error: err.message };
  }
}

module.exports = {
  optimizeImage,
  validateImage
};
