const cron = require('node-cron');
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const HEALTH_CHECK_URL = 'http://localhost:5000/api/stats';
const CHECK_INTERVAL = '0 * * * *'; // Every hour at minute 0
const KEEP_ALIVE_INTERVAL = '*/30 * * * *'; // Every 30 minutes
const CLEANUP_INTERVAL = '0 0 * * *'; // Every day at midnight
const UPLOAD_DIR = path.join(__dirname, 'public', 'temp-uploads');
const FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

console.log('🔍 Health Check System Initialized');
console.log(`⏰ Checking server status every hour at :00`);
console.log(`💤 Keep-alive ping every 30 minutes`);
console.log(`🧹 Cleanup old files every day at 00:00`);

// Function to check server health
async function checkServerHealth() {
    return new Promise((resolve) => {
        const req = http.get(HEALTH_CHECK_URL, { timeout: 5000 }, (res) => {
            console.log(`✅ [${new Date().toLocaleString()}] Server is UP (${res.statusCode})`);
            resolve(true);
        });

        req.on('error', (err) => {
            console.log(`❌ [${new Date().toLocaleString()}] Server is DOWN - Error: ${err.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`⏱️  [${new Date().toLocaleString()}] Server TIMEOUT - Restarting...`);
            req.destroy();
            resolve(false);
        });
    });
}

// Function to auto-restart server
function autoRestartServer() {
    console.log(`🔄 [${new Date().toLocaleString()}] Auto-restarting server...`);
    exec('pkill -f "node index.js" 2>/dev/null; sleep 2; node /home/runner/workspace/index.js &', (err) => {
        if (err) {
            console.log('⚠️  Restart command sent (process in background)');
        } else {
            console.log('✅ Restart initiated');
        }
    });
}

// Function to keep server awake
function keepServerAwake() {
    console.log(`💤 [${new Date().toLocaleString()}] Keep-alive ping...`);
    http.get(HEALTH_CHECK_URL, (res) => {
        if (res.statusCode === 200) {
            console.log(`✅ Keep-alive successful (${res.statusCode})`);
        }
    }).on('error', (err) => {
        console.log(`⚠️  Keep-alive ping failed: ${err.message}`);
    });
}

// Function to cleanup old files
function cleanupOldFiles() {
    const now = Date.now();
    let deletedCount = 0;

    if (!fs.existsSync(UPLOAD_DIR)) {
        console.log(`🧹 [${new Date().toLocaleString()}] Upload directory does not exist yet`);
        return;
    }

    try {
        const files = fs.readdirSync(UPLOAD_DIR);
        
        files.forEach(file => {
            const filePath = path.join(UPLOAD_DIR, file);
            const stats = fs.statSync(filePath);
            const fileAge = now - stats.mtimeMs;

            if (fileAge > FILE_MAX_AGE_MS) {
                try {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    console.log(`  🗑️  Deleted: ${file} (${Math.floor(fileAge / 1000 / 60 / 60)} hours old)`);
                } catch (err) {
                    console.log(`  ⚠️  Failed to delete ${file}: ${err.message}`);
                }
            }
        });

        console.log(`🧹 [${new Date().toLocaleString()}] Cleanup complete - ${deletedCount} files deleted`);
    } catch (err) {
        console.log(`🧹 Cleanup error: ${err.message}`);
    }
}

// Cron job - runs every hour (Health Check)
cron.schedule(CHECK_INTERVAL, async () => {
    console.log('\n📡 [HOURLY CHECK] Starting server health check...');
    const isHealthy = await checkServerHealth();
    
    if (!isHealthy) {
        console.log('🚨 Server detected as DOWN - Initiating auto-restart!');
        autoRestartServer();
    }
}, {
    timezone: "UTC"
});

// Cron job - runs every 30 minutes (Keep-alive)
cron.schedule(KEEP_ALIVE_INTERVAL, () => {
    keepServerAwake();
}, {
    timezone: "UTC"
});

// Cron job - runs daily at midnight (Cleanup)
cron.schedule(CLEANUP_INTERVAL, () => {
    console.log('\n🧹 [DAILY CLEANUP] Starting old file cleanup...');
    cleanupOldFiles();
}, {
    timezone: "UTC"
});

// Also do an immediate check on startup
console.log('\n🚀 Performing initial health check on startup...');
checkServerHealth().then(isHealthy => {
    if (!isHealthy) {
        console.log('⚠️  Initial check failed - server may still be starting');
    }
});

// Manual health check endpoint can be called
module.exports = { checkServerHealth };
