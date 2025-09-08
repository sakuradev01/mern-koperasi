import { Savings } from "../models/savings.model.js";
import { Member } from "../models/member.model.js";
import { Product } from "../models/product.model.js";
import { ProductUpgrade } from "../models/productUpgrade.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  createSavingsSchema,
  updateSavingsSchema,
  querySavingsSchema,
} from "../validations/savings.validation.js";

// Get all savings
const getAllSavings = asyncHandler(async (req, res) => {
  const { error, value } = querySavingsSchema.validate(req.query);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { page, limit, status, memberId } = value;
  const query = {};

  if (status) query.status = status;
  if (memberId) query.memberId = memberId;

  const savings = await Savings.find(query)
    .populate("memberId", "name email phone")
    .populate("productId", "title depositAmount returnProfit termDuration")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await Savings.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, {
      savings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    })
  );
});

// Get single savings by ID
const getSavingsById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const savings = await Savings.findById(id)
    .populate("memberId", "name email phone")
    .populate("productId");

  if (!savings) {
    throw new ApiError(404, "Data simpanan tidak ditemukan");
  }

  res.status(200).json(new ApiResponse(200, savings));
});

// Create new savings
const createSavings = asyncHandler(async (req, res) => {
  console.log("🔍 createSavings called");
  console.log("🔍 req.file:", req.file);
  console.log("🔍 req.body:", req.body);
  
  // CRITICAL: Check if file upload was attempted but failed
  // Only check if there's actually a file field in the form data (not just multipart)
  const hasFileInFormData = req.body.proofFile !== undefined && req.body.proofFile !== null && req.body.proofFile !== '';
  
  if (hasFileInFormData && !req.file) {
    console.log("❌ File upload was attempted but failed - rejecting entire transaction");
    throw new ApiError(400, "Upload file gagal. Pastikan file tidak lebih dari 5MB dan format yang didukung (JPG, PNG, GIF, PDF).");
  }

  const { error, value } = createSavingsSchema.validate(req.body);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const {
    installmentPeriod,
    memberId,
    productId,
    amount,
    savingsDate,
    type,
    description,
    status,
  } = value;

  // Validate member exists
  const member = await Member.findById(memberId);
  if (!member) {
    throw new ApiError(404, "Anggota tidak ditemukan");
  }

  // Validate product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Produk tidak ditemukan");
  }

  // PERBAIKAN: Validate amount dengan mempertimbangkan upgrade aktif
  // Gunakan current product member, bukan product dari form
  await member.populate("productId");
  let currentProduct = member.productId;
  let expectedAmount = currentProduct.depositAmount;
  let upgradeInfo = null;
  
  // Cek apakah ada upgrade aktif untuk member ini
  const activeUpgrade = await ProductUpgrade.findOne({
    memberId: member._id,
    status: "Active"
  });
  
  if (activeUpgrade && installmentPeriod > activeUpgrade.periodWhenUpgraded) {
    // Jika ada upgrade aktif dan periode ini setelah upgrade, gunakan nominal baru
    expectedAmount = activeUpgrade.newMonthlyAmount;
    upgradeInfo = {
      isUpgradePeriod: true,
      oldAmount: currentProduct.depositAmount,
      newAmount: activeUpgrade.newMonthlyAmount,
      compensation: activeUpgrade.compensationPerMonth
    };
    console.log(`🚀 Upgrade detected for period ${installmentPeriod}, expected amount: ${expectedAmount}`);
  }
  
  if (amount < expectedAmount) {
    const errorMessage = upgradeInfo 
      ? `Jumlah simpanan minimal ${formatCurrency(expectedAmount)} (termasuk kompensasi upgrade ${formatCurrency(upgradeInfo.compensation)})`
      : `Jumlah simpanan minimal ${formatCurrency(expectedAmount)}`;
    throw new ApiError(400, errorMessage);
  }
  
  // Helper function untuk format currency di error message
  function formatCurrency(amount) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // Check for duplicate installment period for same member and product
  const existingSavings = await Savings.findOne({
    memberId,
    productId,
    installmentPeriod,
  });

  if (existingSavings) {
    throw new ApiError(
      400,
      `Kamu sudah pernah menambahkan data periode ${installmentPeriod} untuk produk ini`
    );
  }

  // ADDITIONAL VALIDATION: Ensure file is present if this is a NEW deposit (Setoran)
  // For create operation, require file for setoran
  if (type === "Setoran" && !req.file) {
    console.log("❌ New Setoran requires proof file but none provided");
    throw new ApiError(400, "Bukti transaksi wajib untuk setoran baru.");
  }

  console.log("✅ All validations passed, creating savings");
  // PERBAIKAN: Gunakan productId dari current product member, bukan dari form
  const savings = new Savings({
    installmentPeriod,
    memberId,
    productId: currentProduct._id, // Gunakan current product member
    amount,
    savingsDate,
    type,
    description,
    status: status || "Pending", // Tambahkan status field
    proofFile: req.file ? req.file.path : null,
  });

  await savings.save();
  console.log("✅ Savings created successfully");

  res
    .status(201)
    .json(new ApiResponse(201, savings, "Data simpanan berhasil dibuat"));
});

