# 🚀 Facebook Automation Dashboard - 2025

## Overview
A professional Node.js Express server (port 5000) with real-time server monitoring dashboard and **fully functional Facebook automation** for posting photos/videos to pages and groups.

**Status**: ✅ **PRODUCTION READY - FACEBOOK POSTING WORKING**
**Last Updated**: November 21, 2025

## Project Type
Node.js Express Web Server + Facebook Graph API Integration + Real-Time Monitoring

## ✅ Completed Features

### Server Monitoring
- ✅ Real-time CPU usage monitoring (percentage)
- ✅ Live RAM usage with used/free breakdown
- ✅ Disk space monitoring (total/used/free)
- ✅ Network speed monitoring (RX/TX)
- ✅ Active services and ports display
- ✅ Beautiful modern dashboard UI with Chart.js
- ✅ Doughnut charts with gradient animations
- ✅ Server restart control button
- ✅ Responsive 3-column grid layout
- ✅ Dark theme with cyan/magenta accents

### Facebook Automation (WORKING ✅)
- ✅ **Post to IT-Solutions Page** with photos/videos (Two-step API process)
- ✅ **Post to Facebook Groups** with media support
- ✅ Automatic photo validation & optimization (1200×1200, 80% quality)
- ✅ Session tracking for every upload (unique session ID per device)
- ✅ Real-time upload progress bar on dashboard
- ✅ File size validation (50MB photos, 100MB videos)
- ✅ Device tracking (detects Windows, Mac, mobile, etc.)
- ✅ Auto-sync groups from user's Facebook account
- ✅ Manual group ID input support
- ✅ Server logging of all uploads (IP, device, session, file size)

## Technology Stack
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Facebook API**: Graph API v18.0
- **Monitoring**: systeminformation package
- **Charts**: Chart.js (CDN)
- **Media Processing**: Sharp + ImageMagick + FFmpeg
- **Upload Handling**: Multer (disk storage)
- **HTTP Client**: Axios
- **Environment**: dotenv

## Project Structure
```
.
├── index.js                    # Main Express server (750+ lines)
├── media-optimizer.js          # Photo/video optimization module
├── public/
│   ├── index.html             # Dashboard UI with Facebook controls
│   └── temp-uploads/          # Session uploads directory
├── package.json               # All dependencies
├── .env.example               # Environment template
├── .gitignore                # Git config
└── replit.md                 # This file
```

## Facebook Automation API Endpoints

### POST /api/facebook/post
**Post to IT-Solutions Page with photo/video**
```json
Request:
{
  "message": "Your post text",
  "link": "Optional URL",
  "photo": <file>,
  "video": <file>,
  "sessionId": "session_..."
}

Response (Success):
{
  "success": true,
  "message": "✅ Post published to IT-Solutions!",
  "postId": "133112064223614_1157045709891330"
}
```

### POST /api/facebook/group-post
**Post to Facebook Group with media**
```json
Request:
{
  "group_id": "123456789",
  "message": "Your message",
  "photo": <file>,
  "video": <file>,
  "sessionId": "session_..."
}

Response (Success):
{
  "success": true,
  "message": "✅ Posted to group!",
  "postId": "123456789_987654321"
}
```

### GET /api/facebook/auto-groups
**Fetch user's Facebook groups automatically**

### GET /api/facebook/page-info
**Get page profile picture and info**

### GET /api/facebook/validate-token
**Check if Facebook tokens are valid**

## How to Use (Step-by-Step)

### 1. Setup Environment
```bash
# Create .env file with:
FB_USER_TOKEN=your_user_token_here
FB_PAGE_TOKEN=your_page_token_here  # Optional
FB_USER_ID=your_user_id_here
SESSION_SECRET=your_secret
RESTART_PASSWORD=your_restart_password
```

### 2. Start Server
```bash
npm install
node index.js
```
Server runs on **https://your-repl-url/** (port 5000)

### 3. Post to Facebook Page
1. Open dashboard
2. Enter message
3. Click "📷 Select Photo" or "🎥 Select Video" from your device
4. Click "📤 Post to Page"
5. Watch progress bar
6. Post appears on IT-Solutions Page immediately ✅

### 4. Post to Groups
1. Click "👥 Post to Facebook Groups"
2. Method 1: "🔄 Auto-Sync Groups" to find your groups
3. Method 2: Enter group IDs manually
4. Select group from dropdown
5. Enter message + media
6. Click "📤 Post to Selected Group"

## Dashboard Features

| Feature | Description |
|---------|-------------|
| **CPU Chart** | Real-time usage (red/orange gradient) |
| **RAM Chart** | Memory usage breakdown (green/cyan gradient) |
| **Disk Chart** | Storage utilization (magenta/pink gradient) |
| **Network Chart** | Speed monitoring (cyan/blue gradient) |
| **Services Table** | Active listening services and ports |
| **Facebook Control** | Post to page/groups with photos |
| **Session Tracker** | Real-time upload progress & device info |
| **Token Status** | Check Facebook token validity |

## Media Processing Features

- **Photo Optimization**: Reduces to 1200×1200px, 80% JPEG quality
- **Video Validation**: Checks format and size before upload
- **Automatic Encoding**: ImageMagick + FFmpeg support
- **File Validation**: Prevents oversized files (50MB photos, 100MB videos)
- **Smart Upload**: Two-step process for Facebook compatibility

