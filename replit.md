# Facebook Page Automation Tool

## Overview
A Node.js automation tool that posts content to your Facebook page and generates manual share links for Facebook groups. The tool runs 24/7 with an Express server that can be monitored by Keep Alive services like UptimeRobot.

**Last Updated**: November 20, 2025

## Project Type
Automation Script / Webhook Handler

## Features
- ✅ Automated posting to Facebook page using PAGE_TOKEN
- ✅ Manual share link generation for Facebook groups (compliance-safe)
- ✅ Express server with health check endpoints for 24/7 uptime monitoring
- ✅ Secure token management using .env file
- ✅ Configurable post messages and intervals
- ✅ Comprehensive logging system for tracking posts
- ✅ API endpoints for manual triggering and control

## Technology Stack
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **HTTP Client**: Axios
- **Environment**: dotenv
- **API**: Facebook Graph API v18.0

## Project Structure
```
.
├── index.js              # Main application server
├── package.json          # Project dependencies
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
- `POST_MESSAGE`: The message to post on your page
- `POST_INTERVAL`: How often to post (in milliseconds, default: 1 hour)

### 4. Start the Application
The workflow is already configured. Just ensure your `.env` file is set up and the server will run automatically.

## API Endpoints

### GET /
Health status and basic information
```bash
curl https://your-repl-url.replit.dev/
```

### GET /health
Health check endpoint (for UptimeRobot or similar services)
```bash
curl https://your-repl-url.replit.dev/health
```

### POST /post-now
Trigger a manual post immediately
```bash
curl -X POST https://your-repl-url.replit.dev/post-now
```

### POST /toggle-posting
Enable or disable automated posting
```bash
curl -X POST https://your-repl-url.replit.dev/toggle-posting
```

## How It Works

### Automated Posting Cycle
1. The server posts to your Facebook page using the Graph API
2. After a successful post, it generates manual share links for each group
3. You manually review and share the post to groups (ensures compliance)
4. The cycle repeats based on `POST_INTERVAL`

### Manual Sharing Process
When a post is published, the logs will show:
```
[INFO] Group 1: Visit https://www.facebook.com/groups/[GROUP_ID] and manually share: https://www.facebook.com/[POST_ID]
```

Visit each link, review the post, and manually share it to the group.

## Security & Compliance

### Security Measures
- ✅ All tokens stored securely in `.env` (never committed to git)
- ✅ `.gitignore` configured to exclude sensitive files
- ✅ No token exposure in logs or API responses
- ✅ Server binds to 0.0.0.0:5000 for Replit environment

### Facebook Policy Compliance
- ✅ Automated posting only to owned page (allowed)
- ✅ Manual review required for group sharing (prevents spam)
- ✅ No automated cross-posting to groups (complies with Facebook policies)
- ✅ Respects API rate limits and best practices

## Logging
All activities are logged with timestamps:
- `[SUCCESS]`: Successful operations
- `[INFO]`: General information
- `[WARN]`: Warnings (missing config, etc.)
- `[ERROR]`: Error messages with details

## 24/7 Uptime with UptimeRobot

### Setup Steps
1. Create account at [UptimeRobot](https://uptimerobot.com/)
2. Add new monitor with type "HTTP(s)"
3. Use your Replit URL + `/health` endpoint
4. Set monitoring interval (5 minutes recommended)
5. UptimeRobot will ping your server to keep it alive

## Troubleshooting

### Server Won't Start
- Check that all required environment variables are set
- Verify `.env` file exists and is properly formatted

### Posts Not Publishing
- Verify `PAGE_TOKEN` has correct permissions
- Check that `PAGE_ID` is correct
- Review server logs for Facebook API error messages
- Ensure token hasn't expired (Page tokens can be long-lived)

### Missing Share Links
- Verify `GROUP_IDS` is configured in `.env`
- Check that IDs are comma-separated with no extra spaces

## User Preferences
- Prefers policy-compliant automation
- Values security and token protection
- Wants 24/7 operation without local machine dependency
- Manual review process for group sharing

## Recent Changes
- **November 20, 2025**: Initial project setup with Express server, Facebook Graph API integration, manual share link generation, and comprehensive logging system

## Next Steps / Future Enhancements
- Add post scheduling system with cron-like timing
- Implement post preview interface before publishing
- Create dashboard to view posting history
- Add support for posting images and media
- Implement retry logic for failed API calls
- Add email notifications for successful posts
