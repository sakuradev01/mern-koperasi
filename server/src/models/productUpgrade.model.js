import mongoose from "mongoose";

const productUpgradeSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member ID wajib diisi"],
    },
    oldProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Old Product ID wajib diisi"],
    },
    newProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", 
      required: [true, "New Product ID wajib diisi"],
    },
    upgradeDate: {
      type: Date,
      required: [true, "Upgrade date wajib diisi"],
      default: Date.now,
    },
    periodWhenUpgraded: {
      type: Number,
      required: [true, "Period when upgraded wajib diisi"],
      min: [1, "Period minimal 1"],
    },
    remainingPeriods: {
      type: Number,
      required: [true, "Remaining periods wajib diisi"],
      min: [1, "Remaining periods minimal 1"],
    },
    compensationPerMonth: {
      type: Number,
      required: [true, "Compensation per month wajib diisi"],
      min: [0, "Compensation tidak boleh negatif"],
    },
    newMonthlyAmount: {
      type: Number,
      required: [true, "New monthly amount wajib diisi"],
      min: [0, "New monthly amount tidak boleh negatif"],
    },
    totalCompensation: {
      type: Number,
      required: [true, "Total compensation wajib diisi"],
      min: [0, "Total compensation tidak boleh negatif"],
    },
    calculationFormula: {
      type: String,
      required: [true, "Calculation formula wajib diisi"],
    },
    status: {
      type: String,
      enum: ["Active", "Completed", "Cancelled"],
      default: "Active",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes maksimal 500 karakter"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual untuk mengakses data member
productUpgradeSchema.virtual("member", {
  ref: "Member",
  localField: "memberId",
  foreignField: "_id",
  justOne: true,
});

// Virtual untuk mengakses data old product
productUpgradeSchema.virtual("oldProduct", {
  ref: "Product",
  localField: "oldProductId",
  foreignField: "_id",
  justOne: true,
});

// Virtual untuk mengakses data new product
productUpgradeSchema.virtual("newProduct", {
  ref: "Product",
  localField: "newProductId",
  foreignField: "_id",
  justOne: true,
});

// Index untuk query yang sering digunakan
productUpgradeSchema.index({ memberId: 1, upgradeDate: -1 });
productUpgradeSchema.index({ status: 1, upgradeDate: -1 });

const ProductUpgrade = mongoose.model("ProductUpgrade", productUpgradeSchema);

export { ProductUpgrade };