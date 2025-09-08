# 🚀 Implementasi Fitur Upgrade Produk Simpanan

## 📋 Overview
Fitur upgrade produk simpanan memungkinkan member untuk beralih ke produk dengan setoran yang lebih tinggi dengan perhitungan kompensasi untuk bulan-bulan yang sudah berlalu.

## 🧮 Rumus Perhitungan Kompensasi

```
Kompensasi per Bulan = (Setoran_Baru - Setoran_Lama) × Bulan_Sudah_Nabung / Sisa_Bulan
Setoran_Baru_per_Bulan = Setoran_Baru + Kompensasi_per_Bulan
```

### Contoh Perhitungan:
- **Setoran Lama**: Rp 2.500.000
- **Setoran Baru**: Rp 3.500.000  
- **Sudah Nabung**: 24 bulan
- **Durasi Total**: 36 bulan
- **Sisa Periode**: 12 bulan

**Perhitungan:**
```
Kompensasi = (3.500.000 - 2.500.000) × 24 / 12 = Rp 2.000.000
Setoran Baru = 3.500.000 + 2.000.000 = Rp 5.500.000 per bulan
```

## 🏗️ Struktur Implementasi

### Backend Components

#### 1. Controller (`server/src/controllers/productUpgrade.controller.js`)
- `calculateUpgradeCompensation()` - Menghitung kompensasi upgrade
- `executeProductUpgrade()` - Melakukan upgrade produk
- `getUpgradeHistory()` - Mengambil riwayat upgrade

#### 2. Routes (`server/src/routes/productUpgrade.routes.js`)
- `POST /api/product-upgrade/calculate/:memberUuid` - Hitung kompensasi
- `POST /api/product-upgrade/execute/:memberUuid` - Eksekusi upgrade
- `GET /api/product-upgrade/history/:memberUuid` - Riwayat upgrade

### Frontend Components

#### 1. ProductUpgradeCard (`client/src/components/ProductUpgradeCard.jsx`)
- Komponen utama untuk menampilkan opsi upgrade
- Modal untuk perhitungan dan konfirmasi upgrade
- Badge kompensasi yang menampilkan sisa penggantian

#### 2. Integration di MemberDetail (`client/src/pages/MemberDetail.jsx`)
- Terintegrasi setelah Profile Card
- Auto-refresh data setelah upgrade berhasil

## 🔧 API Endpoints

### Calculate Upgrade Compensation
```http
POST /api/product-upgrade/calculate/:memberUuid
Content-Type: application/json

{
  "newProductId": "product_id_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "memberInfo": {
      "uuid": "MEMBER_123",
      "name": "John Doe"
    },
    "currentProduct": {
      "title": "Paket Silver",
      "depositAmount": 2500000,
      "termDuration": 36
    },
    "newProduct": {
      "title": "Paket Gold", 
      "depositAmount": 3500000,
      "termDuration": 36
    },
    "savingsProgress": {
      "bulanSudahNabung": 24,
      "sisaBulan": 12,
      "totalSudahDibayar": 60000000
    },
    "compensation": {
      "selisihSetoran": 1000000,
      "kompensasiPerBulan": 2000000,
      "setoranBaruPerBulan": 5500000,
      "totalKompensasi": 24000000,
      "formula": "(3500000 - 2500000) x 24 / 12 = 2000000"
    },
    "upgradeViability": {
      "canUpgrade": true,
      "reason": "Upgrade dapat dilakukan"
    }
  }
}
```

### Execute Product Upgrade
```http
POST /api/product-upgrade/execute/:memberUuid
Content-Type: application/json

{
  "newProductId": "product_id_here",
  "confirmUpgrade": true
}
```

## 🎨 UI Components

### 1. Upgrade Card
- Ditampilkan di halaman detail member
- Tombol "Lihat Opsi Upgrade" untuk membuka modal
- Badge kompensasi jika ada perhitungan aktif

### 2. Upgrade Modal
- Dropdown pilihan produk upgrade
- Tombol "Hitung Kompensasi Upgrade"
- Detail perhitungan kompensasi
- Tombol "Konfirmasi Upgrade"

### 3. Badge Sisa Penggantian
```jsx
<div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
  <h4 className="font-semibold text-yellow-800 mb-2">
    💰 Sisa Penggantian Paket
  </h4>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    <div>
      <p><strong>Kompensasi per bulan:</strong> Rp 2.000.000</p>
      <p><strong>Setoran baru per bulan:</strong> Rp 5.500.000</p>
    </div>
    <div>
      <p><strong>Sisa periode:</strong> 12 bulan</p>
      <p><strong>Total kompensasi:</strong> Rp 24.000.000</p>
    </div>
  </div>
  <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
    <strong>Rumus:</strong> (3500000 - 2500000) x 24 / 12 = 2000000
  </div>
</div>
```

## 🔒 Security & Validation

### Backend Validation
- Memastikan member exists
- Validasi produk baru exists
- Cek apakah ada savings yang sudah approved
- Validasi upgrade hanya ke produk dengan setoran lebih tinggi
- Memastikan masih ada sisa periode

### Frontend Validation
- Filter produk hanya yang depositAmount lebih tinggi
- Konfirmasi sebelum eksekusi upgrade
- Error handling untuk API calls

## 🧪 Testing

Fitur telah ditest dengan skenario:

### Test Case 1: ✅ PASS
- **Input**: 2.5jt → 3.5jt setelah 24 bulan (sisa 12 bulan)
- **Expected**: Kompensasi Rp 2.000.000, Setoran baru Rp 5.500.000
- **Actual**: ✅ Sesuai expected

### Test Case 2: ✅ PASS  
- **Input**: 1jt → 2jt setelah 12 bulan (sisa 12 bulan)
- **Expected**: Kompensasi Rp 1.000.000, Setoran baru Rp 3.000.000
- **Actual**: ✅ Sesuai expected

## 🚀 Cara Penggunaan

1. **Admin/Staff** masuk ke halaman detail member
2. Klik tombol **"Lihat Opsi Upgrade"** pada card upgrade
3. Pilih produk baru dari dropdown
4. Klik **"Hitung Kompensasi Upgrade"**
5. Review detail perhitungan kompensasi
6. Klik **"Konfirmasi Upgrade"** untuk melakukan upgrade
7. Badge kompensasi akan muncul menunjukkan sisa penggantian

## 📝 Notes

- Upgrade hanya bisa dilakukan ke produk dengan setoran lebih tinggi
- Kompensasi dihitung berdasarkan bulan yang sudah berlalu
- Setelah upgrade, member wajib membayar setoran baru + kompensasi untuk periode sisanya
- Data upgrade tersimpan dalam perubahan productId di member record

## 🔄 Future Enhancements

1. **Upgrade History Model** - Model terpisah untuk tracking riwayat upgrade
2. **Notification System** - Notifikasi ke member tentang perubahan setoran
3. **Approval Workflow** - Sistem approval untuk upgrade produk
4. **Downgrade Feature** - Fitur untuk downgrade produk (dengan logika berbeda)
5. **Bulk Upgrade** - Upgrade multiple members sekaligus