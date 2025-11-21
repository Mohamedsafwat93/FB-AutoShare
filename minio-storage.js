// MinIO Storage Integration
const { Client } = require('minio');
const sharp = require('sharp');
const path = require('path');

// 🔧 MinIO Configuration
const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true' || false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

// 📁 Initialize Buckets
async function initializeBuckets() {
    const buckets = ['facebook-posts', 'facebook-images', 'facebook-videos', 'backups'];
    
    for (const bucket of buckets) {
        try {
            const exists = await minioClient.bucketExists(bucket);
            if (!exists) {
                await minioClient.makeBucket(bucket);
                console.log(`✅ MinIO Bucket created: ${bucket}`);
            }
        } catch (error) {
            console.log(`ℹ️ MinIO Bucket ${bucket} already exists`);
        }
    }
}

// 🖼️ Process Image with Sharp - Enhanced with error handling
async function processImage(imageBuffer) {
    try {
        // Validate buffer
        if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
            throw new Error('Invalid image buffer');
        }

        // Detect image format first
        let image = sharp(imageBuffer);
        const metadata = await image.metadata().catch(() => ({}));
        
        if (!metadata.format) {
            throw new Error('Unrecognized image format');
        }

        // Create thumbnail with fallback
        let thumbnail;
        try {
            thumbnail = await sharp(imageBuffer)
                .resize(300, 300, { fit: 'cover' })
                .toFormat('jpeg', { quality: 80 })
                .toBuffer()
                .catch(() => imageBuffer);
        } catch (e) {
            console.log(`Thumbnail generation failed: ${e.message}, using original`);
            thumbnail = imageBuffer;
        }

        // Create optimized version with fallback
        let optimized;
        try {
            optimized = await sharp(imageBuffer)
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .toFormat('jpeg', { quality: 85 })
                .toBuffer()
                .catch(() => imageBuffer);
        } catch (e) {
            console.log(`Optimization failed: ${e.message}, using original`);
            optimized = imageBuffer;
        }

        return { 
            thumbnail: thumbnail || imageBuffer, 
            optimized: optimized || imageBuffer 
        };
    } catch (error) {
        console.log(`Image processing warning: ${error.message} - will upload original`);
        // Return the original buffer instead of throwing
        return { 
            thumbnail: imageBuffer, 
            optimized: imageBuffer 
        };
    }
}

