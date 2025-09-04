# AWS Deployment Guide v3 - MERN Koperasi
## Complete Setup for Auto-Deploy to AWS EC2

> **Panduan lengkap untuk deploy MERN Koperasi ke AWS EC2 dengan GitHub Actions auto-deployment**

---

## 📋 Table of Contents
1. [Project Structure Overview](#project-structure)
2. [AWS EC2 Setup](#aws-ec2-setup)
3. [GitHub Repository Setup](#github-repository-setup)
4. [GitHub Secrets Configuration](#github-secrets-configuration)
5. [Environment Files](#environment-files)
6. [Deployment Workflow](#deployment-workflow)
7. [Troubleshooting](#troubleshooting)
8. [Quick Clone & Deploy](#quick-clone--deploy)

---

## 🏗️ Project Structure

```
mern-koperasi/
├── .github/
│   └── workflows/
│       └── deploy.yml                 # Auto-deployment workflow
├── client/                            # React Frontend
│   ├── src/
│   │   ├── conf/
│   │   │   └── conf.js               # Frontend config
│   │   └── ...
│   ├── .env.sample                   # Frontend env template
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json                   # Vercel config (optional)
├── server/                           # Node.js Backend
│   ├── src/
│   │   ├── conf/
│   │   │   └── conf.js              # Backend config
│   │   ├── db/
│   │   │   └── index.js             # MongoDB connection
│   │   └── ...
│   ├── index.js                     # Server entry point
│   ├── package.json
│   └── vercel.json                  # Vercel config (optional)
├── package.json                     # Root package.json
└── README.md
```

---

## 🚀 AWS EC2 Setup

### 1. Launch EC2 Instance

1. **Launch Ubuntu 22.04 LTS** instance
2. **Instance Type**: t2.micro (free tier) or t3.small (recommended)
3. **Security Group**: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
4. **Key Pair**: Create and download `.pem` file

### 2. Connect to EC2 Instance

```bash
# Connect via SSH
ssh -i "your-key.pem" ubuntu@your-ec2-public-ip

# Update system
sudo apt update && sudo apt upgrade -y
```

### 3. Install Required Software

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install Git
sudo apt install git -y

# Verify installations
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
pm2 --version     # Should show PM2 version
nginx -v          # Should show nginx version
```

### 4. Configure Nginx

```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/default
```

**Nginx Configuration Template:**
```nginx
server {
    listen 80;
    server_name __EC2_HOST__;

    # Frontend (React build files)
    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:__PORT__;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Handle file uploads
    client_max_body_size 10M;
}
```

```bash
# Test nginx configuration
sudo nginx -t

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## 📁 GitHub Repository Setup

### 1. Create New Repository

```bash
# Clone this project to new repository
git clone https://github.com/your-username/mern-koperasi.git new-project-name
cd new-project-name

# Remove old git history
rm -rf .git

# Initialize new git repository
git init
git add .
git commit -m "Initial commit"

# Add your new remote repository
git remote add origin https://github.com/your-username/new-project-name.git
git branch -M main
git push -u origin main
```

### 2. Verify GitHub Actions Workflow

Ensure `.github/workflows/deploy.yml` exists with this content:

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

---

## 🔐 GitHub Secrets Configuration

Go to your GitHub repository → Settings → Secrets and variables → Actions

### Required Secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `EC2_HOST` | Your EC2 public IP or domain | `54.123.456.789` |
| `EC2_USER` | EC2 username | `ubuntu` |
| `SSH_PRIVATE_KEY` | Your EC2 private key content | `-----BEGIN RSA PRIVATE KEY-----...` |
| `MONGO_DB_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/koperasi` |
| `PORT` | Backend server port | `5000` |
| `CORS_ORIGIN1` | Primary CORS origin | `http://54.123.456.789` |
| `CORS_ORIGIN2` | Secondary CORS origin | `http://localhost:3000` |
| `CORS_ORIGIN3` | Tertiary CORS origin | `http://localhost:5173` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-jwt-key-here` |
| `STRIPE_SECRET_KEY` | Stripe secret key (optional) | `sk_test_...` |
| `NGINX_CONF` | Nginx configuration | See below |

### NGINX_CONF Secret Value:

```nginx
server {
    listen 80;
    server_name __EC2_HOST__;

    # Frontend (React build files)
    location / {
        root /var/www/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:__PORT__;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Handle file uploads
    client_max_body_size 10M;
}
```

### How to Get SSH_PRIVATE_KEY:

```bash
# On your local machine, display your private key
cat your-ec2-key.pem

# Copy the entire output including:
# -----BEGIN RSA PRIVATE KEY-----
# ... key content ...
# -----END RSA PRIVATE KEY-----
```

---

## 📄 Environment Files

### Backend Environment (server/.env)
```env
MONGO_DB_URL=mongodb+srv://username:password@cluster.mongodb.net/koperasi
PORT=5000
CORS_ORIGIN1=http://your-ec2-ip
CORS_ORIGIN2=http://localhost:3000
CORS_ORIGIN3=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key-here
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
NODE_ENV=production
```

### Frontend Environment (client/.env)
```env
VITE_SERVER_URL=http://your-ec2-ip
VITE_API_URL=http://your-ec2-ip
```

---

## 🚀 Deployment Workflow

### Automatic Deployment

1. **Push to main branch** triggers auto-deployment
2. **Manual deployment** via GitHub Actions tab → "Run workflow"

### Manual Deployment Steps

If you need to deploy manually:

```bash
# SSH to your EC2 instance
ssh -i "your-key.pem" ubuntu@your-ec2-ip

# Stop existing services
pm2 stop mern-koperasi-backend || true
pm2 delete mern-koperasi-backend || true

# Clean and clone
sudo rm -rf /home/ubuntu/app
mkdir -p /home/ubuntu/app
git clone https://github.com/your-username/your-repo.git /home/ubuntu/app

# Backend setup
cd /home/ubuntu/app/server
# Create .env file with your values
npm ci --production

# Frontend setup
cd /home/ubuntu/app/client
# Create .env file with your values
npm ci
npm run build

# Copy to nginx
sudo rm -rf /var/www/html/*
sudo cp -r dist/. /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

# Start services
cd /home/ubuntu/app/server
pm2 start index.js --name "mern-koperasi-backend"
pm2 save

# Restart nginx
sudo systemctl restart nginx
```

---

## 🔧 Project Configuration Files

### Root package.json
```json
{
  "name": "mern-koperasi",
  "version": "1.0.0",
  "description": "Sistem Koperasi MERN Stack",
  "main": "index.js",
  "scripts": {
    "dev": "concurrently \"cd server && npm run dev\" \"cd client && npm run dev\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "seed": "cd server && npm run seed",
    "install:all": "npm install && cd server && npm install && cd ../client && npm install"
  },
  "keywords": ["mern", "koperasi", "nodejs", "react", "mongodb"],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### Server package.json
```json
{
  "name": "server",
  "version": "1.0.0",
  "description": "",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "dev": "nodemon index.js",
    "seed": "node src/db/seeder.js",
    "start": "node index.js"
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "body-parser": "^1.20.3",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "joi": "^18.0.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.9.2",
    "multer": "^2.0.2",
    "nodemon": "^3.1.9"
  }
}
```

### Client package.json
```json
{
  "name": "client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@reduxjs/toolkit": "^2.5.0",
    "axios": "^1.7.9",
    "chart.js": "^4.5.0",
    "date-fns": "^4.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.53.2",
    "react-redux": "^9.2.0",
    "react-router-dom": "^7.0.2",
    "react-toastify": "^11.0.5",
    "redux-persist": "^6.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "vite": "^6.0.3"
  }
}
```

---

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### 1. **Deployment Fails**
```bash
# Check GitHub Actions logs
# Go to GitHub → Actions tab → Click on failed workflow

# Check EC2 logs
ssh -i "your-key.pem" ubuntu@your-ec2-ip
pm2 logs mern-koperasi-backend
sudo journalctl -u nginx -f
```

#### 2. **Backend Not Starting**
```bash
# Check PM2 status
pm2 status

# Check backend logs
pm2 logs mern-koperasi-backend

# Restart backend
pm2 restart mern-koperasi-backend
```

#### 3. **Frontend Not Loading**
```bash
# Check nginx status
sudo systemctl status nginx

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

#### 4. **Database Connection Issues**
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check `MONGO_DB_URL` in GitHub secrets
- Ensure database user has read/write permissions

#### 5. **CORS Issues**
- Verify `CORS_ORIGIN1` matches your EC2 public IP
- Check if EC2 IP changed (restart may change IP)
- Update GitHub secrets if IP changed

---

## ⚡ Quick Clone & Deploy

### For New Project Setup:

```bash
# 1. Clone this repository
git clone https://github.com/original-repo/mern-koperasi.git new-project-name
cd new-project-name

# 2. Remove old git history and create new repo
rm -rf .git
git init
git add .
git commit -m "Initial commit"

# 3. Create new GitHub repository and push
git remote add origin https://github.com/your-username/new-project-name.git
git branch -M main
git push -u origin main

# 4. Set up AWS EC2 instance (follow AWS EC2 Setup section)

# 5. Configure GitHub Secrets (follow GitHub Secrets section)

# 6. Push to main branch to trigger auto-deployment
git push origin main
```

### Local Development:

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev

# Or start individually
npm run dev:server  # Backend only
npm run dev:client  # Frontend only

# Seed database (if needed)
npm run seed
```

---

## 📝 Notes

- **EC2 IP Changes**: If you stop/start EC2, the public IP may change. Update GitHub secrets accordingly.
- **SSL/HTTPS**: For production, consider setting up SSL with Let's Encrypt.
- **Domain**: You can use a custom domain instead of IP address.
- **Monitoring**: Set up CloudWatch or other monitoring for production.
- **Backup**: Regular database backups are recommended.

---

## 🎯 Success Checklist

- [ ] EC2 instance running with required software
- [ ] GitHub repository created with workflow file
- [ ] All GitHub secrets configured
- [ ] MongoDB Atlas database accessible
- [ ] First deployment successful
- [ ] Frontend accessible via EC2 IP
- [ ] Backend API responding
- [ ] Auto-deployment working on push to main

---

**🎉 Your MERN Koperasi application should now be live and auto-deploying!**

Access your application at: `http://your-ec2-public-ip`