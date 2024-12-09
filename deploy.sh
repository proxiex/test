# Log file for deployment process (optional)
LOG_FILE="deploy.log"

# Update code
echo "[+] Fetching changes from Git..."
echo "Fetching changes from Git..." >> "$LOG_FILE" 2>&1
git pull >> "$LOG_FILE" 2>&1

# Install dependencies
echo "[+] Installing dependencies..." 
echo "Installing dependencies..." >> "$LOG_FILE" 2>&1
npm install >> "$LOG_FILE" 2>&1

# Build project
echo "[+] Building project..." 
echo "Building project..." >> "$LOG_FILE" 2>&1
npm run build >> "$LOG_FILE" 2>&1

echo "[+] Sourcing .env file..." 
echo "Sourcing .env file..." >> "$LOG_FILE" 2>&1
source .env

echo "[+] Deleting old momapi..." 
echo "Deleting old momapi..." >> "$LOG_FILE" 2>&1
pm2 delete momapi >> "$LOG_FILE" 2>&1

# Reload application with updated environment variables
echo "[+] Deploying momapi..." 
echo "Deploying momapi..." >> "$LOG_FILE" 2>&1
pm2 start build/server.js --name momapi

echo "[*] Deployment completed!"
echo "Deployment completed!" >> "$LOG_FILE" 2>&1
