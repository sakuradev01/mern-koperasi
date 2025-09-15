import mongoose from "mongoose";

const creditSchema = new mongoose.Schema({
  memberUuid: {
    type: String,
    required: true,
    index: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Member",
    required: true
  },
  productName: {
    type: String,
    required: true,
    trim: true
  },
  principalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  interestRate: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  tenor: {
    type: Number,
    required: true,
    min: 1,
    default: 12
  },
  monthlyInstallment: {
    type: Number,
    required: true,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  productLink: {
    type: String,
    trim: true,
    default: ""
  },
  status: {
    type: String,
    enum: ["Active", "Completed", "Overdue", "Cancelled"],
    default: "Active"
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    trim: true,
    default: ""
  },
  installments: [{
    period: {
      type: Number,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    paidDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Overdue", "Partial"],
      default: "Pending"
    },
    proofFile: {
      type: String,
      default: ""
    },
    notes: {
      type: String,
      default: ""
    }
  }]
}, {
  timestamps: true
});

// Index untuk query yang sering digunakan
creditSchema.index({ memberUuid: 1, status: 1 });
creditSchema.index({ "installments.dueDate": 1 });

// Virtual untuk menghitung total yang sudah dibayar dari credit-payments
creditSchema.virtual("totalPaid").get(function() {
  // This will be populated by the controller
  return this._totalPaid || 0;
});

// Virtual untuk menghitung sisa yang belum dibayar
creditSchema.virtual("remainingAmount").get(function() {
  return this.totalAmount - this.totalPaid;
});

// Virtual untuk menghitung progress pembayaran
creditSchema.virtual("paymentProgress").get(function() {
  if (this.totalAmount === 0) return 0;
  return Math.round((this.totalPaid / this.totalAmount) * 100);
});

// Static method untuk menghitung total paid dari credit-payments
creditSchema.statics.calculateTotalPaid = async function(creditId) {
  try {
    const { CreditPayment } = await import("./creditPayment.model.js");
    const result = await CreditPayment.aggregate([
      { $match: { creditId: creditId, status: "Approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    return result[0]?.total || 0;
  } catch (error) {
    console.error("Error calculating total paid:", error);
    return 0;
  }
};

// Static method untuk mendapatkan payment details
creditSchema.statics.getPaymentDetails = async function(creditId) {
  try {
    const { CreditPayment } = await import("./creditPayment.model.js");
    const payments = await CreditPayment.find({ creditId })
      .populate('memberId', 'name uuid')
      .sort({ installmentPeriod: 1 });

    return payments;
  } catch (error) {
    console.error("Error getting payment details:", error);
    return [];
  }
};

// Method untuk generate installments
creditSchema.methods.generateInstallments = function() {
  const installments = [];
  const startDate = new Date(this.startDate);
  
  for (let i = 1; i <= this.tenor; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    
    installments.push({
      period: i,
      dueDate: dueDate,
      amount: this.monthlyInstallment,
      paidAmount: 0,
      status: "Pending"
    });
  }
  
  this.installments = installments;
  return this;
};

// Static method untuk menghitung installment dengan bunga flat
creditSchema.statics.calculateInstallment = function(principal, rate, tenor) {
  if (rate === 0) {
    return principal / tenor;
  }
  
  // Bunga flat: bunga dihitung dari pokok pinjaman sepanjang tenor
  const totalInterest = (principal * rate * tenor) / (100 * 12); // rate per tahun, dibagi 12 untuk per bulan
  const totalAmount = principal + totalInterest;
  const installment = totalAmount / tenor;
  
  return Math.round(installment);
};

const Credit = mongoose.model("Credit", creditSchema);

export { Credit };