const express = require('express');
const path = require('path');
const os = require('os');
const si = require('systeminformation');
const disk = require('diskusage');
const { exec } = require('child_process');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const crypto = require('crypto');
const { google } = require('googleapis');
const { optimizeImage, validateImage } = require('./media-optimizer');
const { initializeGoogleDrive, uploadToGoogleDrive, getStorageQuota, deleteAllFilesInFolder, uploadAllFilesFromFolder } = require('./google-drive');
require('dotenv').config();

// Start Health Check + Keep-Alive + Cleanup System
require('./health-check');

// Initialize Google Drive if configured
const useGoogleDrive = process.env.USE_GOOGLE_DRIVE === 'true';
let googleDriveReady = false;
if (useGoogleDrive) {
  initializeGoogleDrive().then(success => {
    googleDriveReady = success;
  });
}

// OAuth2 Configuration (from environment variables)
const OAUTH_CREDENTIALS = {
  client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
  client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  scopes: ['https://www.googleapis.com/auth/drive']
};

let oAuth2Client = null;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Create temp upload directory for file serving
const uploadDir = path.join(__dirname, 'public', 'temp-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve temp uploads as static
app.use('/temp-uploads', express.static(uploadDir));

// Setup multer for file uploads (disk storage for public URLs)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = crypto.randomBytes(8).toString('hex') + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Facebook API Configuration
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const FB_USER_TOKEN = process.env.FB_USER_TOKEN;
const FB_PAGE_ID = '133112064223614'; // IT-Solutions page ID (fixed)

// Disable caching for all responses
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// API routes MUST come before static middleware
// Stats API - Enhanced with better structure
app.get('/api/stats', async (req, res) => {
  try {
    const mem = await si.mem();
    const load = await si.currentLoad();
    const fsSize = await si.fsSize();
    const network = await si.networkStats();
    
    // Get services data
    let services = [];
    try {
      const servicesOutput = require('child_process').execSync('netstat -tulpn 2>/dev/null || ss -tulpn', { encoding: 'utf8' });
      const lines = servicesOutput.split('\n').slice(2);
      services = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        if(parts.length >= 7){
          return {
            proto: parts[0],
            localAddress: parts[3],
            state: parts[5],
            pid_program: parts[6]
          }
        }
        return null;
      }).filter(x => x).slice(0, 10);
    } catch(e) {
      services = [];
    }

    res.json({
      uptime: process.uptime(),
      platform: os.platform(),
      osRelease: os.release(),
      node: process.version,
      cpu: {
        model: os.cpus()[0].model,
        cores: os.cpus().length,
        usage: parseFloat(load.currentLoad.toFixed(1))
      },
      ram: {
        total: mem.total,
        used: mem.used,
        free: mem.free
      },
      disk: fsSize.map(d => ({
        fs: d.fs,
        size: d.size,
        used: d.used,
        available: d.available
      })),
      network: {
        download: network[0]?.rx_sec || 0,  // bytes/sec
        upload: network[0]?.tx_sec || 0,    // bytes/sec
        rx_sec: network[0]?.rx_sec || 0,
        tx_sec: network[0]?.tx_sec || 0
      },
      services: services
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Simplified Server Stats API (for alternative dashboard)
app.get('/api/server-stats', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const cpus = os.cpus();
  const cpuPercent = Math.round(
    cpus.reduce((acc, cpu) => acc + cpu.times.user + cpu.times.sys, 0) /
    cpus.reduce((acc, cpu) => acc + Object.values(cpu.times).reduce((a,b)=>a+b,0), 0) * 100
  );

  let diskInfo = { total: 0, used: 0 };
  try {
    const path_root = path.parse(process.cwd()).root;
    const diskSync = require('child_process').execSync(`df -k ${path_root} | tail -1`, { encoding: 'utf8' }).split(/\s+/);
    diskInfo = { 
      total: parseInt(diskSync[1]) * 1024, 
      used: parseInt(diskSync[2]) * 1024 
    };
  } catch(e) {
    diskInfo = { total: 50*1024*1024*1024, used: 30*1024*1024*1024 };
  }

  // Get network data
  let networkData = { download: 0, upload: 0 };
  try {
    const netStats = require('child_process').execSync("cat /proc/net/dev 2>/dev/null | tail -1", { encoding: 'utf8' }).split(/\s+/);
    if(netStats.length >= 10) {
      networkData = {
        download: parseInt(netStats[1]) || 0,
        upload: parseInt(netStats[9]) || 0
      };
    }
  } catch(e) {
    networkData = { download: 0, upload: 0 };
  }

  res.json({
    ram: { total: totalMem, used: usedMem },
    cpu: { percent: cpuPercent, cores: cpus.length },
    disk: { total: diskInfo.total, used: diskInfo.used },
    network: { download: networkData.download, upload: networkData.upload }
  });
});

// Services API
app.get('/api/services', (req,res)=>{
  exec('netstat -tulpn', (err, stdout, stderr)=>{
    if(err){ return res.status(500).json({error: err.message}); }
    const lines = stdout.split('\n').slice(2);
    const services = lines.map(line=>{
      const parts = line.trim().split(/\s+/);
      if(parts.length >=7){
        return {
          proto: parts[0],
          recvQ: parts[1],
          sendQ: parts[2],
          localAddress: parts[3],
          foreignAddress: parts[4],
          state: parts[5],
          pid_program: parts[6]
        }
      }
      return null;
    }).filter(x=>x);
    res.json(services);
  });
});

// Restart server with password protection
app.post('/api/restart', (req,res)=>{
  const { password } = req.body;
  const correctPassword = process.env.RESTART_PASSWORD;
  
  if(!password) {
    return res.status(400).json({error:'Password required'});
  }
  
  if(password !== correctPassword) {
    return res.status(401).json({error:'Invalid password'});
  }
  
  res.json({message:'Restart command received - Access Granted'});
  console.log('Server restart requested by authorized user.');
  // Actual restart could be implemented here
});

// Restart specific service endpoint
app.post('/api/restart-service', (req, res) => {
  const { pid_program } = req.body;
  
  if(!pid_program) {
    return res.status(400).json({error: 'pid_program required'});
  }
  
  // Extract PID from "PID/program" format
  const pidMatch = pid_program.match(/^(\d+)/);
  if(!pidMatch) {
    return res.status(400).json({error: 'Invalid PID format'});
  }
  
  const pid = pidMatch[1];
  
  // Kill and restart the process
  exec(`kill -9 ${pid} 2>/dev/null; sleep 1`, (err) => {
    if(err) {
      console.log(`Kill signal sent to PID ${pid}`);
    }
    
    // The service will be restarted by systemd or supervisor if configured
    // For now, just confirm the kill command was sent
    res.json({
      message: `Restart command sent to service: ${pid_program}`,
      pid: pid,
      status: 'restart_initiated'
    });
    
    console.log(`Service restart initiated for PID ${pid} (${pid_program})`);
  });
});

// Facebook Token Validation & Auto-Fix Endpoint
app.get('/api/facebook/validate-token', async (req, res) => {
  try {
    const results = {};
    
    // Check PAGE token
    if(FB_PAGE_TOKEN) {
      try {
        const pageCheck = await axios.get(`https://graph.facebook.com/me?access_token=${FB_PAGE_TOKEN}`);
        results.page_token = {
          valid: true,
          id: pageCheck.data.id,
          name: pageCheck.data.name
        };
      } catch(err) {
        results.page_token = {
          valid: false,
          error: err.response?.data?.error?.message || err.message
        };
      }
    } else {
      results.page_token = { valid: false, error: 'FB_PAGE_TOKEN not set in environment' };
    }
    
    // Check USER token
    if(FB_USER_TOKEN) {
      try {
        const userCheck = await axios.get(`https://graph.facebook.com/me?access_token=${FB_USER_TOKEN}`);
        results.user_token = {
          valid: true,
          id: userCheck.data.id,
          name: userCheck.data.name
        };
        
        // Try to get user's pages and auto-fetch a page token
        try {
          const pagesCheck = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${FB_USER_TOKEN}`);
          if(pagesCheck.data.data && pagesCheck.data.data.length > 0) {
            const firstPage = pagesCheck.data.data[0];
            results.auto_page_token = {
              available: true,
              page_id: firstPage.id,
              page_name: firstPage.name,
              page_token: firstPage.access_token,
              message: 'Auto-generated page token available'
            };
          }
        } catch(e) {
          // Silently ignore if can't fetch pages
        }
        
      } catch(err) {
        results.user_token = {
          valid: false,
          error: err.response?.data?.error?.message || err.message
        };
      }
    } else {
      results.user_token = { valid: false, error: 'FB_USER_TOKEN not set in environment' };
    }
    
    res.json(results);
  } catch(err) {
    res.status(500).json({error: err.message});
  }
});

// Endpoint to post using user token to page (workaround)
app.post('/api/facebook/post-via-user', async (req, res) => {
  try {
    const { message, link } = req.body;
    
    if(!FB_USER_TOKEN) {
      return res.status(400).json({error:'Facebook user token not configured'});
    }
    
    if(!message) {
      return res.status(400).json({error:'Message cannot be empty'});
    }

    // Get user's first page
    const pagesResponse = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${FB_USER_TOKEN}`);
    
    if(!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
      return res.status(400).json({error:'No pages found. Please create a Facebook page first.'});
    }
    
    const page = pagesResponse.data.data[0];
    const postData = {
      message: message,
      access_token: page.access_token
    };
    
    if(link) {
      postData.link = link;
    }

    console.log('📤 Posting to page via user token:', page.name);
    const response = await axios.post(`https://graph.facebook.com/${page.id}/feed`, postData);
    
    console.log('✅ Post successful:', response.data.id);
    res.json({
      success: true,
      message: 'Post published successfully to ' + page.name + '!',
      postId: response.data.id,
      page: page.name
    });
  } catch(err) {
    console.error('❌ Facebook API error:', err.response?.status, err.response?.data);
    const facebookError = err.response?.data?.error?.message || err.message;
    res.status(500).json({
      error: facebookError,
      details: err.response?.data
    });
  }
});

// Facebook Page Info with Picture
app.get('/api/facebook/page-info', async (req, res) => {
  try {
    if(!FB_USER_TOKEN && !FB_PAGE_TOKEN) {
      return res.status(400).json({error:'Facebook token not configured'});
    }
    
    const token = FB_USER_TOKEN || FB_PAGE_TOKEN;
    
    // Get user pages first to get the page ID
    const pagesResponse = await axios.get(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
    
    if(!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
      return res.status(400).json({error:'No pages found'});
    }
    
    const page = pagesResponse.data.data[0];
    
    // Get page picture in high quality
    const pictureResponse = await axios.get(
      `https://graph.facebook.com/v18.0/${page.id}/picture?type=large&access_token=${page.access_token}`
    );
    
    res.json({
      success: true,
      page: {
        id: page.id,
        name: page.name,
        picture: pictureResponse.data.data.url
      }
    });
  } catch(err) {
    console.error('Page info error:', err.message);
    res.status(500).json({error: err.message});
  }
});

// Auto-sync Facebook Groups - Try multiple endpoints
app.get('/api/facebook/auto-groups', async (req, res) => {
  try {
    if(!FB_USER_TOKEN && !FB_PAGE_TOKEN) {
      return res.status(400).json({error:'Facebook token not configured'});
    }
    
    console.log('📥 Fetching all Facebook groups...');
    let groups = [];
    let token = FB_USER_TOKEN || FB_PAGE_TOKEN;
    
    // Try endpoint 1: User groups
    try {
      console.log('🔍 Trying /me/groups endpoint...');
      const response = await axios.get(
        `https://graph.facebook.com/me/groups?fields=id,name,privacy,member_count,icon&access_token=${token}`
      );
      groups = response.data.data || [];
      console.log('✅ Found ' + groups.length + ' groups from /me/groups');
    } catch(err) {
      console.log('⚠️ /me/groups failed:', err.response?.data?.error?.message);
      
      // Try endpoint 2: Page's groups (if using page token)
      if(FB_PAGE_TOKEN) {
        try {
          console.log('🔍 Trying page groups endpoint...');
          const response = await axios.get(
            `https://graph.facebook.com/me/groups?access_token=${FB_PAGE_TOKEN}`
          );
          groups = response.data.data || [];
          console.log('✅ Found ' + groups.length + ' groups from page token');
        } catch(err2) {
          console.log('⚠️ Page groups failed:', err2.response?.data?.error?.message);
        }
      }
    }
    
    // Try endpoint 3: Using Facebook Ads API for page's managed groups
    if(groups.length === 0 && FB_USER_TOKEN) {
      try {
        console.log('🔍 Trying alternate endpoint with different fields...');
        const response = await axios.get(
          `https://graph.facebook.com/v18.0/me/groups?fields=id,name,privacy,member_count&limit=100&access_token=${FB_USER_TOKEN}`
        );
        groups = response.data.data || [];
        console.log('✅ Found ' + groups.length + ' groups from alternate endpoint');
      } catch(err3) {
        console.log('⚠️ Alternate endpoint failed:', err3.response?.data?.error?.message);
      }
    }
    
    const formattedGroups = groups.map(g => ({
      id: g.id,
      name: g.name,
      privacy: g.privacy || 'CLOSED',
      member_count: g.member_count || 0,
      icon: g.icon,
      url: `https://www.facebook.com/groups/${g.id}`
    }));
    
    console.log('✅ Final result: ' + formattedGroups.length + ' groups');
    res.json({
      success: true,
      total: formattedGroups.length,
      groups: formattedGroups,
      note: groups.length === 0 ? 'No groups found - check token permissions' : ''
    });
  } catch(err) {
    console.error('❌ Error fetching groups:', err.message, err.response?.data);
    res.status(500).json({
      error: err.message, 
      details: err.response?.data,
      suggestion: 'Make sure your Facebook token has groups_manage permission'
    });
  }
});

// Facebook Groups with auto-fetch or manual IDs
app.post('/api/facebook/groups-verify', async (req, res) => {
  try {
    const { group_ids } = req.body;
    
    if(!FB_USER_TOKEN) {
      return res.status(400).json({error:'Facebook token not configured'});
    }
    
    if(!group_ids || group_ids.length === 0) {
      return res.status(400).json({error:'No group IDs provided'});
    }

    // Verify each group and get info
    const groupsInfo = await Promise.all(group_ids.map(async (id) => {
      try {
        const response = await axios.get(
          `https://graph.facebook.com/${id}?fields=id,name,privacy,member_count&access_token=${FB_USER_TOKEN}`
        );
        return {
          success: true,
          ...response.data,
          url: `https://www.facebook.com/groups/${id}`
        };
      } catch(err) {
        return {
          success: false,
          id: id,
          error: 'Failed to fetch group info'
        };
      }
    }));

    const validGroups = groupsInfo.filter(g => g.success);
    
    res.json({
      total_requested: group_ids.length,
      valid_groups: validGroups.length,
      groups: validGroups,
      invalid: groupsInfo.filter(g => !g.success)
    });
  } catch(err) {
    res.status(500).json({error: err.message});
  }
});

// Facebook Post to Page - PAGE TOKEN ONLY (Two-step: upload photo, then post with attachment)
app.post('/api/facebook/post', upload.fields([{name: 'photo', maxCount: 1}, {name: 'video', maxCount: 1}]), async (req, res) => {
  try {
    const { message, link } = req.body;
    const photoFile = req.files?.photo?.[0];
    
    // Use PAGE TOKEN ONLY - No fallback to prevent double posting
    const pageToken = process.env.FB_PAGE_TOKEN;
    const targetPageId = FB_PAGE_ID; // 133112064223614 (IT-Solutions)
    
    if(!message) {
      return res.status(400).json({error:'Message cannot be empty'});
    }

    if(!pageToken) {
      return res.status(400).json({error:'FB_PAGE_TOKEN not configured'});
    }

    console.log(`🔑 PAGE TOKEN Method - Posting as IT-Solutions (${targetPageId})`);

    // PHOTO POST - Two steps: upload to /photos, then post to /feed with object_attachment
    if(photoFile) {
      console.log(`📸 Photo detected: ${photoFile.filename}`);
      const photoPath = path.join(uploadDir, photoFile.filename);
      
      // Validate & optimize image
      const validation = await validateImage(photoPath);
      if(!validation.valid) {
        console.warn(`⚠️ Image validation: ${validation.error}`);
      } else {
        console.log(`✅ Image valid: ${validation.format} (${validation.dimensions})`);
      }
      
      await optimizeImage(photoPath, 1200, 1200, 80);
      const photoBuffer = fs.readFileSync(photoPath);
      
      // STEP 1: Upload photo to /photos endpoint
      const photoFormData = new FormData();
      photoFormData.append('source', photoBuffer, {
        filename: photoFile.filename,
        contentType: photoFile.mimetype
      });
      photoFormData.append('access_token', pageToken);
      
      console.log(`📤 STEP 1: Uploading photo to ${targetPageId}/photos (PAGE TOKEN)`);
      let photoResponse;
      try {
        photoResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${targetPageId}/photos`,
          photoFormData,
          { headers: photoFormData.getHeaders() }
        );
        console.log(`✅ Photo uploaded: ${photoResponse.data.id}`);
      } catch(photoErr) {
        console.error('❌ Photo upload failed:', photoErr.response?.data?.error?.message || photoErr.message);
        throw photoErr;
      }
      
      // STEP 2: Create ONE feed post with the uploaded photo
      const feedPostData = {
        message: message,
        object_attachment: photoResponse.data.id,
        access_token: pageToken
      };
      
      if(link) {
        feedPostData.link = link;
      }
      
      console.log(`📤 STEP 2: Creating feed post with photo (PAGE TOKEN - Posted AS IT-Solutions)`);
      let feedResponse;
      try {
        feedResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${targetPageId}/feed`,
          feedPostData
        );
        console.log('✅ ONE post created:', feedResponse.data.id);
      } catch(feedErr) {
        console.error('❌ Feed post failed:', feedErr.response?.data?.error?.message || feedErr.message);
        throw feedErr;
      }
      
      return res.json({
        success: true,
        message: `✅ Posted to IT-Solutions Page!`,
        postId: feedResponse.data.id,
        posted_by: 'IT-Solutions Page',
        posts_count: 1
      });
    }
    
    // TEXT-ONLY POST (No photo)
    console.log(`📤 Text-only post (PAGE TOKEN - Posted AS IT-Solutions)`);
    const textPostData = {
      message: message,
      access_token: pageToken
    };
    
    if(link) {
      textPostData.link = link;
    }
    
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${targetPageId}/feed`,
      textPostData
    );
    
    console.log('✅ Post success:', response.data.id);
    
    return res.json({
      success: true,
      message: `✅ Posted to IT-Solutions Page!`,
      postId: response.data.id,
      posted_by: 'IT-Solutions Page'
    });
    
  } catch(err) {
    console.error('❌ Facebook Post Error:', err.response?.data?.error?.message || err.message);
    res.status(500).json({
      error: err.response?.data?.error?.message || err.message,
      details: err.response?.data
    });
  }
});

// Post to Facebook Group
app.post('/api/facebook/group-post', upload.fields([{name: 'photo', maxCount: 1}, {name: 'video', maxCount: 1}]), async (req, res) => {
  try {
    const { group_id, message, link } = req.body;
    const photoFile = req.files?.photo?.[0];
    const videoFile = req.files?.video?.[0];
    
    // Read token fresh from environment
    const userToken = process.env.FB_USER_TOKEN;
    
    if(!userToken) {
      return res.status(400).json({error:'Facebook token not configured'});
    }
    
    if(!message || !group_id) {
      return res.status(400).json({error:'Message and group ID are required'});
    }

    const postData = {
      message: message,
      access_token: userToken
    };
    
    if(photoFile) {
      console.log(`📸 Photo for group: ${photoFile.filename}`);
      const photoPath = path.join(uploadDir, photoFile.filename);
      
      // Validate and optimize image
      const validation = await validateImage(photoPath);
      if(!validation.valid) {
        console.warn(`⚠️ Image validation: ${validation.error}`);
      } else {
        console.log(`✅ Image valid: ${validation.format} (${validation.dimensions})`);
      }
      await optimizeImage(photoPath, 1200, 1200, 80);
      
      // Read file as buffer
      const photoBuffer = fs.readFileSync(photoPath);
      
      // Step 1: Upload photo to group photos endpoint
      const photoFormData = new FormData();
      photoFormData.append('source', photoBuffer, {
        filename: photoFile.filename,
        contentType: photoFile.mimetype
      });
      photoFormData.append('access_token', userToken);
      
      console.log(`📤 Uploading photo to group ${group_id}/photos`);
      const photoResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${group_id}/photos`,
        photoFormData,
        { headers: photoFormData.getHeaders() }
      );
      
      console.log(`✅ Photo uploaded: ${photoResponse.data.id}`);
      
      // Step 2: Create feed post with the uploaded photo
      const feedPostData = {
        message: postData.message,
        object_attachment: photoResponse.data.id,
        privacy: {"value": "EVERYONE"},
        access_token: userToken
      };
      
      if(link) {
        feedPostData.link = link;
      }
      
      console.log(`📤 Creating group feed post with photo attachment (PUBLIC)...`);
      const feedResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${group_id}/feed`,
        feedPostData
      );
      
      console.log('✅ Group post successful:', feedResponse.data.id);
      
      return res.json({
        success: true,
        message: '✅ Posted to group!',
        postId: feedResponse.data.id
      });
    }

    // Text-only post (no image)
    if(link) {
      postData.link = link;
    }

    postData.privacy = {"value": "EVERYONE"};

    console.log(`📤 Posting text to group ${group_id} (PUBLIC)...`);
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${group_id}/feed`,
      postData
    );
    
    console.log('✅ Group post successful:', response.data.id);
    
    res.json({
      success: true,
      message: '✅ Posted to group!',
      postId: response.data.id
    });
  } catch(err) {
    console.error('❌ Group post error:', err.message);
    res.status(500).json({error: err.message, details: err.response?.data});
  }
});

// Disk cleanup with password protection
app.post('/api/cleanup', (req,res)=>{
  const { password } = req.body;
  const correctPassword = process.env.RESTART_PASSWORD;
  
  if(!password) {
    return res.status(400).json({error:'Password required'});
  }
  
  if(password !== correctPassword) {
    return res.status(401).json({error:'Invalid password'});
  }
  
  let cleanupResults = [];
  
  try {
    // Clean /tmp
    require('child_process').execSync('rm -rf /tmp/* 2>/dev/null || true', { encoding: 'utf8' });
    cleanupResults.push('✓ Cleaned /tmp directory');
  } catch(e) { cleanupResults.push('⚠ /tmp cleanup skipped'); }
  
  try {
    // Clean npm cache
    require('child_process').execSync('npm cache clean --force 2>/dev/null || true', { encoding: 'utf8' });
    cleanupResults.push('✓ Cleaned npm cache');
  } catch(e) { cleanupResults.push('⚠ npm cache cleanup skipped'); }
  
  try {
    // Clean yarn cache
    require('child_process').execSync('yarn cache clean 2>/dev/null || true', { encoding: 'utf8' });
    cleanupResults.push('✓ Cleaned yarn cache');
  } catch(e) { cleanupResults.push('⚠ yarn cache cleanup skipped'); }
  
  try {
    // Clean package manager caches
    require('child_process').execSync('rm -rf ~/.cache/* 2>/dev/null || true', { encoding: 'utf8' });
    cleanupResults.push('✓ Cleaned user cache');
  } catch(e) { cleanupResults.push('⚠ User cache cleanup skipped'); }
  
  res.json({
    message:'Disk cleanup completed - Access Granted',
    results: cleanupResults,
    freed:'Temporary files cleared'
  });
  console.log('Disk cleanup executed by authorized user.');
});

// Serve login page
app.get('/login', (req,res)=>{
  res.sendFile(path.join(__dirname,'public/login.html'));
});

// Serve dashboard with backward compatibility
app.get('/dashboard.html', (req,res)=>{
  res.sendFile(path.join(__dirname,'public/index.html'));
});

// 📤 File Upload Endpoint - Google Drive with Local Fallback
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file selected' });
    }

    // Try Google Drive first
    if (useGoogleDrive && googleDriveReady) {
      try {
        const result = await uploadToGoogleDrive(req.file.buffer, req.file.originalname);
        return res.json({
          success: true,
          message: '✅ File uploaded to Google Drive successfully',
          file: {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            url: result.url,
            fileId: result.fileId,
            storage: 'google-drive',
            mimetype: req.file.mimetype
          }
        });
      } catch (gdError) {
        console.log(`Google Drive upload failed: ${gdError.message}, using local storage`);
      }
    }

    // Fallback to local storage
    const fileUrl = `/temp-uploads/${req.file.filename}`;
    res.json({
      success: true,
      message: '✅ File stored locally (pending Google Drive migration)',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        storage: 'local',
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📊 Get Google Drive storage quota
app.get('/api/drive/quota', async (req, res) => {
  try {
    if (!googleDriveReady) {
      return res.status(503).json({ error: 'Google Drive not available' });
    }

    const quota = await getStorageQuota();
    if (!quota) {
      return res.status(500).json({ error: 'Failed to get storage quota' });
    }

    res.json({
      success: true,
      storage: quota
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔐 OAuth2 - Start Authorization Flow (No Redirect Needed!)
app.get('/api/oauth/authorize', (req, res) => {
  try {
    // Use out-of-band redirect URI (no server callback needed)
    oAuth2Client = new google.auth.OAuth2(
      OAUTH_CREDENTIALS.client_id,
      OAUTH_CREDENTIALS.client_secret,
      'urn:ietf:wg:oauth:2.0:oob'  // Out-of-band - user gets code manually
    );

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: OAUTH_CREDENTIALS.scopes,
      prompt: 'consent'
    });

    res.json({
      success: true,
      authUrl,
      instructions: [
        '1. Click the authUrl link in your browser',
        '2. Sign in with your Google account',
        '3. Copy the authorization code you receive',
        '4. POST that code to /api/oauth/exchange-code with: { "code": "your-code" }'
      ],
      example: 'curl -X POST https://YOUR_URL/api/oauth/exchange-code -H "Content-Type: application/json" -d \'{"code":"YOUR_CODE"}\''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔐 OAuth2 - Exchange Authorization Code for Token
app.post('/api/oauth/exchange-code', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    if (!oAuth2Client) {
      return res.status(400).json({ error: 'First visit /api/oauth/authorize' });
    }

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // Save token to file
    const tokenPath = path.join(__dirname, 'oauth-token.json');
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

    res.json({
      success: true,
      message: '✅ Token saved successfully!',
      nextStep: 'POST to /api/sync-monthly-storage to upload all 15 files to Google Drive'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔐 Check OAuth Token Status
app.get('/api/oauth/status', (req, res) => {
  try {
    const tokenPath = path.join(__dirname, 'oauth-token.json');
    const hasToken = fs.existsSync(tokenPath);
    
    const tempDir = path.join(__dirname, 'public/temp-uploads');
    let fileCount = 0;
    try {
      if (fs.existsSync(tempDir)) {
        fileCount = fs.readdirSync(tempDir).length;
      }
    } catch (e) {}

    res.json({
      oauthConfigured: hasToken,
      tokenFile: hasToken ? 'oauth-token.json' : 'not found',
      localFilesWaiting: fileCount,
      readyToMigrate: hasToken && fileCount > 0,
      nextSteps: !hasToken 
        ? 'Visit /api/oauth/authorize to get started'
        : `${fileCount} files ready. POST to /api/sync-monthly-storage`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔄 Get migration status (GET)
app.get('/api/migrate-to-drive', (req, res) => {
  const tempDir = path.join(__dirname, 'public/temp-uploads');
  let fileCount = 0;
  try {
    if (fs.existsSync(tempDir)) {
      fileCount = fs.readdirSync(tempDir).length;
    }
  } catch (e) {}
  
  res.json({
    status: 'Use POST request to migrate',
    method: 'POST',
    endpoint: '/api/migrate-to-drive',
    description: 'Uploads all local files to Google Drive folder and deletes local copies',
    localFilesWaiting: fileCount,
    example: 'curl -X POST https://YOUR_URL/api/migrate-to-drive'
  });
});

// 🔄 Migrate all local files to Google Drive
app.post('/api/migrate-to-drive', async (req, res) => {
  try {
    if (!googleDriveReady) {
      return res.status(503).json({ error: 'Google Drive not configured' });
    }

    const tempDir = path.join(__dirname, 'public/temp-uploads');
    if (!fs.existsSync(tempDir)) {
      return res.json({ success: true, uploaded: 0, failed: 0, message: 'No temp uploads folder' });
    }

    const files = fs.readdirSync(tempDir);
    if (!files.length) {
      return res.json({ success: true, uploaded: 0, failed: 0, message: 'No files to migrate' });
    }

    console.log(`\n📤 Starting migration of ${files.length} files to Google Drive...`);
    const uploadResults = await uploadAllFilesFromFolder(tempDir, '1hByCXDjMMrYcWo5oAyqYqK_Jk603nZdL');
    
    // Delete successfully uploaded files
    for (const result of uploadResults) {
      if (result.status === 'uploaded') {
        const filePath = path.join(tempDir, result.file);
        try {
          fs.unlinkSync(filePath);
        } catch (e) {}
      }
    }

    const uploaded = uploadResults.filter(r => r.status === 'uploaded').length;
    const failed = uploadResults.filter(r => r.status === 'failed').length;

    res.json({
      success: true,
      message: `Migration complete: ${uploaded} uploaded, ${failed} failed`,
      uploaded,
      failed,
      results: uploadResults
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📌 Get sync status (GET)
app.get('/api/sync-monthly-storage', (req, res) => {
  const localFolder = path.join(__dirname, 'public/temp-uploads');
  let fileCount = 0;
  try {
    if (fs.existsSync(localFolder)) {
      fileCount = fs.readdirSync(localFolder).length;
    }
  } catch (e) {}
  
  res.json({
    status: 'Use POST request to sync',
    method: 'POST',
    endpoint: '/api/sync-monthly-storage',
    description: 'Uploads all local files to Google Drive folder and deletes local copies',
    localFilesWaiting: fileCount,
    example: 'curl -X POST https://YOUR_URL/api/sync-monthly-storage'
  });
});

// 📌 Sync Monthly Storage - Upload new files
app.post('/api/sync-monthly-storage', async (req, res) => {
  try {
    if (!googleDriveReady) {
      return res.status(503).json({ error: 'Google Drive not configured' });
    }

    const folderId = '1hByCXDjMMrYcWo5oAyqYqK_Jk603nZdL';
    const localFolder = path.join(__dirname, 'public/temp-uploads');

    console.log('\n📌 Starting monthly storage sync...');

    if (!fs.existsSync(localFolder)) {
      return res.json({ 
        success: true, 
        uploaded: 0, 
        message: 'No local files to upload' 
      });
    }

    const files = fs.readdirSync(localFolder);
    if (!files.length) {
      return res.json({ 
        success: true, 
        uploaded: 0, 
        message: 'No local files to upload' 
      });
    }

    console.log(`📤 Uploading ${files.length} files to Google Drive...`);
    const uploadResults = await uploadAllFilesFromFolder(localFolder, folderId);
    
    // Delete successfully uploaded files
    for (const result of uploadResults) {
      if (result.status === 'uploaded') {
        const filePath = path.join(localFolder, result.file);
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Deleted local: ${result.file}`);
        } catch (e) {}
      }
    }

    const uploaded = uploadResults.filter(r => r.status === 'uploaded').length;
    const failed = uploadResults.filter(r => r.status === 'failed').length;

    res.json({
      success: true,
      message: `Monthly sync complete: ${uploaded} uploaded`,
      uploaded,
      failed,
      results: uploadResults
    });
  } catch (error) {
    console.error('❌ Sync error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Now serve static files (after API routes)
app.use(express.static(path.join(__dirname, 'public')));

// Start server
const PORT = 5000;
app.listen(PORT, ()=>{
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📤 File upload API: POST /api/upload`);
});
