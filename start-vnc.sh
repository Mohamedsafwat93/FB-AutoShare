#!/bin/bash

# Create VNC directory if it doesn't exist
mkdir -p ~/.vnc

# Kill any existing VNC server
vncserver -kill :1 2>/dev/null || true

# Start VNC server on display :1
# This creates a virtual X display for applications
vncserver :1 -geometry 1920x1080 -depth 24

echo "VNC Server started on display :1"
echo "Connect to: localhost:5901"
