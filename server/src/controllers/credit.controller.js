import { Credit } from "../models/credit.model.js";
import { Member } from "../models/member.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all credits dengan pagination dan filter
const getCredits = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, memberUuid, search } = req.query;

  const filter = {};
  
  if (status) {
    filter.status = status;
  }
  
  if (memberUuid) {
    filter.memberUuid = memberUuid;
  }

  // Search by member name atau product name
  if (search) {
    const members = await Member.find({
      name: { $regex: search, $options: 'i' }
    }).select('_id');
    
    const memberIds = members.map(m => m._id);
    
    filter.$or = [
      { memberId: { $in: memberIds } },
      { productName: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const credits = await Credit.find(filter)
    .populate('memberId', 'name uuid phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Credit.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, {
      credits,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }, "Data kredit berhasil diambil")
  );
});

// Get credit by ID
const getCreditById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const credit = await Credit.findById(id).populate('memberId', 'name uuid phone email');

  if (!credit) {
    throw new ApiError(404, "Kredit tidak ditemukan");
  }

  return res.status(200).json(
    new ApiResponse(200, credit, "Detail kredit berhasil diambil")
  );
});

// Get credits by member UUID
const getCreditsByMemberUuid = asyncHandler(async (req, res) => {
  const { memberUuid } = req.params;

  const credits = await Credit.find({ memberUuid })
    .populate('memberId', 'name uuid phone')
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, { credits }, "Data kredit member berhasil diambil")
  );
});

// Create new credit
const createCredit = asyncHandler(async (req, res) => {
  const {
    memberUuid,
    productName,
    principalAmount,
    interestRate = 0,
    tenor = 12,
    productLink = "",
    description = ""
  } = req.body;

  // Validasi member exists
  const member = await Member.findOne({ uuid: memberUuid });
  if (!member) {
    throw new ApiError(404, "Member tidak ditemukan");
  }

  // Calculate monthly installment
  const monthlyInstallment = Credit.calculateInstallment(principalAmount, interestRate, tenor);
  const totalAmount = monthlyInstallment * tenor;

  // Calculate end date
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + tenor);

  // Create credit
  const credit = new Credit({
    memberUuid,
    memberId: member._id,
    productName,
    principalAmount,
    interestRate,
    tenor,
    monthlyInstallment,
    totalAmount,
    productLink,
    description,
    startDate,
    endDate
  });

  // Generate installments
  credit.generateInstallments();

  await credit.save();

  const populatedCredit = await Credit.findById(credit._id).populate('memberId', 'name uuid phone');

  return res.status(201).json(
    new ApiResponse(201, populatedCredit, "Kredit berhasil dibuat")
  );
});

// Update credit
const updateCredit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const credit = await Credit.findById(id);
  if (!credit) {
    throw new ApiError(404, "Kredit tidak ditemukan");
  }

  // Jika ada perubahan pada principal, rate, atau tenor, recalculate
  if (updateData.principalAmount || updateData.interestRate || updateData.tenor) {
    const principal = updateData.principalAmount || credit.principalAmount;
    const rate = updateData.interestRate || credit.interestRate;
    const tenor = updateData.tenor || credit.tenor;

    updateData.monthlyInstallment = Credit.calculateInstallment(principal, rate, tenor);
    updateData.totalAmount = updateData.monthlyInstallment * tenor;

    // Recalculate end date if tenor changed
    if (updateData.tenor) {
      const newEndDate = new Date(credit.startDate);
      newEndDate.setMonth(newEndDate.getMonth() + tenor);
      updateData.endDate = newEndDate;
    }
  }

  const updatedCredit = await Credit.findByIdAndUpdate(id, updateData, { 
    new: true, 
    runValidators: true 
  }).populate('memberId', 'name uuid phone');

  // Regenerate installments if needed
  if (updateData.principalAmount || updateData.interestRate || updateData.tenor) {
    updatedCredit.generateInstallments();
    await updatedCredit.save();
  }

  return res.status(200).json(
    new ApiResponse(200, updatedCredit, "Kredit berhasil diupdate")
  );
});

// Delete credit
const deleteCredit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const credit = await Credit.findById(id);
  if (!credit) {
    throw new ApiError(404, "Kredit tidak ditemukan");
  }

  await Credit.findByIdAndDelete(id);

  return res.status(200).json(
    new ApiResponse(200, null, "Kredit berhasil dihapus")
  );
});

// Pay installment
const payInstallment = asyncHandler(async (req, res) => {
  const { id, period } = req.params;
  const { amount, proofFile = "", notes = "" } = req.body;

  const credit = await Credit.findById(id);
  if (!credit) {
    throw new ApiError(404, "Kredit tidak ditemukan");
  }

  const installment = credit.installments.find(inst => inst.period === parseInt(period));
  if (!installment) {
    throw new ApiError(404, "Periode installment tidak ditemukan");
  }

  // Update installment
  installment.paidAmount = amount;
  installment.paidDate = new Date();
  installment.proofFile = proofFile;
  installment.notes = notes;

  // Update status based on payment
  if (amount >= installment.amount) {
    installment.status = "Paid";
  } else if (amount > 0) {
    installment.status = "Partial";
  }

  // Check if all installments are paid
  const allPaid = credit.installments.every(inst => inst.status === "Paid");
  if (allPaid) {
    credit.status = "Completed";
  }

  await credit.save();

  const updatedCredit = await Credit.findById(id).populate('memberId', 'name uuid phone');

  return res.status(200).json(
    new ApiResponse(200, updatedCredit, "Pembayaran installment berhasil")
  );
});

// Calculate installment (utility endpoint)
const calculateInstallment = asyncHandler(async (req, res) => {
  const { principalAmount, interestRate = 0, tenor = 12 } = req.body;

  if (!principalAmount || principalAmount <= 0) {
    throw new ApiError(400, "Principal amount harus lebih dari 0");
  }

  if (tenor <= 0) {
    throw new ApiError(400, "Tenor harus lebih dari 0");
  }

  const monthlyInstallment = Credit.calculateInstallment(principalAmount, interestRate, tenor);
  const totalAmount = monthlyInstallment * tenor;
  const totalInterest = totalAmount - principalAmount;

  const schedule = [];
  const principalPerMonth = principalAmount / tenor;
  const interestPerMonth = totalInterest / tenor;
  
  for (let i = 1; i <= tenor; i++) {
    schedule.push({
      period: i,
      amount: monthlyInstallment,
      principal: principalPerMonth,
      interest: interestPerMonth,
    });
  }

  return res.status(200).json(
    new ApiResponse(200, {
      principalAmount,
      interestRate,
      tenor,
      monthlyInstallment,
      totalAmount,
      totalInterest,
      schedule
    }, "Kalkulasi installment berhasil")
  );
});

export {
  getCredits,
  getCreditById,
  getCreditsByMemberUuid,
  createCredit,
  updateCredit,
  deleteCredit,
  payInstallment,
  calculateInstallment
};