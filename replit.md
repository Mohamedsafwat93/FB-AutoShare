# Server Monitoring Dashboard

## Overview
A professional Node.js Express server running on port 5000 that displays real-time server statistics through a beautiful modern web dashboard. Includes CPU, RAM, disk, and network monitoring with active services tracking.

**Last Updated**: November 21, 2025

## Project Type
Node.js Express Web Server with Real-Time Monitoring Dashboard

## Current Features
- ✅ Real-time CPU usage monitoring (percentage)
- ✅ Live RAM usage with used/free breakdown
- ✅ Disk space monitoring (total/used/free)
- ✅ Network speed monitoring (RX/TX)
- ✅ Active services and ports display
- ✅ Beautiful modern dashboard UI with Chart.js visualizations
- ✅ Doughnut charts with gradient animations
- ✅ Server restart control button
- ✅ Responsive 3-column grid layout
- ✅ Dark theme with cyan/magenta accents

## Technology Stack
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Monitoring**: systeminformation package
- **Charts**: Chart.js (CDN)
- **Storage**: diskusage package
- **Environment**: dotenv (installed)

## Project Structure
```
.
├── index.js                  # Main Express server (90 lines)
├── public/
│   ├── index.html            # Modern dashboard UI
│   └── login.html            # Login page template
├── package.json              # Dependencies
├── package-lock.json         # Lock file
├── .env.example              # Environment template
├── .gitignore               # Git configuration
└── replit.md                # This file
```

## API Endpoints

### GET /api/stats
Returns real-time system statistics
```json
{
  "uptime": 935.6,
  "platform": "linux",
  "cpuUsage": "89.4",
  "totalMem": 67430191104,
  "freeMem": 42035417088,
  "diskUsed": 34193473536,
  "diskTotal": 52743716864,
  "network": { "rx_sec": 451.3, "tx_sec": 15677.5 },
  "services": [{ "proto": "tcp", "localAddress": "0.0.0.0:5000", "state": "LISTEN", "pid_program": "node" }]
}
```

### GET /api/services
Lists active network services (fallback endpoint)

### POST /api/restart
Triggers server restart (responds with confirmation)

### GET /login
Serves the login page in a popup window

### GET / or /dashboard.html
Serves the main dashboard

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```
All dependencies are pre-installed:
- express
- systeminformation
- diskusage
- dotenv
- axios

### 2. Start the Server
The workflow "Start Server" runs automatically. Or manually:
```bash
node index.js
```

### 3. Access Dashboard
```
https://your-repl-url/
```

## Dashboard Features

**CPU Chart**: Real-time CPU usage percentage (red/orange gradient)
**RAM Chart**: Memory usage with free/used breakdown (green/cyan gradient)
**Disk Chart**: Storage utilization (magenta/pink gradient)
**Network Chart**: Network speed monitoring (cyan/blue gradient)
**Services Table**: Active listening services and ports
**Restart Button**: Trigger server restart functionality

## 24/7 Uptime with UptimeRobot

### Setup Steps
1. Create account at [UptimeRobot](https://uptimerobot.com/)
2. Add new monitor with type "HTTP(s)"
3. Use your Replit URL (e.g., `https://your-repl-url/`)
4. Set monitoring interval (5 minutes recommended)
5. Server will stay alive with pings

## Performance Notes
- Server specs: AMD EPYC 9B14, 8 cores, 64GB RAM
- Dashboard updates every 1.5 seconds
- Minimal memory footprint
- No database required
- All data fetched from system APIs

## Troubleshooting

### Dashboard not loading
- Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Or open in incognito/private window

### API returning errors
- Check server is running: `curl http://localhost:5000/api/stats`
- Verify Node.js dependencies: `npm install`

### Services not showing
- Some systems may require elevated permissions for netstat
- Fallback displays empty list (graceful degradation)

## User Preferences
- Modern, professional UI with dark theme
- Real-time updates every 1.5 seconds
- Gradient animations on charts
- Clean data presentation
- Ready for GitHub deployment

## Recent Changes
- **November 21, 2025**: Deployed modern 2025 dashboard design
- Implemented real-time chart updates with Chart.js
- Added services monitoring to API response
- Implemented cache-control headers to prevent stale data
- Optimized grid layout for responsive design

## Next Steps / Future Enhancements
- Facebook Graph API integration for automated posting
- Post scheduling system
- Media upload support (images/videos)
- Analytics dashboard
- Email/SMS notifications
- User authentication system
- Database persistence for historical data
- Advanced network monitoring (bandwidth graphs)

## Deployment Status
✅ Ready for GitHub push to https://github.com/Mohamedsafwat93/FB-AutoShare
✅ Ready for Replit Publishing (24/7 uptime with UptimeRobot)
✅ Production-ready code