// 📤 Upload File to MinIO
async function uploadToMinIO(fileBuffer, bucketName, fileName, metadata = {}) {
    try {
        const objectName = `${Date.now()}-${fileName}`;
        
        await minioClient.putObject(
            bucketName,
            objectName,
            fileBuffer,
            fileBuffer.length,
            {
                'Content-Type': metadata.contentType || 'application/octet-stream',
                'Original-Name': fileName,
                'Upload-Date': new Date().toISOString(),
                ...metadata
            }
        );

        const fileUrl = `${process.env.MINIO_URL || 'http://localhost:9000'}/${bucketName}/${objectName}`;
        
        return {
            success: true,
            objectName,
            bucketName,
            url: fileUrl,
            size: fileBuffer.length
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 🔄 Integrated Upload (MinIO + Image Processing)
async function integratedUpload(file, options = {}) {
    const { compressImages = true, createBackup = true } = options;
    
    try {
        const results = {
            original: null,
            processed: null,
            backup: null,
            processingNote: null
        };

        const fileName = file.originalname;
        const fileType = file.mimetype ? file.mimetype.split('/')[0] : 'unknown';
        
        let targetBucket = 'facebook-posts';
        if (fileType === 'image') targetBucket = 'facebook-images';
        if (fileType === 'video') targetBucket = 'facebook-videos';

        // Validate file buffer
        if (!file.buffer || file.buffer.length === 0) {
            return {
                success: false,
                error: 'File buffer is empty'
            };
        }

        // 📥 Upload original file
        results.original = await uploadToMinIO(
            file.buffer, 
            targetBucket, 
            fileName,
            { 'Content-Type': file.mimetype || 'application/octet-stream' }
        );

        // 🖼️ Process images if applicable
        if (fileType === 'image' && compressImages) {
            try {
                const processedImages = await processImage(file.buffer);
                
                if (processedImages && processedImages.optimized) {
                    try {
                        results.processed = await uploadToMinIO(
                            processedImages.optimized,
                            targetBucket,
                            `optimized-${fileName}`,
                            { 'Content-Type': 'image/jpeg' }
                        );
                    } catch (e) {
                        console.log(`Optimized upload failed: ${e.message}`);
                        results.processingNote = 'Optimized version failed, but original uploaded successfully';
                    }

                    try {
                        if (processedImages.thumbnail && processedImages.thumbnail !== processedImages.optimized) {
                            await uploadToMinIO(
                                processedImages.thumbnail,
                                targetBucket,
                                `thumbnail-${fileName}`,
                                { 'Content-Type': 'image/jpeg' }
                            );
                        }
                    } catch (e) {
                        console.log(`Thumbnail upload failed: ${e.message}`);
                    }
                }
            } catch (error) {
                console.log(`Image processing error: ${error.message}`);
                results.processingNote = 'Image processing skipped, but original file uploaded';
            }
        }

        // 💾 Create backup
        if (createBackup) {
            try {
                results.backup = await uploadToMinIO(
                    file.buffer,
                    'backups',
                    `backup-${fileName}`,
                    { 'Content-Type': file.mimetype || 'application/octet-stream' }
                );
            } catch (e) {
                console.log(`Backup creation failed: ${e.message}`);
                results.processingNote = (results.processingNote || '') + ' (backup failed)';
            }
        }

        return {
            success: true,
            message: '✅ Upload successful',
            results: results,
            note: results.processingNote ? `⚠️ ${results.processingNote}` : null
        };

    } catch (error) {
        return {
            success: false,
            error: 'Upload failed: ' + error.message,
            suggestion: 'Please try uploading a different file or check your file format'
        };
    }
}

// 📋 Get Files List with timeout protection
async function getFilesList(bucketName) {
    return new Promise(async (resolve, reject) => {
        // Set absolute timeout of 4 seconds
        const timeout = setTimeout(() => {
            reject(new Error('MinIO list objects timeout'));
        }, 4000);

        try {
            const files = [];
            const stream = minioClient.listObjects(bucketName, '', true);
            
            for await (const file of stream) {
                try {
                    const url = await minioClient.presignedGetObject(bucketName, file.name, 24*60*60);
                    files.push({
                        name: file.name,
                        size: file.size,
                        lastModified: file.lastModified,
                        url: url
                    });
                } catch (err) {
                    // Skip individual file errors
                    console.log(`Skipped file ${file.name}: ${err.message}`);
                }
            }
            
            clearTimeout(timeout);
            resolve(files);
        } catch (error) {
            clearTimeout(timeout);
            reject(new Error('Failed to list files: ' + error.message));
        }
    });
}

// 🗑️ Delete File
async function deleteFile(bucketName, fileName) {
    try {
        await minioClient.removeObject(bucketName, fileName);
        return { success: true, message: '✅ File deleted successfully' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 📊 Get Bucket Stats with absolute timeout
async function getBucketStats(bucketName) {
    // Absolute timeout: return empty stats after 3.5 seconds
    return new Promise((resolve) => {
        const absoluteTimeout = setTimeout(() => {
            resolve({
                bucket: bucketName,
                fileCount: 0,
                totalSize: 0,
                totalSizeMB: '0.00',
                files: [],
                success: false,
                warning: 'MinIO response timeout',
                error: 'Connection timeout after 3.5s'
            });
        }, 3500);

        getFilesList(bucketName)
            .then(files => {
                clearTimeout(absoluteTimeout);
                const totalSize = files.reduce((sum, file) => sum + file.size, 0);
                resolve({
                    bucket: bucketName,
                    fileCount: files.length,
                    totalSize: totalSize,
                    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
                    files: files,
                    success: true
                });
            })
            .catch(error => {
                clearTimeout(absoluteTimeout);
                resolve({
                    bucket: bucketName,
                    fileCount: 0,
                    totalSize: 0,
                    totalSizeMB: '0.00',
                    files: [],
                    success: false,
                    warning: 'MinIO unavailable - showing empty stats',
                    error: error.message
                });
            });
    });
}

module.exports = {
    minioClient,
    initializeBuckets,
    integratedUpload,
    uploadToMinIO,
    getFilesList,
    deleteFile,
    getBucketStats,
    processImage
};
