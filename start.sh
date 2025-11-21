#!/bin/bash

# Start virtual display (Xvfb) in the background
echo "Starting virtual display..."
Xvfb :99 -screen 0 1920x1080x24 &
XVFB_PID=$!
export DISPLAY=:99

# Wait for Xvfb to start
sleep 2

# Start VNC server (x11vnc)
echo "Starting VNC server on port 5900..."
x11vnc -display :99 -forever -nopw -listen localhost &
VNC_PID=$!

sleep 2

# Start Node.js server with Health Check Cron
echo "Starting Node.js server on port 5000 with Health Check..."
node /home/runner/workspace/index.js

# Cleanup
trap "kill $XVFB_PID $VNC_PID" EXIT
