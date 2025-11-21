# Docker Setup Guide

## Quick Start

### 1. Prerequisites
- Docker installed
- Docker Compose installed

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your Facebook tokens
```

### 3. Run with Docker Compose
```bash
docker-compose up -d
```

This will start:
- **MinIO Server**: http://localhost:9000 (API) & http://localhost:9001 (Console)
- **Node.js App**: http://localhost:5000

### 4. Login to MinIO Console
- URL: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin`

## Manual Docker Commands

### Build Image
```bash
docker build -t fb-autoshare .
```

### Run Only MinIO
```bash
docker run -d -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  --name minio \
  minio/minio:latest server /data --console-address ":9001"
```

### Run Only Node App
```bash
docker run -d -p 5000:5000 \
  -e MINIO_ENDPOINT=localhost \
  -e MINIO_PORT=9000 \
  --name fb-autoshare \
  fb-autoshare
```

## Environment Variables

```env
# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Facebook
FB_PAGE_TOKEN=your_token_here
FB_USER_TOKEN=your_token_here
FB_USER_ID=your_user_id

# Server
RESTART_PASSWORD=your_password
SESSION_SECRET=your_secret
```

## Troubleshooting

### MinIO won't start
```bash
docker-compose logs minio
# Check disk space and permissions
```

### App can't connect to MinIO
```bash
# Verify network connectivity
docker-compose exec node-app ping minio
```

### Clear everything and restart
```bash
docker-compose down -v
docker-compose up -d
```

## Production Deployment

### For AWS ECS
```bash
docker push your-registry/fb-autoshare:latest
# Update ECS task definition with image
```

### For Digital Ocean
```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Clone repo
git clone https://github.com/Mohamedsafwat93/FB-AutoShare.git
cd FB-AutoShare

# Create .env file
nano .env

# Start services
docker-compose up -d
```

### For Heroku
```bash
# Set Docker as build pack
heroku create your-app-name
heroku stack:set container

# Push to deploy
git push heroku main
```