// Update savings
const updateSavings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log("🔍 updateSavings called for ID:", id);
  console.log("🔍 req.file:", req.file);
  console.log("🔍 req.body:", req.body);

  // CRITICAL: Check if file upload was attempted but failed
  // Only check if there's actually a file field in the form data (not just multipart)
  const hasFileInFormData = req.body.proofFile !== undefined && req.body.proofFile !== null && req.body.proofFile !== '';
  
  if (hasFileInFormData && !req.file) {
    console.log("❌ File upload was attempted but failed - rejecting entire update");
    throw new ApiError(400, "Upload file gagal. Pastikan file tidak lebih dari 5MB dan format yang didukung (JPG, PNG, GIF, PDF).");
  }

  // Ambil semua field dari form data
  const updateData = {};

  // Ambil semua field yang dikirim
  const fields = [
    "installmentPeriod",
    "memberId",
    "productId",
    "amount",
    "savingsDate",
    "type",
    "description",
    "status",
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  // Handle file upload jika ada
  if (req.file) {
    updateData.proofFile = req.file.path;
    console.log("✅ File uploaded successfully:", req.file.path);
  }

  // PERBAIKAN: Ambil existing savings dulu untuk validasi upgrade
  const existingSavings = await Savings.findById(id);
  if (!existingSavings) {
    throw new ApiError(404, "Data simpanan tidak ditemukan");
  }

  // Validasi member dan product jika diupdate
  if (updateData.memberId) {
    const member = await Member.findById(updateData.memberId);
    if (!member) {
      throw new ApiError(404, "Anggota tidak ditemukan");
    }
  }

  if (updateData.productId) {
    const product = await Product.findById(updateData.productId);
    if (!product) {
      throw new ApiError(404, "Produk tidak ditemukan");
    }

    // PERBAIKAN: Validasi amount terhadap product dengan mempertimbangkan upgrade
    if (updateData.amount) {
      let expectedAmount = product.depositAmount;
      let upgradeInfo = null;
      
      // Cek apakah ada upgrade aktif untuk member ini
      const activeUpgrade = await ProductUpgrade.findOne({
        memberId: existingSavings.memberId,
        status: "Active"
      });
      
      if (activeUpgrade && existingSavings.installmentPeriod > activeUpgrade.periodWhenUpgraded) {
        // Jika ada upgrade aktif dan periode ini setelah upgrade, gunakan nominal baru
        expectedAmount = activeUpgrade.newMonthlyAmount;
        upgradeInfo = {
          isUpgradePeriod: true,
          oldAmount: product.depositAmount,
          newAmount: activeUpgrade.newMonthlyAmount,
          compensation: activeUpgrade.compensationPerMonth
        };
        console.log(`🚀 Update: Upgrade detected for period ${existingSavings.installmentPeriod}, expected amount: ${expectedAmount}`);
      }
      
      if (updateData.amount < expectedAmount) {
        const errorMessage = upgradeInfo 
          ? `Jumlah simpanan minimal ${formatCurrencyUpdate(expectedAmount)} (termasuk kompensasi upgrade ${formatCurrencyUpdate(upgradeInfo.compensation)})`
          : `Jumlah simpanan minimal ${formatCurrencyUpdate(expectedAmount)}`;
        throw new ApiError(400, errorMessage);
      }
    }
    
    // Helper function untuk format currency di error message update
    function formatCurrencyUpdate(amount) {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(amount);
    }
  }

  // Check for duplicate installment period when updating
  if (
    updateData.installmentPeriod &&
    updateData.memberId &&
    updateData.productId
  ) {
    const existingSavings = await Savings.findOne({
      memberId: updateData.memberId,
      productId: updateData.productId,
      installmentPeriod: updateData.installmentPeriod,
      _id: { $ne: id }, // Exclude current savings
    });

    if (existingSavings) {
      throw new ApiError(
        400,
        `Kamu sudah pernah menambahkan data periode ${updateData.installmentPeriod} untuk produk ini`
      );
    }
  }

  const savings = await Savings.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("memberId", "name email phone")
    .populate("productId");

  if (!savings) {
    throw new ApiError(404, "Data simpanan tidak ditemukan");
  }

  res
    .status(200)
    .json(new ApiResponse(200, savings, "Data simpanan berhasil diperbarui"));
});

