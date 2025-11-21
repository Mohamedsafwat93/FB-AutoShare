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

// 🖼️ Process Image with Sharp
async function processImage(imageBuffer) {
    try {
        const thumbnail = await sharp(imageBuffer)
            .resize(300, 300)
            .jpeg({ quality: 80 })
            .toBuffer();
            
        const optimized = await sharp(imageBuffer)
            .resize(1200, 1200, { fit: 'inside' })
            .jpeg({ quality: 85 })
            .toBuffer();
            
        return { thumbnail, optimized };
    } catch (error) {
        throw new Error('Image processing failed: ' + error.message);
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
            backup: null
        };

        const fileName = file.originalname;
        const fileType = file.mimetype.split('/')[0];
        
        let targetBucket = 'facebook-posts';
        if (fileType === 'image') targetBucket = 'facebook-images';
        if (fileType === 'video') targetBucket = 'facebook-videos';

        // 📥 Upload original file
        results.original = await uploadToMinIO(
            file.buffer, 
            targetBucket, 
            fileName,
            { 'Content-Type': file.mimetype }
        );

        // 🖼️ Process images if applicable
        if (fileType === 'image' && compressImages) {
            const processedImages = await processImage(file.buffer);
            
            results.processed = await uploadToMinIO(
                processedImages.optimized,
                targetBucket,
                `optimized-${fileName}`,
                { 'Content-Type': 'image/jpeg' }
            );

            await uploadToMinIO(
                processedImages.thumbnail,
                targetBucket,
                `thumbnail-${fileName}`,
                { 'Content-Type': 'image/jpeg' }
            );
        }

        // 💾 Create backup
        if (createBackup) {
            results.backup = await uploadToMinIO(
                file.buffer,
                'backups',
                `backup-${fileName}`,
                { 'Content-Type': file.mimetype }
            );
        }

        return {
            success: true,
            message: '✅ Upload and storage successful',
            results: results
        };

    } catch (error) {
        return {
            success: false,
            error: 'Integrated upload failed: ' + error.message
        };
    }
}

// 📋 Get Files List
async function getFilesList(bucketName) {
    try {
        const files = [];
        const stream = minioClient.listObjects(bucketName, '', true);
        
        for await (const file of stream) {
            const url = await minioClient.presignedGetObject(bucketName, file.name, 24*60*60);
            files.push({
                name: file.name,
                size: file.size,
                lastModified: file.lastModified,
                url: url
            });
        }
        
        return files;
    } catch (error) {
        throw new Error('Failed to list files: ' + error.message);
    }
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

// 📊 Get Bucket Stats
async function getBucketStats(bucketName) {
    try {
        const files = await getFilesList(bucketName);
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        
        return {
            bucket: bucketName,
            fileCount: files.length,
            totalSize: totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            files: files
        };
    } catch (error) {
        return { error: error.message };
    }
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
