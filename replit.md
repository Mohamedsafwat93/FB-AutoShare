# Facebook Automation Dashboard

## Overview
A lightweight Node.js web server running on port 5000 that serves a beautiful dashboard for Facebook automation management. The server includes a health check endpoint for monitoring services like UptimeRobot.

**Last Updated**: November 21, 2025

## Project Type
Minimal Express Web Server with Dashboard

## Current Features
- ✅ Express.js server on port 5000
- ✅ Static dashboard UI from public folder
- ✅ `/health` endpoint for uptime monitoring
- ✅ `/find-dashboard` endpoint to locate and return dashboard URL
- ✅ Ready for Facebook automation integration

## Technology Stack
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **HTTP Client**: Axios (installed)
- **Environment**: dotenv (installed)

## Project Structure
```
.
├── index.js                  # Main Express server (35 lines)
├── public/
│   └── dashboard.html        # Dashboard UI
├── package.json              # Dependencies
├── package-lock.json         # Lock file
├── .env.example              # Environment template
├── .gitignore               # Git configuration
└── replit.md                # This file
```

## Setup Instructions

### 1. Install Dependencies
Dependencies are already installed (Express, Axios, dotenv). If needed:
```bash
npm install
```

### 2. Start the Server
The workflow "Start Server" is already configured and runs automatically. Or manually:
```bash
node index.js
```

### 3. Access Your Dashboard
```
http://your-repl-url:5000/
```

## API Endpoints

### GET /
Serves the dashboard.html from the public folder

### GET /health
Health check for monitoring services (UptimeRobot, etc.)
```bash
curl https://your-repl-url/health
```
Response: `Server is running!`

### GET /find-dashboard
Auto-discovers the dashboard file and returns its URL
```bash
curl https://your-repl-url/find-dashboard
```
Response:
```json
{
  "dashboard_file": "dashboard.html",
  "dashboard_url": "https://your-repl-url/dashboard.html",
  "base_url": "https://your-repl-url"
}
```

## 24/7 Uptime with UptimeRobot

### Setup Steps
1. Create account at [UptimeRobot](https://uptimerobot.com/)
2. Add new monitor with type "HTTP(s)"
3. Use your Replit URL + `/health` endpoint
4. Set monitoring interval (5 minutes recommended)
5. UptimeRobot will ping your server to keep it alive

## Troubleshooting

### Server Won't Start
- Check that Node.js dependencies are installed: `npm install`
- Verify no other process is using port 5000

### Dashboard Not Loading
- Ensure the workflow is running
- Check that `public/dashboard.html` exists
- Clear browser cache

### Can't Find Dashboard URL
- Visit `https://your-repl-url/find-dashboard` to auto-discover the dashboard

## User Preferences
- Minimal, clean, lightweight codebase
- Focus on serving dashboard and health checks
- Ready for future Facebook API integration
- Secure token management via .env file

## Recent Changes
- **November 21, 2025**: Cleaned up project, removed Python files, simplified to minimal Express server
- Created `/find-dashboard` endpoint for auto-discovery

## Next Steps / Future Enhancements
- Integrate Facebook Graph API for automated posting
- Add post management API endpoints
- Implement post scheduling system
- Add support for posting images and media
- Create analytics dashboard
- Add email notifications