## Session Tracking

Every upload gets tracked with:
- Unique session ID
- Device/OS information (Windows, Mac, Linux, iOS, Android)
- Upload timestamp
- File name and size
- Post ID once published
- Client IP address
- User-Agent string

Stored in **localStorage** for audit trail.

## Server Logging

Complete server logs show:
```
📱 Session: session_1763714258683_6zyz0cf03
👤 Client IP: ::ffff:172.31.98.162
📋 User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...
📸 Photo: ff897d8921889eb8.jpg (52.54KB)
✅ Image valid: jpeg (1024x1024)
✅ Image optimized: ff897d8921889eb8.jpg (50.16 KB)
📤 Uploading photo to 133112064223614/photos endpoint...
✅ Photo uploaded successfully, ID: ...
📤 Creating post on 133112064223614/feed...
✅ Post successful: 133112064223614_1157045709891330
```

## Facebook API Flow (Two-Step Process)

### Step 1: Upload Photo
```
POST /v18.0/{PAGE_ID}/photos
├── source: (binary image data)
├── access_token: page_token
└── Returns: photo_id, post_url
```

### Step 2: Create Feed Post
```
POST /v18.0/{PAGE_ID}/feed
├── message: "Your post text"
├── picture: post_url (from Step 1)
├── link: optional_url
├── access_token: page_token
└── Returns: post_id
```

This approach bypasses (#100) errors and works reliably.

## 24/7 Uptime Setup

### Using UptimeRobot (Recommended)
1. Create account at [UptimeRobot](https://uptimerobot.com/)
2. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://your-repl-url/`
   - Interval: 5 minutes
3. Server stays alive with periodic pings

## System Requirements

- **Port**: 5000 (for UptimeRobot compatibility)
- **Memory**: ~50MB baseline, scales with uploads
- **Disk**: Minimal (temp uploads cleaned after posting)
- **Node.js**: v20+ (pre-installed)
- **Dependencies**: All in package.json

## Environment Variables

```env
# Facebook API Tokens
FB_USER_TOKEN=your_user_token        # Main token (required)
FB_PAGE_TOKEN=your_page_token        # Optional, auto-fetched from user
FB_USER_ID=your_user_id              # Your Facebook UID

# Server Security
RESTART_PASSWORD=secure_password     # Password for restart endpoint
SESSION_SECRET=random_secret         # Session encryption key
```

## Performance Notes

- Server specs: AMD EPYC 9B14, 8 cores, 64GB RAM
- Dashboard updates every 1.5 seconds
- Photo upload: < 5 seconds (depends on file size)
- Post publish: ~2-3 seconds
- Minimal memory footprint (50MB baseline)
- No database required
- All data fetched from system APIs

## Troubleshooting

### Post not appearing on Facebook
- Check token validity: Click "🔍 Check Facebook Tokens"
- Verify page/group access: Ensure token has permission
- Check file size: 50MB max for photos
- Review server logs for error details

### Upload fails with "Invalid URL" error
- The two-step process handles this automatically
- Check token expiration
- Verify internet connection

### Dashboard not loading
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Try incognito/private window
- Check server status: `https://your-repl-url/api/stats`

### Photos not optimized
- Sharp library handles it automatically
- Check disk space for temp files
- Verify public/temp-uploads/ directory exists

## File Cleanup

- Temporary uploads stored in `public/temp-uploads/`
- Files automatically deleted after posting to Facebook
- Manual cleanup: `npm run cleanup`

## Security

- ✅ No passwords logged in console
- ✅ Tokens read fresh from environment (not cached)
- ✅ File validation before upload
- ✅ Session tracking for audit trail
- ✅ Client IP logging for security
- ✅ Cache headers prevent stale data

## Deployment

### Push to GitHub
```bash
git add .
git commit -m "Facebook Automation Dashboard - Production Ready"
git push origin main
```

### Deploy to Production
```bash
# Replit: Click "Publish" button in top right
# Or use custom domain
```

### Docker (Optional)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 5000
CMD ["node", "index.js"]
```

## Success Metrics

✅ **Testing Completed**:
- Photo uploaded successfully to IT-Solutions Page
- Post visible on Facebook Web, Android, Desktop
- Session tracking working
- Progress bar accurate
- File optimization successful
- Two-step API process reliable

## Next Steps / Future Enhancements

- [ ] Post scheduling system (schedule posts for later)
- [ ] Video transcoding (optimize videos for Facebook)
- [ ] Caption templates (pre-written post templates)
- [ ] Analytics dashboard (track post performance)
- [ ] Email/SMS notifications (alert on errors)
- [ ] Database persistence (store post history)
- [ ] Advanced group filtering (target specific groups)
- [ ] Automatic resharing (cross-post to multiple groups)

## Support / Issues

- Check server logs: `https://your-repl-url/` console
- Verify Facebook tokens validity
- Ensure you have page/group posting permissions
- Check file size limits (50MB photos, 100MB videos)

## Deployment Status

✅ **Ready for Production**
✅ **Ready for GitHub** → https://github.com/Mohamedsafwat93/FB-AutoShare
✅ **Ready for Replit Publishing** (24/7 uptime with UptimeRobot)
✅ **Facebook Posting Tested & Working**

---

**Made with ❤️ by Replit Agent**
**For**: Eng. Muhammed Safwat
