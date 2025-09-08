# 📚 MERN Koperasi API Documentation

## 🔗 Base URL
```
Development: http://localhost:5000
Production: http://your-ec2-public-ip
```

## 🔐 Authentication
API menggunakan JWT Bearer Token untuk autentikasi admin dan sistem enkripsi khusus untuk member authentication.

### Headers yang Diperlukan:
- **Admin API**: `Authorization: Bearer <token>`
- **Member API**: `Authorization: Bearer <member_token>`
- **Member Auth**: `x-koperasi-auth: <encrypted_payload>`

---

## 📋 API Endpoints

### 🔑 1. Authentication (Admin)

#### 1.1 Login Admin
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "username": "admin",
      "role": "admin"
    }
  }
}
```

#### 1.2 Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "username": "admin",
    "role": "admin"
  }
}
```

---

### 🔐 2. Member Authentication (Secure)

#### 2.1 Generate Encrypted Payload
```http
POST /api/member-auth/generate-payload
```

**Request Body:**
```json
{
  "uuid": "JPSB37142"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "encryptedPayload": "encrypted_string_here"
  }
}
```

#### 2.2 Get Member Token
```http
POST /api/member-auth/token
x-koperasi-auth: <encrypted_payload>
```

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "member_jwt_token_here",
    "member": {
      "uuid": "JPSB37142",
      "name": "Member Name"
    }
  }
}
```

---

### 👥 3. Members Management

#### 3.1 Get All Members
```http
GET /api/members
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "member_id",
      "uuid": "JPSB37142",
      "name": "Member Name",
      "gender": "L",
      "phone": "081234567890",
      "city": "Jakarta",
      "completeAddress": "Jl. Contoh No. 123",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 3.2 Get Member by UUID
```http
GET /api/members/{uuid}
Authorization: Bearer <token>
```

#### 3.3 Create Member
```http
POST /api/members
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Doe",
  "gender": "L",
  "phone": "081234567890",
  "city": "Jakarta",
  "completeAddress": "Jl. Contoh No. 123",
  "username": "johndoe",
  "password": "password123",
  "uuid": "MEMBER_CUSTOM_123"
}
```

#### 3.4 Update Member
```http
PUT /api/members/{uuid}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "John Updated",
  "gender": "L",
  "phone": "081234567890",
  "city": "Jakarta",
  "completeAddress": "Jl. Updated No. 123"
}
```

#### 3.5 Delete Member
```http
DELETE /api/members/{uuid}
Authorization: Bearer <token>
```

#### 3.6 Member Dashboard (Secure)
```http
GET /api/members/dashboard/{uuid}
Authorization: Bearer <member_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "member": {
      "uuid": "JPSB37142",
      "name": "Member Name"
    },
    "savings": [
      {
        "id": "savings_id",
        "amount": 100000,
        "installmentPeriod": 1,
        "status": "Pending",
        "savingsDate": "2024-01-01"
      }
    ],
    "totalSavings": 100000
  }
}
```

#### 3.7 Member Submit Savings (Secure)
```http
POST /api/members/savings/{uuid}
Authorization: Bearer <member_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `amount`: 100000 (number)
- `description`: "Simpanan bulanan periode ini" (string, optional)
- `proofFile`: file (optional)

---

### 🏪 4. Products Management

#### 4.1 Get All Products
```http
GET /api/products
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "product_id",
      "title": "Simpanan Harian",
      "description": "Simpanan harian dengan bunga tinggi",
      "depositAmount": 100000,
      "returnProfit": 12,
      "termDuration": 12,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 4.2 Get Product by ID
```http
GET /api/products/{id}
Authorization: Bearer <token>
```

#### 4.3 Create Product
```http
POST /api/products
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Simpanan Harian",
  "description": "Simpanan harian dengan bunga tinggi",
  "depositAmount": 100000,
  "returnProfit": 12,
  "termDuration": 12
}
```

#### 4.4 Update Product
```http
PUT /api/products/{id}
Authorization: Bearer <token>
```

#### 4.5 Delete Product
```http
DELETE /api/products/{id}
Authorization: Bearer <token>
```

---

### 💰 5. Savings Management

#### 5.1 Get All Savings
```http
GET /api/savings
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "savings_id",
      "installmentPeriod": 1,
      "memberId": "member_id",
      "productId": "product_id",
      "amount": 1000000,
      "savingsDate": "2024-01-01",
      "type": "Setoran",
      "status": "Pending",
      "description": "Simpanan awal",
      "proofFile": "filename.pdf"
    }
  ]
}
```

#### 5.2 Get Savings by ID
```http
GET /api/savings/{id}
Authorization: Bearer <token>
```

