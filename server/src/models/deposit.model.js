import mongoose from "mongoose";

const depositSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      unique: true,
      trim: true,
    },
    installmentPeriod: {
      type: Number,
      required: [true, "Periode cicilan wajib diisi"],
      min: [1, "Periode minimal 1 bulan"],
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "ID anggota wajib diisi"],
    },
    amount: {
      type: Number,
      required: [true, "Jumlah setoran wajib diisi"],
      min: [0, "Jumlah setoran tidak boleh negatif"],
    },
    depositDate: {
      type: Date,
      required: [true, "Tanggal setoran wajib diisi"],
    },
    proofFile: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Setoran", "Penarikan"],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual untuk mengakses data anggota
depositSchema.virtual("member", {
  ref: "User",
  localField: "memberId",
  foreignField: "_id",
  justOne: true,
});

// Index untuk query yang sering digunakan
depositSchema.index({ memberId: 1, createdAt: -1 });
depositSchema.index({ status: 1, createdAt: -1 });
// UUID index ditambahkan oleh unique constraint

// Pre-save hook untuk generate UUID
depositSchema.pre("save", async function (next) {
  // Generate UUID jika baru dan belum ada
  if (this.isNew && !this.uuid) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    this.uuid = `DEPOSIT_${timestamp}_${random}`.toUpperCase();
  }
  next();
});

const Deposit = mongoose.model("Deposit", depositSchema);

export { Deposit };
