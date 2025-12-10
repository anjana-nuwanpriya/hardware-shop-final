cat > /tmp/restart.sh << 'EOF'
#!/bin/bash

cd "/Users/anjana/Desktop/hardware-shop"

# Kill any existing npm process
pkill -f "npm run dev" 2>/dev/null

# Clear caches
rm -rf .next .turbo node_modules/.cache

# Restart
npm run dev
EOF

chmod +x /tmp/restart.sh
echo "Script created. Run this in your terminal:"
echo "cd /Users/anjana/Desktop/hardware-shop && bash /tmp/restart.sh"