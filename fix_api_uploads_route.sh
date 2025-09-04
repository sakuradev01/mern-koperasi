#!/bin/bash

# Script untuk fix route /api/uploads di AWS server
echo "🔧 Fixing /api/uploads route on AWS server"
echo "=========================================="

# Navigate to server directory
cd /home/ubuntu/app/server || cd /home/ec2-user/app/server || {
    echo "❌ Cannot find app directory"
    exit 1
}

echo "📁 Current directory: $(pwd)"

# Get server IP
SERVER_IP=$(curl -s http://checkip.amazonaws.com/)
echo "📍 Server IP: $SERVER_IP"

# Check if PM2 is running
echo ""
echo "🔍 Checking PM2 status..."
pm2 list | grep mern-koperasi-backend

# Test current routes
echo ""
echo "🧪 Testing current routes..."

# Test 1: Main server
echo "Test 1: Main server"
curl -s http://localhost:5000/ > /dev/null && echo "✅ Main server responding" || echo "❌ Main server not responding"

# Test 2: Debug config
echo "Test 2: Debug config"
curl -s http://localhost:5000/debug/config > /dev/null && echo "✅ Debug config working" || echo "❌ Debug config not working"

# Test 3: Direct uploads
echo "Test 3: Direct /uploads route"
SAMPLE_FILE=$(ls uploads/savings/ 2>/dev/null | head -1)
if [ ! -z "$SAMPLE_FILE" ]; then
    curl -s -I http://localhost:5000/uploads/savings/$SAMPLE_FILE | head -1 | grep -q "200" && echo "✅ /uploads route working" || echo "❌ /uploads route not working"
else
    echo "⚠️  No sample files to test"
fi

# Test 4: API uploads test endpoint
echo "Test 4: /api/uploads/test route"
curl -s http://localhost:5000/api/uploads/test > /dev/null && echo "✅ /api/uploads/test working" || echo "❌ /api/uploads/test not working"

# Test 5: API uploads file access
echo "Test 5: /api/uploads file access"
if [ ! -z "$SAMPLE_FILE" ]; then
    curl -s -I http://localhost:5000/api/uploads/savings/$SAMPLE_FILE | head -1 | grep -q "200" && echo "✅ /api/uploads file access working" || echo "❌ /api/uploads file access not working"
else
    echo "⚠️  No sample files to test"
fi

# Check recent logs for any errors
echo ""
echo "📋 Recent PM2 logs (looking for errors):"
pm2 logs mern-koperasi-backend --lines 10 --nostream | grep -E "(error|Error|ERROR|404|500)"

echo ""
echo "🔧 Manual test commands:"
echo "========================"
echo "1. Test debug endpoint:"
echo "   curl http://localhost:5000/debug/config"
echo ""
echo "2. Test API uploads test:"
echo "   curl http://localhost:5000/api/uploads/test"
echo ""
echo "3. Test file access (replace FILENAME):"
echo "   curl -I http://localhost:5000/api/uploads/savings/FILENAME"
echo ""
echo "4. External test (from browser):"
echo "   http://$SERVER_IP:5000/api/uploads/test"
echo "   http://$SERVER_IP:5000/api/uploads/savings/$SAMPLE_FILE"
echo ""
echo "📝 If /api/uploads still returns 404:"
echo "======================================"
echo "1. Check if route order is correct in app.js"
echo "2. Restart PM2: pm2 restart mern-koperasi-backend"
echo "3. Check PM2 logs: pm2 logs mern-koperasi-backend"
echo "4. Verify file exists: ls -la uploads/savings/"