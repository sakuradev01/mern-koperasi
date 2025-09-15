import mongoose from "mongoose";

const creditPaymentSchema = new mongoose.Schema({
  uuid: {
    type: String,
    unique: true,
    trim: true,
  },
  memberUuid: {
    type: String,
    required: [true, "UUID anggota wajib diisi"],
    index: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    required: [true, "ID anggota wajib diisi"],
  },
  creditId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Credit",
    required: [true, "ID kredit wajib diisi"],
  },
  productName: {
    type: String,
    required: [true, "Nama produk kredit wajib diisi"],
    trim: true,
  },
  installmentPeriod: {
    type: Number,
    required: [true, "Periode cicilan wajib diisi"],
    min: [1, "Periode minimal 1 bulan"],
  },
  amount: {
    type: Number,
    required: [true, "Jumlah pembayaran wajib diisi"],
    min: [0, "Jumlah pembayaran tidak boleh negatif"],
  },
  paymentDate: {
    type: Date,
    required: [true, "Tanggal pembayaran wajib diisi"],
  },
  proofFile: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ["Setoran"],
    default: "Setoran",
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, "Deskripsi maksimal 500 karakter"],
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual untuk mengakses data anggota
creditPaymentSchema.virtual("member", {
  ref: "Member",
  localField: "memberId",
  foreignField: "_id",
  justOne: true,
});

// Virtual untuk mengakses data kredit
creditPaymentSchema.virtual("credit", {
  ref: "Credit",
  localField: "creditId",
  foreignField: "_id",
  justOne: true,
});

// Index untuk query yang sering digunakan
creditPaymentSchema.index({ memberId: 1, createdAt: -1 });
creditPaymentSchema.index({ creditId: 1, installmentPeriod: 1 });
creditPaymentSchema.index({ status: 1, createdAt: -1 });
creditPaymentSchema.index({ memberUuid: 1, createdAt: -1 });

// Pre-save hook untuk generate UUID
creditPaymentSchema.pre("save", async function (next) {
  // Generate UUID jika baru dan belum ada
  if (this.isNew && !this.uuid) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    this.uuid = `CREDIT_PAY_${timestamp}_${random}`.toUpperCase();
  }
  next();
});

const CreditPayment = mongoose.model("CreditPayment", creditPaymentSchema);

export { CreditPayment };