#### 5.3 Create Savings
```http
POST /api/savings
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `installmentPeriod`: 1 (number)
- `memberId`: "member_id" (string)
- `productId`: "product_id" (string)
- `amount`: 1000000 (number)
- `savingsDate`: "2024-01-01" (date)
- `type`: "Setoran" (string)
- `description`: "Simpanan awal" (string)
- `proofFile`: file (optional)

#### 5.4 Update Savings
```http
PUT /api/savings/{id}
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `installmentPeriod`: 2 (number)
- `amount`: 2000000 (number)
- `status`: "Approved" (string)

#### 5.5 Delete Savings
```http
DELETE /api/savings/{id}
Authorization: Bearer <token>
```

#### 5.6 Get Savings by Member
```http
GET /api/savings/member/{memberId}
Authorization: Bearer <token>
```

#### 5.7 Get Savings Summary
```http
GET /api/savings/summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSavings": 5000000,
    "totalMembers": 25,
    "pendingSavings": 3,
    "approvedSavings": 22
  }
}
```

#### 5.8 Check Last Installment Period
```http
GET /api/savings/check-period/{memberId}/{productId}
Authorization: Bearer <token>
```

#### 5.9 Student Dashboard Savings by UUID
```http
GET /api/savings/student-dashboard/{uuid}
Authorization: Bearer <token>
```

---

### 📊 6. Dashboard

#### 6.1 Get Dashboard Stats
```http
GET /api/dashboard/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMembers": 25,
    "totalSavings": 5000000,
    "totalProducts": 5,
    "pendingApprovals": 3
  }
}
```

#### 6.2 Get Dashboard Charts
```http
GET /api/dashboard/charts
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "savingsChart": [
      {
        "month": "January",
        "amount": 1000000
      }
    ],
    "memberChart": [
      {
        "month": "January",
        "count": 5
      }
    ]
  }
}
```

---

### 👨‍💼 7. Admin Management

#### 7.1 Get All Users
```http
GET /api/admin/users
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_id",
      "username": "admin",
      "role": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 7.2 Update User Role
```http
PUT /api/admin/users/{userId}/role
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "role": "admin"
}
```

---

## 🔒 Security Features

### 1. Member Authentication
- **Magic Key System**: Menggunakan enkripsi payload untuk autentikasi member
- **UUID-based Access**: Member hanya bisa akses data mereka sendiri
- **Encrypted Headers**: Header `x-koperasi-auth` berisi payload terenkripsi

### 2. Admin Authentication
- **JWT Tokens**: Standard JWT untuk admin authentication
- **Role-based Access**: Pembatasan akses berdasarkan role user

### 3. File Upload Security
- **Multipart Form Data**: Upload file menggunakan multipart/form-data
- **File Type Validation**: Validasi tipe file yang diizinkan
- **Secure File Storage**: File disimpan di folder uploads dengan akses terbatas

---

## 📁 File Upload

### Supported File Types
- PDF (.pdf)
- Images (.jpg, .jpeg, .png)

### Upload Endpoints
- **Admin Savings**: `/api/savings` (POST/PUT)
- **Member Savings**: `/api/members/savings/{uuid}` (POST)

### File Access
```
GET /uploads/savings/{filename}
GET /api/uploads/savings/{filename}
```

---

## 🚨 Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error information"
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## 🔧 Environment Variables

### Required Environment Variables
```env
MONGO_DB_URL=mongodb://localhost:27017/koperasi
JWT_SECRET=your_jwt_secret_here
PORT=5000
CORS_ORIGIN1=http://localhost:5173
CORS_ORIGIN2=http://localhost:3000
CORS_ORIGIN3=http://your-domain.com
STRIPE_SECRET_KEY=your_stripe_key
NODE_ENV=production
```

---

## 📝 Notes

1. **Public API Disabled**: Semua endpoint public telah dinonaktifkan untuk keamanan
2. **CORS Configuration**: Mendukung multiple origins untuk development dan production
3. **File Upload**: Mendukung upload file bukti transfer/setoran
4. **Member Security**: Sistem keamanan berlapis untuk akses member
5. **Admin Dashboard**: Lengkap dengan statistik dan chart data

---

## 🧪 Testing dengan Postman

1. Import collection: `MERN-Koperasi-Postman-Collection.json`
2. Set environment variables:
   - `base_url`: http://localhost:5000
   - `token`: (akan diisi otomatis setelah login)
   - `member_token`: (akan diisi otomatis setelah member auth)
3. Jalankan request sesuai urutan untuk testing lengkap

---

**📅 Last Updated**: January 2025
**👨‍💻 Version**: 1.0.0