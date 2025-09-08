# 🔐 GitHub Secrets Configuration Guide - LENGKAP BANGET!

## 📍 Cara Akses GitHub Secrets

### Step 1: Buka Repository GitHub Anda
1. Masuk ke repository GitHub project MERN Koperasi Anda
2. Klik tab **"Settings"** (di bagian atas, sebelah kanan)
3. Di sidebar kiri, cari **"Secrets and variables"** 
4. Klik **"Actions"**
5. Klik tombol **"New repository secret"**

---

## 📝 SEMUA SECRETS YANG HARUS DIBUAT (11 SECRETS)

### 🖥️ **SECRET 1: `EC2_HOST`**
**📍 Dapat dari**: AWS Console
**🎯 Isi dengan**: IP Address EC2 Anda
**📋 Contoh**: `54.179.123.45`

**🔍 Cara Mendapatkan:**
1. Login ke [AWS Console](https://aws.amazon.com/console/)
2. Pilih **EC2** service
3. Klik **"Instances"** di sidebar kiri
4. Pilih EC2 instance Anda
5. Di bagian bawah, lihat **"Public IPv4 address"**
6. Copy IP address tersebut (contoh: 54.179.123.45)

**💡 Jika pakai Elastic IP:**
1. EC2 Dashboard → **"Elastic IPs"**
2. Lihat IP yang sudah di-associate ke instance Anda

---

### 🖥️ **SECRET 2: `EC2_USER`**
**📍 Dapat dari**: Default Ubuntu
**🎯 Isi dengan**: `ubuntu`
**📋 Contoh**: `ubuntu`

**🔍 Penjelasan:**
- Ini adalah username default untuk server Ubuntu
- SELALU `ubuntu` untuk Ubuntu Server di AWS
- Jangan diganti, harus persis `ubuntu`

---

### 🔑 **SECRET 3: `SSH_PRIVATE_KEY`**
**📍 Dapat dari**: File .pem yang Anda download saat buat EC2
**🎯 Isi dengan**: Isi lengkap file .pem
**📋 Format**:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef...
(banyak baris kode)
...xyz987654321
-----END RSA PRIVATE KEY-----
```

**🔍 Cara Mendapatkan:**
1. **Saat buat EC2 instance**, Anda download file .pem (contoh: `my-key.pem`)
2. **Cari file tersebut** di komputer Anda (biasanya di folder Downloads)
3. **Buka dengan text editor** (Notepad++, VS Code, Sublime, atau Notepad biasa)
4. **Copy SEMUA isi file** (dari `-----BEGIN` sampai `-----END`)
5. **Paste ke GitHub Secret**

**⚠️ PENTING:**
- Harus include baris `-----BEGIN RSA PRIVATE KEY-----`
- Harus include baris `-----END RSA PRIVATE KEY-----`
- Semua baris di tengah juga harus di-copy
- Jangan ada spasi di awal atau akhir

---

### 🗄️ **SECRET 4: `MONGO_DB_URL`**
**📍 Dapat dari**: MongoDB Atlas atau Local MongoDB
**🎯 Isi dengan**: Connection string MongoDB
**📋 Contoh**: `mongodb+srv://admin:password123@cluster0.abc123.mongodb.net/koperasi?retryWrites=true&w=majority`

**🔍 Cara Mendapatkan (MongoDB Atlas - RECOMMENDED):**
1. **Buat account** di [MongoDB Atlas](https://cloud.mongodb.com/)
2. **Create new project** → beri nama "Koperasi"
3. **Build a database** → pilih **FREE** (M0 Sandbox)
4. **Pilih region** terdekat (Singapore/Jakarta)
5. **Create cluster** → tunggu 1-3 menit
6. **Database Access** → **Add New Database User**:
   - Username: `admin`
   - Password: buat password kuat (contoh: `MyPass123!`)
   - Database User Privileges: **Read and write to any database**
7. **Network Access** → **Add IP Address**:
   - Pilih **"Allow access from anywhere"** (0.0.0.0/0)
   - Atau masukkan IP EC2 Anda
8. **Database** → **Connect** → **Connect your application**
9. **Copy connection string** dan ganti `<password>` dengan password asli

**🔍 Cara Mendapatkan (Local MongoDB):**
```
mongodb://localhost:27017/koperasi
```

---

### 🔑 **SECRET 5: `JWT_SECRET`**
**📍 Dapat dari**: Buat sendiri (random string)
**🎯 Isi dengan**: String rahasia minimal 32 karakter
**📋 Contoh**: `my-super-secret-jwt-key-for-koperasi-app-2024-very-secure`

**🔍 Cara Membuat:**
1. **Ketik random** minimal 32 karakter
2. **Gunakan kombinasi** huruf, angka, simbol
3. **Contoh bagus**:
   - `koperasi-jwt-secret-2024-very-long-and-secure-key`
   - `MyKoperasiApp2024!SecretKey#VerySecure$`
   - `jwt_secret_koperasi_12345_abcdef_very_secure`

**🔍 Generate Online (Optional):**
1. Buka [Password Generator](https://passwordsgenerator.net/)
2. Set length: 50 characters
3. Include: Letters, Numbers, Symbols
4. Generate dan copy

---

### 🔧 **SECRET 6: `PORT`**
**📍 Dapat dari**: Default backend port
**🎯 Isi dengan**: `5000`
**📋 Contoh**: `5000`

**🔍 Penjelasan:**
- Ini port untuk backend Node.js
- Harus sama dengan yang di `server/src/conf/conf.js`
- Default: `5000`

---

### 🌐 **SECRET 7: `CORS_ORIGIN1`**
**📍 Dapat dari**: IP EC2 Anda
**🎯 Isi dengan**: `http://` + IP EC2
**📋 Contoh**: `http://54.179.123.45`

**🔍 Cara Membuat:**
1. **Ambil IP EC2** dari SECRET 1 (EC2_HOST)
2. **Tambahkan `http://`** di depan
3. **Contoh**: Jika IP = `54.179.123.45`, maka isi: `http://54.179.123.45`

---

### 🌐 **SECRET 8: `CORS_ORIGIN2`**
**📍 Dapat dari**: Domain Anda atau localhost
**🎯 Isi dengan**: Domain atau localhost:3000
**📋 Contoh**: `https://koperasi.mydomain.com` atau `http://localhost:3000`

**🔍 Pilihan:**
- **Jika punya domain**: `https://yourdomain.com`
- **Jika tidak punya domain**: `http://localhost:3000`
- **Untuk development**: `http://localhost:3000`

---

### 🌐 **SECRET 9: `CORS_ORIGIN3`**
**📍 Dapat dari**: Default Vite development
**🎯 Isi dengan**: `http://localhost:5173`
**📋 Contoh**: `http://localhost:5173`

**🔍 Penjelasan:**
- Ini untuk development React dengan Vite
- Selalu `http://localhost:5173`
- Jangan diganti

---

### 💳 **SECRET 10: `STRIPE_SECRET_KEY`**
**📍 Dapat dari**: Stripe Dashboard atau dummy
**🎯 Isi dengan**: Stripe secret key atau dummy
**📋 Contoh**: `sk_test_51234567890abcdef...` atau `dummy_stripe_key`

**🔍 Cara Mendapatkan (Jika pakai Stripe):**
1. **Buat account** di [Stripe](https://stripe.com/)
2. **Dashboard** → **Developers** → **API keys**
3. **Copy "Secret key"** (yang dimulai dengan `sk_test_` atau `sk_live_`)

**🔍 Jika TIDAK pakai Stripe:**
- Isi dengan: `dummy_stripe_key`

---

### 🌐 **SECRET 11: `NGINX_CONF`**
**📍 Dapat dari**: Copy paste konfigurasi di bawah
**🎯 Isi dengan**: Konfigurasi Nginx lengkap
**📋 Copy paste PERSIS ini**:

```nginx
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

**🔍 Cara Mengisi:**
1. **Copy PERSIS** konfigurasi di atas
2. **Paste ke GitHub Secret**
3. **JANGAN ubah** `__EC2_HOST__` dan `__PORT__` (ini akan diganti otomatis)

---

## 🎯 CONTOH LENGKAP DENGAN IP 54.179.123.45

Misalkan IP EC2 Anda adalah `54.179.123.45` dan MongoDB Atlas sudah setup:

| No | Secret Name | Value Yang Diisi |
|----|-------------|------------------|
| 1 | `EC2_HOST` | `54.179.123.45` |
| 2 | `EC2_USER` | `ubuntu` |
| 3 | `SSH_PRIVATE_KEY` | `-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...` |
| 4 | `MONGO_DB_URL` | `mongodb+srv://admin:MyPass123@cluster0.abc123.mongodb.net/koperasi?retryWrites=true&w=majority` |
| 5 | `JWT_SECRET` | `koperasi-jwt-secret-2024-very-long-and-secure-key` |
| 6 | `PORT` | `5000` |
| 7 | `CORS_ORIGIN1` | `http://54.179.123.45` |
| 8 | `CORS_ORIGIN2` | `http://localhost:3000` |
| 9 | `CORS_ORIGIN3` | `http://localhost:5173` |
| 10 | `STRIPE_SECRET_KEY` | `dummy_stripe_key` |
| 11 | `NGINX_CONF` | `server { listen 80; server_name __EC2_HOST__; ...` |

---

## 📋 **CHECKLIST SECRETS YANG HARUS ADA**

Pastikan Anda sudah membuat semua secrets ini di GitHub:

- [ ] `EC2_HOST` - IP address EC2 Anda
- [ ] `EC2_USER` - ubuntu (selalu ubuntu)
- [ ] `SSH_PRIVATE_KEY` - Isi lengkap file .pem
- [ ] `MONGO_DB_URL` - Connection string MongoDB Atlas
- [ ] `JWT_SECRET` - String rahasia minimal 32 karakter
- [ ] `PORT` - 5000 (port backend)
- [ ] `CORS_ORIGIN1` - http://IP-EC2-ANDA
- [ ] `CORS_ORIGIN2` - Domain atau http://localhost:3000
- [ ] `CORS_ORIGIN3` - http://localhost:5173 (Vite dev)
- [ ] `STRIPE_SECRET_KEY` - Stripe key atau dummy_stripe_key
- [ ] `NGINX_CONF` - Konfigurasi Nginx lengkap (copy paste dari atas)

---

## 🚀 **LANGKAH DEPLOYMENT SETELAH SETUP SECRETS**

### 1. **Pastikan Semua Secrets Sudah Dibuat**
- Cek di GitHub → Settings → Secrets and variables → Actions
- Harus ada 11 secrets seperti checklist di atas

### 2. **Push ke Branch Main atau Manual Trigger**
```bash
# Option 1: Push ke main
git add .
git commit -m "Setup deployment"
git push origin main

# Option 2: Manual trigger
# GitHub → Actions → Deploy MERN Koperasi to AWS EC2 → Run workflow
```

### 3. **Monitor Deployment**
- GitHub → Actions → Pilih workflow run terbaru
- Klik job "build-and-deploy"
- Lihat log untuk memastikan tidak ada error

### 4. **Test Aplikasi**
- Buka browser: `http://IP-EC2-ANDA`
- Harus bisa lihat aplikasi React
- Test API: `http://IP-EC2-ANDA/api/auth/login`

---

## 🚨 **TROUBLESHOOTING COMMON ERRORS**

### ❌ **Error: "Host key verification failed"**
**🔍 Penyebab**: SSH_PRIVATE_KEY salah atau tidak lengkap
**✅ Solusi**:
1. Buka file .pem dengan text editor
2. Copy SEMUA isi (dari -----BEGIN sampai -----END)
3. Pastikan tidak ada spasi di awal/akhir
4. Update GitHub Secret SSH_PRIVATE_KEY

### ❌ **Error: "Permission denied (publickey)"**
**🔍 Penyebab**: EC2_USER salah atau SSH key tidak match
**✅ Solusi**:
1. Pastikan EC2_USER = `ubuntu` (huruf kecil semua)
2. Pastikan SSH_PRIVATE_KEY adalah file .pem yang benar
3. Cek apakah file .pem match dengan EC2 instance

### ❌ **Error: "Connection refused"**
**🔍 Penyebab**: EC2_HOST salah atau EC2 tidak running
**✅ Solusi**:
1. Cek IP EC2 di AWS Console → EC2 → Instances
2. Pastikan instance dalam status "running"
3. Pastikan Security Group allow port 22 (SSH)

### ❌ **Error: "nginx: configuration file test failed"**
**🔍 Penyebab**: NGINX_CONF format salah
**✅ Solusi**:
1. Copy ulang konfigurasi nginx dari panduan ini
2. Pastikan tidak ada karakter aneh
3. Jangan ubah `__EC2_HOST__` dan `__PORT__`

### ❌ **Error: "MongoServerError: Authentication failed"**
**🔍 Penyebab**: MONGO_DB_URL salah atau password salah
**✅ Solusi**:
1. Cek connection string di MongoDB Atlas
2. Pastikan password benar (ganti `<password>` dengan password asli)
3. Pastikan IP EC2 sudah di-whitelist di MongoDB Atlas

### ❌ **Error: "npm ci failed"**
**🔍 Penyebab**: Dependencies error atau Node.js version
**✅ Solusi**:
1. Pastikan Node.js 20.x terinstall di EC2
2. Cek package.json tidak corrupt
3. Hapus node_modules dan package-lock.json, lalu npm install ulang

### ❌ **Error: "pm2 command not found"**
**🔍 Penyebab**: PM2 belum terinstall di EC2
**✅ Solusi**:
```bash
# SSH ke EC2 dan install PM2
sudo npm install -g pm2
pm2 startup
```

### ❌ **Error: "CORS policy blocked"**
**🔍 Penyebab**: CORS_ORIGIN tidak sesuai
**✅ Solusi**:
1. Pastikan CORS_ORIGIN1 = `http://IP-EC2-ANDA`
2. Jangan pakai https jika belum setup SSL
3. Pastikan tidak ada trailing slash (/)

---

## 🔧 **CARA CEK APAKAH DEPLOYMENT BERHASIL**

### 1. **Cek GitHub Actions Log**
```
GitHub → Actions → Pilih workflow run → build-and-deploy
Harus semua step hijau (✅)
```

### 2. **Cek Aplikasi di Browser**
```
Buka: http://IP-EC2-ANDA
Harus muncul halaman React aplikasi
```

### 3. **Cek API Backend**
```
Buka: http://IP-EC2-ANDA/api/auth/login
Harus muncul response JSON (bukan error 404)
```

### 4. **SSH ke EC2 dan Cek Services**
```bash
# SSH ke EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Cek PM2
pm2 status
# Harus ada "mern-koperasi-backend" dengan status "online"

# Cek Nginx
sudo systemctl status nginx
# Harus "active (running)"

# Cek aplikasi files
ls -la /home/ubuntu/app/
# Harus ada folder server dan client
```

---

## 💡 **TIPS SUKSES DEPLOYMENT**

### 1. **Persiapan Sebelum Deploy**
- [ ] EC2 instance sudah running
- [ ] Security Group sudah benar (port 22, 80, 443, 5000)
- [ ] MongoDB Atlas sudah setup dan connection string ready
- [ ] File .pem sudah ada dan bisa diakses

### 2. **Setup Secrets dengan Teliti**
- [ ] Copy paste dengan hati-hati (jangan ada spasi extra)
- [ ] Double check IP EC2 (pastikan yang terbaru)
- [ ] Test MongoDB connection string di local dulu
- [ ] JWT_SECRET minimal 32 karakter

### 3. **Monitor Deployment**
- [ ] Lihat GitHub Actions log sampai selesai
- [ ] Jangan close browser sampai deployment selesai
- [ ] Jika error, baca log dengan teliti untuk tahu masalahnya

### 4. **Testing Setelah Deploy**
- [ ] Test halaman utama: `http://IP-EC2/`
- [ ] Test API: `http://IP-EC2/api/auth/login`
- [ ] Test upload file jika ada
- [ ] Test semua fitur utama aplikasi

---

## 🎯 **CONTOH LENGKAP REAL CASE**

Misalkan Anda punya:
- **EC2 IP**: `54.179.123.45`
- **MongoDB Atlas**: cluster sudah setup dengan user `admin` password `MySecurePass123!`
- **File .pem**: `my-koperasi-key.pem`

Maka secrets Anda:

| No | Secret Name | Value Real |
|----|-------------|------------|
| 1 | `EC2_HOST` | `54.179.123.45` |
| 2 | `EC2_USER` | `ubuntu` |
| 3 | `SSH_PRIVATE_KEY` | `-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...` (isi file my-koperasi-key.pem) |
| 4 | `MONGO_DB_URL` | `mongodb+srv://admin:MySecurePass123!@cluster0.abc123.mongodb.net/koperasi?retryWrites=true&w=majority` |
| 5 | `JWT_SECRET` | `koperasi-jwt-secret-2024-very-long-and-secure-key-for-production` |
| 6 | `PORT` | `5000` |
| 7 | `CORS_ORIGIN1` | `http://54.179.123.45` |
| 8 | `CORS_ORIGIN2` | `http://localhost:3000` |
| 9 | `CORS_ORIGIN3` | `http://localhost:5173` |
| 10 | `STRIPE_SECRET_KEY` | `dummy_stripe_key` |
| 11 | `NGINX_CONF` | (Copy paste konfigurasi nginx dari atas) |

Setelah setup semua secrets → Push ke main → Tunggu deployment selesai → Akses `http://54.179.123.45`

---

**🎉 SELAMAT! Aplikasi MERN Koperasi Anda sudah live di AWS!**

**💡 Ingat**: Setiap kali push ke branch `main`, aplikasi akan otomatis re-deploy!

---

## ⚠️ **Tips Penting**

### 1. **Jangan Ada Spasi di Awal/Akhir**
- Pastikan tidak ada spasi sebelum atau sesudah value
- Contoh SALAH: ` 54.179.123.45 ` (ada spasi)
- Contoh BENAR: `54.179.123.45`

### 2. **Case Sensitive**
- Nama secret harus PERSIS sama dengan yang di workflow
- `EC2_HOST` ≠ `ec2_host` ≠ `Ec2_Host`

### 3. **SSH_PRIVATE_KEY Format**
- Harus include `-----BEGIN RSA PRIVATE KEY-----`
- Harus include `-----END RSA PRIVATE KEY-----`
- Semua baris di antaranya juga harus di-copy

### 4. **NGINX_CONF**
- Copy paste PERSIS konfigurasi yang saya berikan
- Jangan ubah `__EC2_HOST__` dan `__PORT__` (ini akan diganti otomatis)

---

## 🚨 **Troubleshooting Common Errors**

### Error: "Host key verification failed"
- **Penyebab**: SSH_PRIVATE_KEY salah atau tidak lengkap
- **Solusi**: Copy ulang isi file .pem dengan benar

### Error: "Permission denied (publickey)"
- **Penyebab**: EC2_USER salah atau SSH key tidak match
- **Solusi**: Pastikan EC2_USER = `ubuntu` dan SSH key benar

### Error: "Connection refused"
- **Penyebab**: EC2_HOST salah atau EC2 tidak running
- **Solusi**: Cek IP EC2 dan pastikan instance running

### Error: "nginx: configuration file test failed"
- **Penyebab**: NGINX_CONF format salah
- **Solusi**: Copy ulang konfigurasi nginx yang benar

---

## ✅ **Cara Test Secrets Sudah Benar**

1. **Push ke branch main** atau **manual trigger GitHub Actions**
2. **Lihat log di GitHub Actions**:
   - Repository → Actions → Pilih workflow run terbaru
   - Klik job "build-and-deploy"
   - Lihat log untuk error

3. **Jika berhasil**, aplikasi akan bisa diakses di `http://IP-EC2-ANDA`

---

**💡 Ingat**: Setelah setup secrets, GitHub Actions akan otomatis deploy setiap kali Anda push ke branch `main`!