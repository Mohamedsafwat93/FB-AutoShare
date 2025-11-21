# Facebook Page Automation Tool

## Overview
A Node.js automation tool that posts content to your Facebook page and generates manual share links for Facebook groups. The tool runs 24/7 with an Express server that can be monitored by Keep Alive services like UptimeRobot. Includes a web dashboard for managing posts.

**Last Updated**: November 21, 2025

## Project Type
Automation Script / Webhook Handler with Web Dashboard

## Features
- ✅ Web dashboard for post management and monitoring
- ✅ Automated posting to Facebook page using PAGE_TOKEN
- ✅ Manual share link generation for Facebook groups (compliance-safe)
- ✅ Express server with health check endpoints for 24/7 uptime monitoring
- ✅ Secure token management using .env file
- ✅ Persistent post logging with history tracking (last 50 posts)
- ✅ Real-time server statistics (CPU, RAM, uptime)
- ✅ One-click post deletion and reposting

## Technology Stack
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **HTTP Client**: Axios
- **Environment**: dotenv
- **API**: Facebook Graph API v18.0
- **Frontend**: HTML5 with vanilla JavaScript

## Project Structure
```
.
├── index.js              # Main server with Facebook API and dashboard backend
├── public/
│   └── dashboard.html    # Web dashboard UI
├── package.json          # Project dependencies
├── package-lock.json     # Lock file
├── .env.example          # Environment variables template
├── .gitignore           # Git ignore configuration
└── replit.md            # This file
```

## Setup Instructions

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 2. Get Facebook Tokens

#### PAGE_TOKEN:
1. Go to [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your Facebook page from the dropdown
3. Grant permissions: `pages_manage_posts`, `pages_read_engagement`
4. Generate the token and copy it

#### PAGE_ID:
1. Go to your Facebook page
2. Click "About" section
3. Scroll down to find "Page ID" or check the URL

#### GROUP_IDS (Optional):
1. Visit the Facebook group
2. Copy the group ID from the URL or use Graph API to find it
3. Add multiple IDs separated by commas

### 3. Configure Your Post Settings
Edit your `.env` file:
- `PAGE_TOKEN`: Your Facebook page token (required)
- `PAGE_ID`: Your Facebook page ID (required)
- `GROUP_IDS`: Comma-separated group IDs for manual sharing (optional)
- `POST_MESSAGE`: The message to post on your page
- `POST_INTERVAL`: How often to post (in milliseconds, default: 1 hour)

### 4. Start the Application
The workflow is already configured. Just ensure your `.env` file is set up and the server will run automatically.

## Dashboard Features

### Web Interface (http://your-url:5000/)
- **Last 10 Posts**: View recent posts with timestamps and status
- **Post Actions**: Delete unwanted posts or repost your last message
- **Server Stats**: Real-time CPU, memory usage, and uptime information
- **Auto-refresh**: Dashboard updates every 15 seconds

### Post Management
1. View all recent posts with creation timestamps
2. Delete posts that are no longer needed
3. Repost your last successful message with one click
4. Color-coded status indicators (Success/Failed/Pending)

## API Endpoints

### GET /
Dashboard web interface

### GET /health
Health check endpoint (for UptimeRobot or similar services)
```bash
curl https://your-repl-url.replit.dev/health
```

### GET /api/posts
Get recent posts (last 10)
```bash
curl https://your-repl-url.replit.dev/api/posts
```

### GET /api/stats
Get server statistics
```bash
curl https://your-repl-url.replit.dev/api/stats
```

### POST /api/posts
Create a new post
```bash
curl -X POST https://your-repl-url.replit.dev/api/posts \
  -H "Content-Type: application/json" \
  -d '{"message": "Your post content"}'
```

### DELETE /api/posts/:id
Delete a specific post
```bash
curl -X DELETE https://your-repl-url.replit.dev/api/posts/1
```

### POST /api/repost
Repost the last successful message
```bash
curl -X POST https://your-repl-url.replit.dev/api/repost
```

## How It Works

### Automated Posting
1. The server posts to your Facebook page using the Graph API
2. After successful post, it generates manual share links for each group
3. You review and manually share the post to groups (ensures compliance)
4. The cycle repeats based on `POST_INTERVAL`

### Manual Sharing Process
When a post is published, group share links are displayed:
```
[INFO] Group 1: Visit https://www.facebook.com/groups/[GROUP_ID] and manually share: https://www.facebook.com/[POST_ID]
```

Visit each link, review the post, and manually share it to the group.

## Security & Compliance

### Security Measures
- ✅ All tokens stored securely in `.env` (never committed to git)
- ✅ `.gitignore` configured to exclude sensitive files and logs
- ✅ No token exposure in logs or API responses
- ✅ Server binds to 0.0.0.0:5000 for Replit environment

### Facebook Policy Compliance
- ✅ Automated posting only to owned page (allowed)
- ✅ Manual review required for group sharing (prevents spam)
- ✅ No automated cross-posting to groups (complies with Facebook policies)
- ✅ Respects API rate limits and best practices

## Persistent Logging
- All posts automatically saved to `postsLog.json` (gitignored)
- Keeps track of last 50 posts for history
- Posts survive server restarts
- Prevents duplicate posts after deletion

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
- Verify `.env` file exists and is properly formatted
- Check server logs in the console

### Posts Not Publishing
- Verify `PAGE_TOKEN` has correct permissions
- Check that `PAGE_ID` is correct
- Review server logs for Facebook API error messages
- Ensure token hasn't expired (Page tokens can be long-lived)

### Missing Share Links
- Verify `GROUP_IDS` is configured in `.env`
- Check that IDs are comma-separated with no extra spaces

### Dashboard Not Loading
- Ensure server is running (check workflow status)
- Clear browser cache and refresh
- Check that port 5000 is accessible

## User Preferences
- Prefers policy-compliant automation
- Values security and token protection
- Wants 24/7 operation without local machine dependency
- Manual review process for group sharing
- Simplified, clean web interface for post management

## Recent Changes
- **November 21, 2025**: Updated dashboard UI with simplified design, cleaned up unused files
- **November 20, 2025**: Enhanced server with API endpoints, persistent logging, post management features

## Next Steps / Future Enhancements
- Add post scheduling system with cron-like timing
- Implement post preview interface before publishing
- Create analytics dashboard to view posting history
- Add support for posting images and media
- Implement retry logic for failed API calls
- Add email notifications for successful posts
