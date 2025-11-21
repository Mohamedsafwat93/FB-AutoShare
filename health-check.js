const cron = require('node-cron');
const http = require('http');
const { exec } = require('child_process');

const HEALTH_CHECK_URL = 'http://localhost:5000/api/stats';
const CHECK_INTERVAL = '0 * * * *'; // Every hour at minute 0

console.log('🔍 Health Check System Initialized');
console.log(`⏰ Checking server status every hour at :00`);

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

// Cron job - runs every hour
cron.schedule(CHECK_INTERVAL, async () => {
    console.log('\n📡 [HOURLY CHECK] Starting server health check...');
    const isHealthy = await checkServerHealth();
    
    if (!isHealthy) {
        console.log('🚨 Server detected as DOWN - Initiating auto-restart!');
        autoRestartServer();
        console.log('⏳ Waiting 10 seconds before next check...');
    }
}, {
    timezone: "UTC"
});

// Also do an immediate check on startup
console.log('🚀 Performing initial health check...');
checkServerHealth().then(isHealthy => {
    if (!isHealthy) {
        console.log('⚠️  Initial check failed - server may still be starting');
    }
});

// Manual health check endpoint can be called
module.exports = { checkServerHealth };
