# 🚀 AWS Deployment Guide v4 - MERN Koperasi

## 📋 Daftar Isi
1. [Persiapan AWS EC2](#1-persiapan-aws-ec2)
2. [Setup Server EC2](#2-setup-server-ec2)
3. [Konfigurasi GitHub Secrets](#3-konfigurasi-github-secrets)
4. [GitHub Actions Workflow](#4-github-actions-workflow)
5. [Konfigurasi Nginx](#5-konfigurasi-nginx)
6. [Environment Variables](#6-environment-variables)
7. [Database Setup](#7-database-setup)
8. [SSL Certificate (Optional)](#8-ssl-certificate-optional)
9. [Monitoring & Maintenance](#9-monitoring--maintenance)
10. [Troubleshooting](#10-troubleshooting)

---

## 🎯 1. Persiapan AWS EC2

### 1.1 Membuat EC2 Instance

1. **Login ke AWS Console**
   - Buka [AWS Console](https://aws.amazon.com/console/)
   - Pilih region terdekat (contoh: ap-southeast-1 - Singapore)

2. **Launch EC2 Instance**
   ```
   - AMI: Ubuntu Server 22.04 LTS (Free Tier Eligible)
   - Instance Type: t2.micro (Free Tier) atau t3.small (Recommended)
   - Key Pair: Buat baru atau gunakan existing
   - Security Group: Buat dengan rules berikut
   ```

3. **Security Group Rules**
   ```
   Type            Protocol    Port Range    Source
   SSH             TCP         22            0.0.0.0/0
   HTTP            TCP         80            0.0.0.0/0
   HTTPS           TCP         443           0.0.0.0/0
   Custom TCP      TCP         5000          0.0.0.0/0 (Backend Port)
   ```

4. **Storage**
   ```
   - Root Volume: 20 GB gp3 (Free Tier: 30 GB)
   - Encryption: Enabled (Recommended)
   ```

### 1.2 Elastic IP (Recommended)
```bash
# Allocate Elastic IP untuk IP statis
1. EC2 Dashboard → Elastic IPs → Allocate Elastic IP address
2. Associate dengan EC2 instance yang dibuat
3. Catat IP address untuk konfigurasi selanjutnya
```

---

## 🔧 2. Setup Server EC2

### 2.1 Koneksi ke Server
```bash
# Ganti path-to-key.pem dengan path ke private key Anda
# Ganti your-ec2-ip dengan IP address EC2
chmod 400 path-to-key.pem
ssh -i path-to-key.pem ubuntu@your-ec2-ip
```

### 2.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.3 Install Node.js & npm
```bash
# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 2.4 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2

# Setup PM2 startup script
pm2 startup
# Jalankan command yang diberikan oleh PM2 (biasanya dimulai dengan sudo env PATH=...)
```

### 2.5 Install Nginx
```bash
sudo apt install nginx -y

# Start dan enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### 2.6 Install Git
```bash
sudo apt install git -y

# Verify installation
git --version
```

### 2.7 Setup Firewall (UFW)
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000
sudo ufw status
```

---

## 🔐 3. Konfigurasi GitHub Secrets

### 3.1 Akses GitHub Repository Settings
```
1. Buka repository GitHub Anda
2. Settings → Secrets and variables → Actions
3. Klik "New repository secret"
```

### 3.2 Required Secrets

#### Server Connection Secrets
```bash
# EC2_HOST
your-ec2-elastic-ip

# EC2_USER
ubuntu

# SSH_PRIVATE_KEY
# Copy isi file .pem key Anda (termasuk -----BEGIN dan -----END)
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----
```

#### Application Environment Secrets
```bash
# MONGO_DB_URL
mongodb+srv://username:password@cluster.mongodb.net/koperasi?retryWrites=true&w=majority

# JWT_SECRET
your-super-secret-jwt-key-min-32-characters

# PORT
5000

# CORS Origins
# CORS_ORIGIN1
http://your-ec2-elastic-ip

# CORS_ORIGIN2
https://your-domain.com

# CORS_ORIGIN3
http://localhost:5173

# STRIPE_SECRET_KEY (Optional)
sk_test_your_stripe_secret_key
```

#### Nginx Configuration Secret
```bash
# NGINX_CONF
server {
    listen 80;
    server_name __EC2_HOST__;

    # Frontend - Serve React build files
    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:__PORT__;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # File uploads
    location /uploads/ {
        proxy_pass http://localhost:__PORT__;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

---

## ⚙️ 4. GitHub Actions Workflow

### 4.1 File Workflow (.github/workflows/deploy.yml)
```yaml
name: Deploy MERN Koperasi to AWS EC2

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            # Stop any running PM2 process
            pm2 stop mern-koperasi-backend || true
            pm2 delete mern-koperasi-backend || true

            # Clean up old app directory and create a fresh one
            sudo rm -rf /home/${{ secrets.EC2_USER }}/app
            mkdir -p /home/${{ secrets.EC2_USER }}/app

            # Clone the repository into the app directory
            git clone --branch main --single-branch https://github.com/${{ github.repository }}.git /home/${{ secrets.EC2_USER }}/app

            # === BACKEND SETUP ===
            cd /home/${{ secrets.EC2_USER }}/app/server

            # Create the .env file for the backend from GitHub Secrets
            echo "MONGO_DB_URL=${{ secrets.MONGO_DB_URL }}" > .env
            echo "PORT=${{ secrets.PORT }}" >> .env
            echo "CORS_ORIGIN1=http://${{ secrets.EC2_HOST }}" >> .env
            echo "CORS_ORIGIN2=${{ secrets.CORS_ORIGIN2 }}" >> .env
            echo "CORS_ORIGIN3=${{ secrets.CORS_ORIGIN3 }}" >> .env
            echo "JWT_SECRET=${{ secrets.JWT_SECRET }}" >> .env
            echo "STRIPE_SECRET_KEY=${{ secrets.STRIPE_SECRET_KEY }}" >> .env
            echo "NODE_ENV=production" >> .env

            # Install backend dependencies
            npm ci --production

            # === FRONTEND SETUP ===
            cd /home/${{ secrets.EC2_USER }}/app/client
            # Install and build the frontend with the correct API URL
            export VITE_SERVER_URL="http://${{ secrets.EC2_HOST }}"

            # Create .env file for frontend
            echo "VITE_SERVER_URL=http://${{ secrets.EC2_HOST }}" > .env
            echo "VITE_API_URL=http://${{ secrets.EC2_HOST }}" >> .env

            npm ci
            npm run build

            # === NGINX SETUP ===
            # Create the Nginx configuration file from a GitHub Secret
            echo "${{ secrets.NGINX_CONF }}" | sudo tee /etc/nginx/sites-available/default

            # Replace placeholders in the Nginx config with actual values from secrets
            sudo sed -i "s/__EC2_HOST__/${{ secrets.EC2_HOST }}/g" /etc/nginx/sites-available/default
            sudo sed -i "s/__PORT__/${{ secrets.PORT }}/g" /etc/nginx/sites-available/default

            # Test Nginx configuration
            sudo nginx -t

            # Clean the default Nginx web root
            sudo rm -rf /var/www/html/*

            # Copy the built frontend files to the Nginx web root
            sudo cp -r /home/${{ secrets.EC2_USER }}/app/client/dist/. /var/www/html/

            # Set proper permissions
            sudo chown -R www-data:www-data /var/www/html/
            sudo chmod -R 755 /var/www/html/

            # Restart Nginx to apply the new configuration
            sudo systemctl restart nginx

            # === START SERVICES ===
            # Start the backend with PM2
            cd /home/${{ secrets.EC2_USER }}/app/server
            # PM2 will automatically use the .env file in the server's root directory
            pm2 start index.js --name "mern-koperasi-backend"

            # Save the PM2 process list to run on server reboot
            pm2 save

            # Enable PM2 to start on boot
            pm2 startup
            pm2 save
```

### 4.2 Trigger Deployment
```bash
# Deployment akan otomatis berjalan ketika:
1. Push ke branch main
2. Manual trigger melalui GitHub Actions tab

# Manual trigger:
1. Buka repository GitHub
2. Actions tab
3. Pilih workflow "Deploy MERN Koperasi to AWS EC2"
4. Klik "Run workflow"
```

---

## 🌐 5. Konfigurasi Nginx

### 5.1 Nginx Configuration Explained
```nginx
# File: /etc/nginx/sites-available/default

server {
    listen 80;
    server_name your-ec2-ip;

    # Serve React frontend
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve uploaded files
    location /uploads/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }
}
```

### 5.2 Manual Nginx Commands
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔧 6. Environment Variables

### 6.1 Server Environment (.env)
```bash
# File: /home/ubuntu/app/server/.env
MONGO_DB_URL=mongodb+srv://username:password@cluster.mongodb.net/koperasi
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
PORT=5000
CORS_ORIGIN1=http://your-ec2-ip
CORS_ORIGIN2=https://your-domain.com
CORS_ORIGIN3=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NODE_ENV=production
```

### 6.2 Client Environment (.env)
```bash
# File: /home/ubuntu/app/client/.env
VITE_SERVER_URL=http://your-ec2-ip
VITE_API_URL=http://your-ec2-ip
```

---

## 🗄️ 7. Database Setup

### 7.1 MongoDB Atlas (Recommended)
```bash
1. Buat account di https://cloud.mongodb.com/
2. Create new cluster (Free tier available)
3. Setup database user dan password
4. Whitelist IP address EC2 (atau 0.0.0.0/0 untuk semua IP)
5. Get connection string dan masukkan ke MONGO_DB_URL
```

### 7.2 Local MongoDB (Alternative)
```bash
# Install MongoDB di EC2
sudo apt-get install gnupg curl
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Connection string untuk local MongoDB
MONGO_DB_URL=mongodb://localhost:27017/koperasi
```

### 7.3 Database Seeding
```bash
# Setelah deployment, jalankan seeder
cd /home/ubuntu/app/server
npm run seed
```

---

## 🔒 8. SSL Certificate (Optional)

### 8.1 Install Certbot
```bash
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### 8.2 Obtain SSL Certificate
```bash
# Pastikan domain sudah pointing ke EC2 IP
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Tambahkan line berikut:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 8.3 Update Nginx for HTTPS
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Rest of your configuration...
}
```

---

## 📊 9. Monitoring & Maintenance

### 9.1 PM2 Monitoring
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs mern-koperasi-backend

# Restart application
pm2 restart mern-koperasi-backend

# Monitor in real-time
pm2 monit
```

### 9.2 System Monitoring
```bash
# Check disk usage
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check running processes
ps aux | grep node
```

### 9.3 Log Management
```bash
# Application logs
pm2 logs --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

### 9.4 Backup Strategy
```bash
# Database backup (MongoDB Atlas has automatic backups)
# For local MongoDB:
mongodump --db koperasi --out /home/ubuntu/backups/$(date +%Y%m%d)

# Application backup
tar -czf /home/ubuntu/backups/app-$(date +%Y%m%d).tar.gz /home/ubuntu/app

# Automated backup script
#!/bin/bash
# File: /home/ubuntu/backup.sh
DATE=$(date +%Y%m%d)
mkdir -p /home/ubuntu/backups
tar -czf /home/ubuntu/backups/app-$DATE.tar.gz /home/ubuntu/app
# Keep only last 7 days of backups
find /home/ubuntu/backups -name "app-*.tar.gz" -mtime +7 -delete
```

---

## 🔧 10. Troubleshooting

### 10.1 Common Issues

#### Application Won't Start
```bash
# Check PM2 logs
pm2 logs mern-koperasi-backend

# Check if port is in use
sudo netstat -tulpn | grep :5000

# Restart application
pm2 restart mern-koperasi-backend
```

#### Nginx Issues
```bash
# Test configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

#### Database Connection Issues
```bash
# Test MongoDB connection
mongo "your-mongodb-connection-string"

# Check environment variables
cat /home/ubuntu/app/server/.env

# Test API endpoint
curl http://localhost:5000/api/auth/login
```

#### File Upload Issues
```bash
# Check uploads directory permissions
ls -la /home/ubuntu/app/server/uploads/

# Fix permissions
sudo chown -R ubuntu:ubuntu /home/ubuntu/app/server/uploads/
chmod -R 755 /home/ubuntu/app/server/uploads/
```

### 10.2 Performance Optimization

#### Enable Gzip Compression
```nginx
# Add to Nginx configuration
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

#### PM2 Cluster Mode
```bash
# Start with cluster mode (utilize all CPU cores)
pm2 start index.js --name "mern-koperasi-backend" -i max
```

#### Database Indexing
```javascript
// Add indexes to frequently queried fields
// In MongoDB:
db.members.createIndex({ "uuid": 1 })
db.savings.createIndex({ "memberId": 1 })
db.savings.createIndex({ "savingsDate": -1 })
```

### 10.3 Security Checklist

```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Check for security updates
sudo unattended-upgrades --dry-run

# Monitor failed login attempts
sudo tail -f /var/log/auth.log

# Setup fail2ban (optional)
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] EC2 instance created and configured
- [ ] Security groups configured
- [ ] Elastic IP allocated (recommended)
- [ ] Domain name configured (if using custom domain)
- [ ] MongoDB database ready
- [ ] GitHub secrets configured

### During Deployment
- [ ] GitHub Actions workflow runs successfully
- [ ] Application starts without errors
- [ ] Database connection established
- [ ] Frontend builds and serves correctly
- [ ] API endpoints respond correctly

### Post-Deployment
- [ ] Test all major functionalities
- [ ] Check file upload functionality
- [ ] Verify member authentication system
- [ ] Test admin dashboard
- [ ] Setup monitoring and alerts
- [ ] Configure backup strategy
- [ ] Document any custom configurations

---

## 🔗 Useful Commands Reference

### Git Commands
```bash
# Clone repository
git clone https://github.com/username/repository.git

# Pull latest changes
git pull origin main

# Check current branch
git branch
```

### PM2 Commands
```bash
pm2 start app.js --name "app-name"
pm2 stop app-name
pm2 restart app-name
pm2 delete app-name
pm2 logs app-name
pm2 monit
pm2 save
pm2 startup
```

### Nginx Commands
```bash
sudo nginx -t                    # Test configuration
sudo systemctl reload nginx     # Reload configuration
sudo systemctl restart nginx    # Restart service
sudo systemctl status nginx     # Check status
```

### System Commands
```bash
df -h                           # Check disk space
free -h                         # Check memory usage
top                             # Check CPU usage
sudo systemctl status service   # Check service status
sudo journalctl -u service -f   # View service logs
```

---

## 📞 Support & Resources

### Documentation Links
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)

### Monitoring Tools
- PM2 Plus: https://app.pm2.io/
- AWS CloudWatch: Built-in AWS monitoring
- Uptime Robot: https://uptimerobot.com/

---

**🎉 Selamat! Aplikasi MERN Koperasi Anda sekarang sudah live di AWS EC2!**

**📅 Last Updated**: January 2025  
**👨‍💻 Version**: 4.0.0  
**🔧 Compatibility**: Ubuntu 22.04 LTS, Node.js 20.x, PM2, Nginx