// Delete savings
const deleteSavings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const savings = await Savings.findByIdAndDelete(id);

  if (!savings) {
    throw new ApiError(404, "Data simpanan tidak ditemukan");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Data simpanan berhasil dihapus"));
});

// Get savings by member
const getSavingsByMember = asyncHandler(async (req, res) => {
  const { error, value } = querySavingsSchema.validate(req.query);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { memberId } = req.params;
  const { page, limit } = value;

  // PERBAIKAN: Cari savings berdasarkan memberId langsung dulu
  let savings = await Savings.find({ memberId })
    .populate("memberId", "name email phone uuid")
    .populate("productId", "title depositAmount returnProfit termDuration")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  let total = await Savings.countDocuments({ memberId });

  // Jika tidak ada data, coba cari berdasarkan UUID member
  if (savings.length === 0) {
    // Cari member berdasarkan memberId untuk mendapatkan UUID
    const member = await Member.findById(memberId);
    if (member && member.uuid) {
      // Cari semua savings dan filter berdasarkan UUID
      const allSavings = await Savings.find({})
        .populate("memberId", "name email phone uuid")
        .populate("productId", "title depositAmount returnProfit termDuration")
        .sort({ createdAt: -1 });

      savings = allSavings
        .filter(
          (saving) => saving.memberId && saving.memberId.uuid === member.uuid
        )
        .slice((page - 1) * limit, page * limit);

      total = allSavings.filter(
        (saving) => saving.memberId && saving.memberId.uuid === member.uuid
      ).length;
    }
  }

  // Calculate total savings - PERBAIKAN: gunakan data yang sudah difilter
  const approvedSavings = savings.filter(
    (s) => s.status === "Approved" && s.type === "Setoran"
  );
  const approvedWithdrawals = savings.filter(
    (s) => s.status === "Approved" && s.type === "Penarikan"
  );

  const totalSavings = approvedSavings.reduce((sum, s) => sum + s.amount, 0);
  const totalWithdrawals = approvedWithdrawals.reduce(
    (sum, s) => sum + s.amount,
    0
  );
  const balance = totalSavings - totalWithdrawals;

  console.log(
    `getSavingsByMember: Found ${savings.length} savings for memberId ${memberId}`
  ); // Debug

  res.status(200).json(
    new ApiResponse(200, {
      savings,
      summary: {
        totalSavings,
        totalWithdrawals,
        balance,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    })
  );
});

// Get savings summary
const getSavingsSummary = asyncHandler(async (req, res) => {
  const { error, value } = querySavingsSchema.validate(req.query);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { memberId } = value;
  const matchQuery = { status: "Approved" };
  if (memberId) matchQuery.memberId = memberId;

  const savings = await Savings.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$type",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const totalSavings =
    savings.find((s) => s._id === "Setoran")?.totalAmount || 0;
  const totalWithdrawals =
    savings.find((s) => s._id === "Penarikan")?.totalAmount || 0;
  const balance = totalSavings - totalWithdrawals;

  res.status(200).json(
    new ApiResponse(200, {
      totalSavings,
      totalWithdrawals,
      balance,
    })
  );
});

// Get last installment period for member and product
const getLastInstallmentPeriod = asyncHandler(async (req, res) => {
  const { memberId, productId } = req.params;

  if (!memberId || !productId) {
    throw new ApiError(400, "Member ID dan Product ID wajib diisi");
  }

  // PERBAIKAN: Cari periode terakhir untuk member (semua produk) karena setelah upgrade productId berubah
  const lastSavings = await Savings.findOne({
    memberId,
    // HAPUS filter productId agar bisa ambil dari produk lama juga
    type: "Setoran"
  })
    .sort({ installmentPeriod: -1 })
    .select("installmentPeriod");

  const lastPeriod = lastSavings ? lastSavings.installmentPeriod : 0;
  const nextPeriod = lastPeriod + 1;

  // TAMBAHAN: Cek apakah ada upgrade aktif untuk menentukan expected amount
  let expectedAmount = null;
  let upgradeInfo = null;
  
  try {
    const member = await Member.findById(memberId).populate("productId");
    if (member && member.productId) {
      expectedAmount = member.productId.depositAmount;
      
      // Cek upgrade aktif
      const activeUpgrade = await ProductUpgrade.findOne({
        memberId: member._id,
        status: "Active"
      });
      
      if (activeUpgrade && nextPeriod > activeUpgrade.periodWhenUpgraded) {
        expectedAmount = activeUpgrade.newMonthlyAmount;
        upgradeInfo = {
          isUpgradePeriod: true,
          oldAmount: member.productId.depositAmount,
          newAmount: activeUpgrade.newMonthlyAmount,
          compensation: activeUpgrade.compensationPerMonth,
          upgradeFromPeriod: activeUpgrade.periodWhenUpgraded + 1
        };
      }
    }
  } catch (error) {
    console.error("Error checking upgrade for period calculation:", error);
  }

  console.log(`🔍 getLastInstallmentPeriod - Member: ${memberId}, Last: ${lastPeriod}, Next: ${nextPeriod}, Expected: ${expectedAmount}`);

  res.status(200).json(
    new ApiResponse(200, {
      lastPeriod,
      nextPeriod,
      expectedAmount,
      upgradeInfo
    })
  );
});

// Get student dashboard savings by member UUID
const getStudentDashboardSavings = asyncHandler(async (req, res) => {
  // Dapatkan member dari middleware requireMemberOwnership
  const member = req.member;

  // Pastikan member memiliki produk simpanan
  if (!member.productId) {
    throw new ApiError(
      404,
      "Member belum memiliki produk simpanan yang dipilih"
    );
  }

  // Populate product details (tenor/term duration)
  await member.populate("productId");
  const product = member.productId;

  // PERBAIKAN TOTAL: Cari semua data savings untuk member ini dengan berbagai cara
  console.log(
    `Searching savings for member UUID: ${member.uuid}, ID: ${member._id}`
  ); // Debug

  // Method 1: Cari berdasarkan member._id langsung
  let depositHistory = await Savings.find({
    memberId: member._id,
    type: "Setoran",
    status: "Approved",
  }).select("installmentPeriod amount proofFile");

  console.log(
    `Method 1 (by member._id): Found ${depositHistory.length} savings`
  ); // Debug

  // Method 2: Cari semua savings dan filter berdasarkan UUID (untuk data yang dibuat admin)
  const allSavings = await Savings.find({
    type: "Setoran",
    status: "Approved",
  })
    .populate("memberId", "uuid name")
    .select("installmentPeriod amount proofFile memberId");

  const savingsByUuid = allSavings.filter(
    (saving) => saving.memberId && saving.memberId.uuid === member.uuid
  );

  console.log(`Method 2 (by UUID): Found ${savingsByUuid.length} savings`); // Debug

  // Gabungkan hasil dari kedua method dan hapus duplikat
  const allFoundSavings = [...depositHistory, ...savingsByUuid];

  // Hapus duplikat berdasarkan installmentPeriod
  const uniqueSavings = allFoundSavings.reduce((acc, current) => {
    const existing = acc.find(
      (item) => item.installmentPeriod === current.installmentPeriod
    );
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, []);

  depositHistory = uniqueSavings;
  console.log(
    `Final result: Found ${depositHistory.length} unique approved savings for member ${member.uuid}`
  ); // Debug

  // Map deposit history by installment period
  const realizationAmountMap = {};
  const realizationProofFileMap = {};

  depositHistory.forEach((deposit) => {
    realizationAmountMap[deposit.installmentPeriod] = deposit.amount;
    realizationProofFileMap[deposit.installmentPeriod] = deposit.proofFile || 0;
    console.log(`Period ${deposit.installmentPeriod}: ${deposit.amount}`); // Debug
  });

  // PERBAIKAN: Cek upgrade aktif untuk proyeksi yang benar
  let activeUpgrade = null;
  let upgradeStartPeriod = null;
  
  try {
    activeUpgrade = await ProductUpgrade.findOne({
      memberId: member._id,
      status: "Active"
    }).populate([
      { path: "oldProduct", select: "depositAmount" },
      { path: "newProduct", select: "depositAmount" }
    ]);
    
    if (activeUpgrade) {
      upgradeStartPeriod = activeUpgrade.periodWhenUpgraded + 1;
      console.log(`🚀 Dashboard: Active upgrade found, upgrade from period ${upgradeStartPeriod}`);
    }
  } catch (error) {
    console.error("Error checking upgrade for dashboard:", error);
  }

  // Generate projection data for all periods (upgrade-aware)
  const delivered = [];
  const currentDate = new Date();

  for (let i = 1; i <= product.termDuration; i++) {
    // Calculate date projection (adding i months to current date)
    const projectionDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + i,
      1
    );
    const dateProjection = projectionDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // PERBAIKAN: Tentukan proyeksi berdasarkan upgrade status
    let projectionAmount = product.depositAmount; // Default: nominal saat ini
    
    if (activeUpgrade && i >= upgradeStartPeriod) {
      // Periode setelah upgrade: gunakan nominal baru + kompensasi
      projectionAmount = activeUpgrade.newMonthlyAmount;
    } else if (activeUpgrade && activeUpgrade.oldProduct) {
      // Periode sebelum upgrade: gunakan nominal asli dari oldProduct
      projectionAmount = activeUpgrade.oldProduct.depositAmount;
    }

    delivered.push({
      installment_period: i,
      projection: projectionAmount.toString(),
      dateProjection: dateProjection,
      realization: realizationAmountMap[i]
        ? realizationAmountMap[i].toString()
        : 0,
      payment_proof: realizationProofFileMap[i] || 0,
    });
  }

  res.status(200).json(delivered);
});

// Get savings by member UUID - SIMPLE APPROACH
const getSavingsByMemberUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  console.log(`getSavingsByMemberUuid: Searching for member UUID: ${uuid}`); // Debug

  // Cari member berdasarkan UUID
  const member = await Member.findOne({ uuid });
  if (!member) {
    throw new ApiError(404, "Member tidak ditemukan");
  }

  console.log(`Found member: ${member.name} (ID: ${member._id})`); // Debug

  // LANGSUNG QUERY SEMUA SAVINGS untuk member ini
  // Method 1: Cari berdasarkan member._id
  let allSavings = await Savings.find({ memberId: member._id })
    .populate("memberId", "name email phone uuid")
    .populate("productId", "title depositAmount returnProfit termDuration")
    .sort({ installmentPeriod: 1 });

  console.log(`Method 1 (by member._id): Found ${allSavings.length} savings`); // Debug

  // Method 2: Jika tidak ada, cari dengan populate dan filter UUID
  if (allSavings.length === 0) {
    const allSavingsInDB = await Savings.find({})
      .populate("memberId", "name email phone uuid")
      .populate("productId", "title depositAmount returnProfit termDuration")
      .sort({ installmentPeriod: 1 });

    allSavings = allSavingsInDB.filter(
      (saving) => saving.memberId && saving.memberId.uuid === uuid
    );

    console.log(
      `Method 2 (by UUID filter): Found ${allSavings.length} savings`
    ); // Debug
  }

  // Debug: Print semua savings yang ditemukan
  allSavings.forEach((saving) => {
    console.log(
      `Period ${saving.installmentPeriod}: ${saving.amount} - ${saving.status} - ${saving.type}`
    );
  });

  res.status(200).json(
    new ApiResponse(200, {
      savings: allSavings,
      member: {
        uuid: member.uuid,
        name: member.name,
        _id: member._id,
      },
    })
  );
});

export {
  getAllSavings,
  getSavingsById,
  createSavings,
  updateSavings,
  deleteSavings,
  getSavingsByMember,
  getSavingsByMemberUuid,
  getSavingsSummary,
  getLastInstallmentPeriod,
  getStudentDashboardSavings,
};
