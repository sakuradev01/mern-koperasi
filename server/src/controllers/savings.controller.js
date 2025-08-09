import { Savings } from "../models/savings.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all savings
const getAllSavings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, memberId } = req.query;
  const query = {};

  if (status) query.status = status;
  if (memberId) query.memberId = memberId;

  const savings = await Savings.find(query)
    .populate("memberId", "name email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Savings.countDocuments(query);

  res.status(200).json({
    success: true,
    data: savings,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
    },
  });
});

// Get single savings by ID
const getSavingsById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const savings = await Savings.findById(id).populate("memberId", "name email");

  if (!savings) {
    return res.status(404).json({
      success: false,
      message: "Data simpanan tidak ditemukan",
    });
  }

  res.status(200).json({
    success: true,
    data: savings,
  });
});

// Create new savings
const createSavings = asyncHandler(async (req, res) => {
  const {
    installmentPeriod,
    memberId,
    amount,
    savingsDate,
    type,
    description,
  } = req.body;

  // Validate user exists
  const user = await User.findById(memberId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Anggota tidak ditemukan",
    });
  }

  const savings = new Savings({
    installmentPeriod,
    memberId,
    amount,
    savingsDate,
    type,
    description,
    proofFile: req.file ? req.file.path : null,
  });

  await savings.save();

  res.status(201).json({
    success: true,
    data: savings,
    message: "Data simpanan berhasil dibuat",
  });
});

// Update savings
const updateSavings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, description } = req.body;

  const savings = await Savings.findByIdAndUpdate(
    id,
    {
      status,
      description,
      ...(req.file && { proofFile: req.file.path }),
    },
    { new: true, runValidators: true }
  );

  if (!savings) {
    return res.status(404).json({
      success: false,
      message: "Data simpanan tidak ditemukan",
    });
  }

  res.status(200).json({
    success: true,
    data: savings,
    message: "Data simpanan berhasil diperbarui",
  });
});

// Delete savings
const deleteSavings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const savings = await Savings.findByIdAndDelete(id);

  if (!savings) {
    return res.status(404).json({
      success: false,
      message: "Data simpanan tidak ditemukan",
    });
  }

  res.status(200).json({
    success: true,
    message: "Data simpanan berhasil dihapus",
  });
});

// Get savings by member
const getSavingsByMember = asyncHandler(async (req, res) => {
  const { memberId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const savings = await Savings.find({ memberId })
    .populate("memberId", "name email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Savings.countDocuments({ memberId });

  // Calculate total savings
  const approvedSavings = await Savings.find({
    memberId,
    status: "Approved",
    type: "Setoran",
  });
  const approvedWithdrawals = await Savings.find({
    memberId,
    status: "Approved",
    type: "Penarikan",
  });

  const totalSavings = approvedSavings.reduce((sum, s) => sum + s.amount, 0);
  const totalWithdrawals = approvedWithdrawals.reduce(
    (sum, s) => sum + s.amount,
    0
  );
  const balance = totalSavings - totalWithdrawals;

  res.status(200).json({
    success: true,
    data: savings,
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
  });
});

export {
  getAllSavings,
  getSavingsById,
  createSavings,
  updateSavings,
  deleteSavings,
  getSavingsByMember,
};
