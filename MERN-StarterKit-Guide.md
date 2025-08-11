# MERN Stack StarterKit Guide

Ini adalah panduan lengkap untuk MERN Stack StarterKit dengan konfigurasi environment dan deployment ke AWS EC2.

## 📁 Struktur Proyek

```
mern-koperasi/
├── client/                 # Frontend (React + Vite)
├── server/                 # Backend (Node.js + Express)
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions untuk deployment
├── .env.sample            # Template environment variables
├── package.json           # Root dependencies
└── README.md              # Dokumentasi proyek
```

## 🚀 Setup Proyek Lokal

### 1. Clone & Install Dependencies

```bash
# Clone repository
git clone <repository-url>
cd mern-koperasi

# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Environment Variables

Buat file `.env` di root proyek, folder `client`, dan folder `server`:

**Root .env (untuk Vite):**

```env
# Frontend Configuration
VITE_SERVER_URL=http://localhost:5000
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=MERN Koperasi
VITE_APP_VERSION=1.0.0
```

**Client .env (untuk Vite development):**

```env
# Development API URLs
VITE_API_URL=http://localhost:5000/api
VITE_SERVER_URL=http://localhost:5000

# App Configuration
VITE_APP_NAME=MERN Koperasi
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Koperasi Digital

# Development Settings
VITE_DEV=true
VITE_MOCK_API=false
```

**Server .env:**

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database Configuration
MONGO_DB_URL=mongodb://localhost:27017/mern_koperasi
MONGO_TEST_URL=mongodb://localhost:27017/mern_koperasi_test

# CORS Configuration
CORS_ORIGIN1=http://localhost:3000
CORS_ORIGIN2=http://localhost:5000
CORS_ORIGIN3=http://localhost:5173
CORS_ORIGIN4=http://localhost:8080

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-123456789
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Security Configuration
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Payment Configuration (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# External APIs (Optional)
EXTERNAL_API_KEY=your-external-api-key
EXTERNAL_API_URL=https://api.external-service.com

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Cache Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600

# Database Additional Settings
DB_POOL_SIZE=5
DB_CONNECTION_TIMEOUT=30000
DB_SSL=false
```

### 3. Jalankan Aplikasi

```bash
# Jalankan backend (di terminal pertama)
cd server
npm run dev

# Jalankan frontend (di terminal kedua)
cd client
npm run dev
```

Akses aplikasi di:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## 🌐 Deployment ke AWS EC2

### 1. AWS EC2 Setup

1. Buat EC2 instance (Ubuntu 22.04 LTS)
2. Install Node.js, PM2, Nginx, Git:

```bash
sudo apt update
sudo apt install -y nginx git nodejs npm
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pm2
```

3. Buat user aplikasi:

```bash
sudo useradd -m -s /bin/bash appuser
sudo usermod -aG sudo appuser
```

### 2. GitHub Secrets

Setup secrets di GitHub repository (Settings > Secrets and variables > Actions):

**Required Secrets:**

```
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=ap-southeast-1
EC2_HOST=your-ec2-public-ip-or-domain
EC2_USER=appuser
SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
your-ssh-private-key-content-here
-----END OPENSSH PRIVATE KEY-----
MONGO_DB_URL=mongodb+srv://username:password@cluster.mongodb.net/mern_koperasi
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-for-production-minimum-32-characters
NGINX_CONF=server {
    listen 80;
    server_name __EC2_HOST__;

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
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|txt|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        root /var/www/html;
    }

    # Main routes
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API routes
    location /api {
        proxy_pass http://localhost:__PORT__;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

**Optional Secrets:**

```
CORS_ORIGIN2=http://your-ec2-host:3000
CORS_ORIGIN3=http://your-ec2-host:5173
```

**Deployment Workflow Secrets:**

```
# Server Configuration
NODE_ENV=production
PORT=5000

# CORS Configuration
CORS_ORIGIN1=http://your-ec2-host
CORS_ORIGIN2=http://your-ec2-host:3000
CORS_ORIGIN3=http://your-ec2-host:5173

# Security Configuration
JWT_SECRET=your-super-secret-jwt-key-for-production-minimum-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Database Configuration
MONGO_DB_URL=mongodb+srv://username:password@cluster.mongodb.net/mern_koperasi

# File Upload Configuration
MAX_FILE_SIZE=20971520
UPLOAD_PATH=/home/appuser/uploads

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-app-email@gmail.com
SMTP_PASS=your-app-specific-password

# Payment Configuration (Optional)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# External APIs (Optional)
EXTERNAL_API_KEY=your-external-api-key
EXTERNAL_API_URL=https://api.external-service.com/v1

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Cache Configuration
REDIS_URL=redis://your-redis-host:6379
CACHE_TTL=3600

# Database Additional Settings
DB_POOL_SIZE=5
DB_CONNECTION_TIMEOUT=30000
DB_SSL=false
```

### 3. Nginx Configuration

Isi secret `NGINX_CONF` dengan:

```nginx
server {
    listen 80;
    server_name __EC2_HOST__;

    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:__PORT__;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. GitHub Actions Workflow

**File: `.github/workflows/deploy.yml`**

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

## 🔧 Konfigurasi Penting

### 1. CORS Configuration

Pastikan di server/backend, CORS diatur dengan benar:

```javascript
// server/src/app.js
const cors = require("cors");
const corsOptions = {
  origin: [
    process.env.CORS_ORIGIN1,
    process.env.CORS_ORIGIN2,
    process.env.CORS_ORIGIN3,
  ],
  credentials: true,
};
app.use(cors(corsOptions));
```

### 2. API Routes

Frontend menggunakan API routes dengan format:

- Base URL: `VITE_API_URL` dari .env
- Contoh: `http://localhost:5000/api/members`

### 3. Authentication

- JWT token disimpan di localStorage
- Redux state untuk auth status
- Protected routes menggunakan PrivateRoute component

## 📦 Dependencies

### Root Dependencies

```json
{
  "name": "mern-koperasi",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
    "server:dev": "cd server && npm run dev",
    "client:dev": "cd client && npm run dev",
    "install:all": "npm install && cd client && npm install && cd ../server && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

### Client Dependencies (React + Vite)

```json
{
  "name": "client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.1",
    "react-redux": "^8.1.2",
    "redux-persist": "^6.0.0",
    "@reduxjs/toolkit": "^1.9.5",
    "axios": "^1.4.0",
    "react-icons": "^4.10.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5",
    "tailwindcss": "^3.3.3",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.27"
  }
}
```

### Server Dependencies (Node.js + Express)

```json
{
  "name": "server",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.4.0",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.1",
    "multer": "^1.4.5-lts.1",
    "express-validator": "^7.0.1",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.8.1",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.5.0"
  }
}
```

## 🚀 Deployment Checklist

1. [ ] Setup EC2 instance dengan Ubuntu 22.04
2. [ ] Install Node.js, PM2, Nginx, Git
3. [ ] Buat GitHub repository
4. [ ] Setup GitHub Secrets
5. [ ] Push code ke GitHub
6. [ ] Jalankan GitHub Actions workflow
7. [ ] Test aplikasi di browser
8. [ ] Setup domain (opsional)

## 🔐 Security Tips

1. Gunakan JWT secret yang kuat dan unik
2. Aktifkan HTTPS di production
3. Set rate limiting untuk API
4. Validasi semua input user
5. Gun helmet untuk security headers
6. Backup database secara berkala

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Note:** Ini adalah template starter kit. Sesuaikan dengan kebutuhan proyek Anda.
