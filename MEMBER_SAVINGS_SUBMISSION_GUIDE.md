# 🔐 Member Savings Submission - Security Implementation Guide

## 📋 Overview
Fitur baru yang memungkinkan member untuk submit simpanan sendiri dengan sistem keamanan berlapis dan validasi ketat.

## 🛡️ Security Features

### 1. **Magic Key Authentication**
- Member harus menggunakan encrypted payload untuk mendapatkan token
- Token berisi `memberUuid` yang divalidasi di setiap request

### 2. **Ownership Validation**
- Member hanya bisa submit simpanan untuk UUID mereka sendiri
- Middleware `requireMemberOwnership` memastikan keamanan

### 3. **Auto-Pending Status**
- Semua simpanan yang disubmit member otomatis berstatus "Pending"
- Memerlukan approval admin sebelum disetujui

## 🚀 API Endpoint

### **POST** `/api/members/savings/{uuid}`

**Headers:**
```
Authorization: Bearer {member_token}
Content-Type: multipart/form-data
```

**Body (Form Data):**
- `amount` (required): Jumlah simpanan (harus sesuai depositAmount produk)
- `description` (optional): Deskripsi simpanan
- `proofFile` (optional): File bukti transfer/setoran

**Response Success (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "saving": {
      "uuid": "SAVINGS_1756789123_ABC12",
      "installmentPeriod": 3,
      "amount": 100000,
      "savingsDate": "2024-01-15T10:30:00.000Z",
      "type": "Setoran",
      "status": "Pending",
      "description": "Simpanan periode 3",
      "proofFile": "proofFile-1756789123-123456789.jpg",
      "memberId": {
        "uuid": "JPSB37142",
        "name": "Puspita"
      },
      "productId": {
        "title": "Simpanan Harian",
        "depositAmount": 100000,
        "returnProfit": 12,
        "termDuration": 12
      }
    },
    "message": "Simpanan berhasil disubmit dan menunggu persetujuan admin"
  },
  "message": "Simpanan berhasil dibuat"
}
```

## 🔒 Security Validations

### 1. **Authentication Flow**
```
1. Generate encrypted payload: POST /api/member-auth/generate-payload
2. Get member token: POST /api/member-auth/token
3. Submit savings: POST /api/members/savings/{uuid}
```

### 2. **Business Logic Validations**
- ✅ Amount harus > 0
- ✅ Amount harus sama dengan `product.depositAmount`
- ✅ Member harus memiliki `productId` yang terdaftar
- ✅ Product harus aktif (`isActive: true`)
- ✅ Periode tidak boleh melebihi `product.termDuration`
- ✅ Tidak boleh ada simpanan pending untuk periode yang sama
- ✅ Auto-increment periode berdasarkan simpanan terakhir

### 3. **Data Security**
- ✅ Member hanya bisa submit untuk UUID sendiri
- ✅ UUID di parameter harus sama dengan `memberUuid` di token
- ✅ File upload dengan validasi dan naming yang aman
- ✅ Status selalu "Pending" untuk member submission

## 📝 Usage Example

### Step 1: Generate Encrypted Payload
```bash
POST {{base_url}}/api/member-auth/generate-payload
Content-Type: application/json

{
  "uuid": "JPSB37142"
}
```

### Step 2: Get Member Token
```bash
POST {{base_url}}/api/member-auth/token
x-koperasi-auth: {encrypted_payload}
Content-Type: application/json

{}
```

### Step 3: Submit Savings
```bash
POST {{base_url}}/api/members/savings/JPSB37142
Authorization: Bearer {member_token}
Content-Type: multipart/form-data

amount=100000
description=Simpanan bulanan periode ini
proofFile=@bukti_transfer.jpg
```

## ⚠️ Error Handling

### Common Errors:
- **400**: "Jumlah simpanan harus lebih dari 0"
- **400**: "Member belum memiliki produk yang terdaftar"
- **400**: "Produk tidak aktif atau tidak ditemukan"
- **400**: "Jumlah simpanan harus sesuai dengan produk: Rp 100.000"
- **400**: "Periode simpanan sudah mencapai maksimal (12 periode)"
- **400**: "Sudah ada simpanan pending untuk periode 3"
- **403**: "Akses ditolak, Anda hanya bisa mengakses data Anda sendiri"

## 🔄 Integration with Existing System

### Admin Workflow:
1. Member submit simpanan → Status "Pending"
2. Admin review di dashboard admin
3. Admin approve/reject melalui endpoint admin
4. Status berubah menjadi "Approved"/"Rejected"

### Member Benefits:
- ✅ Bisa submit simpanan kapan saja
- ✅ Upload bukti transfer langsung
- ✅ Auto-calculate periode berikutnya
- ✅ Validasi real-time sesuai produk
- ✅ Keamanan data terjamin

## 🎯 Postman Collection Update

Endpoint baru telah ditambahkan ke collection:
- **Section**: "2. Member API (Secure - Requires Member Token)"
- **Name**: "2.2 Member Submit Savings (Secure)"
- **Method**: POST
- **URL**: `{{base_url}}/api/members/savings/{{test_uuid_puspita}}`

## 🚀 Next Steps

1. Test endpoint dengan Postman collection yang sudah diupdate
2. Implement frontend form untuk member submission
3. Add notification system untuk status update
4. Consider adding email notification untuk admin approval

---

**Security Note**: Fitur ini menggunakan sistem keamanan berlapis dengan magic key authentication dan ownership validation untuk memastikan member hanya bisa submit simpanan untuk diri mereka sendiri.