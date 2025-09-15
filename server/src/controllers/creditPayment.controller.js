import { CreditPayment } from "../models/creditPayment.model.js";
import { Member } from "../models/member.model.js";
import { Credit } from "../models/credit.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all credit payments dengan pagination dan filter
const getCreditPayments = asyncHandler(async (req, res) => {
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
  
  const creditPayments = await CreditPayment.find(filter)
    .populate('memberId', 'name uuid phone')
    .populate('creditId', 'productName principalAmount monthlyInstallment')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await CreditPayment.countDocuments(filter);

  return res.status(200).json(
    new ApiResponse(200, {
      creditPayments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    }, "Data pembayaran kredit berhasil diambil")
  );
});

// Get credit payment by ID
const getCreditPaymentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const creditPayment = await CreditPayment.findById(id)
    .populate('memberId', 'name uuid phone email')
    .populate('creditId', 'productName principalAmount monthlyInstallment tenor');

  if (!creditPayment) {
    throw new ApiError(404, "Pembayaran kredit tidak ditemukan");
  }

  return res.status(200).json(
    new ApiResponse(200, creditPayment, "Detail pembayaran kredit berhasil diambil")
  );
});

// Create new credit payment
const createCreditPayment = asyncHandler(async (req, res) => {
  const {
    memberUuid,
    creditId,
    installmentPeriod,
    amount,
    paymentDate,
    description,
    status = "Pending"
  } = req.body;

  // Validasi member exists
  const member = await Member.findOne({ uuid: memberUuid });
  if (!member) {
    throw new ApiError(404, "Member tidak ditemukan");
  }

  // Validasi credit exists
  const credit = await Credit.findById(creditId);
  if (!credit) {
    throw new ApiError(404, "Kredit tidak ditemukan");
  }

  // Check if payment for this period already exists
  const existingPayment = await CreditPayment.findOne({
    creditId,
    installmentPeriod
  });

  if (existingPayment) {
    throw new ApiError(400, `Pembayaran untuk periode ${installmentPeriod} sudah ada`);
  }

  // Handle file upload
  let proofFileName = "";
  if (req.file) {
    proofFileName = req.file.filename;
  }

  // Create credit payment
  const creditPayment = await CreditPayment.create({
    memberUuid,
    memberId: member._id,
    creditId,
    productName: credit.productName,
    installmentPeriod,
    amount,
    paymentDate,
    proofFile: proofFileName,
    description: description || `Pembayaran angsuran periode ${installmentPeriod}`,
    status
  });

  const populatedCreditPayment = await CreditPayment.findById(creditPayment._id)
    .populate('memberId', 'name uuid phone')
    .populate('creditId', 'productName principalAmount monthlyInstallment');

  return res.status(201).json(
    new ApiResponse(201, populatedCreditPayment, "Pembayaran kredit berhasil ditambahkan")
  );
});

// Update credit payment
const updateCreditPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const creditPayment = await CreditPayment.findById(id);
  if (!creditPayment) {
    throw new ApiError(404, "Pembayaran kredit tidak ditemukan");
  }

  // Handle file upload
  if (req.file) {
    updateData.proofFile = req.file.filename;
  }

  const updatedCreditPayment = await CreditPayment.findByIdAndUpdate(
    id, 
    updateData, 
    { new: true, runValidators: true }
  ).populate('memberId', 'name uuid phone')
   .populate('creditId', 'productName principalAmount monthlyInstallment');

  return res.status(200).json(
    new ApiResponse(200, updatedCreditPayment, "Pembayaran kredit berhasil diupdate")
  );
});

// Delete credit payment
const deleteCreditPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const creditPayment = await CreditPayment.findById(id);
  if (!creditPayment) {
    throw new ApiError(404, "Pembayaran kredit tidak ditemukan");
  }

  await CreditPayment.findByIdAndDelete(id);

  return res.status(200).json(
    new ApiResponse(200, null, "Pembayaran kredit berhasil dihapus")
  );
});

export {
  getCreditPayments,
  getCreditPaymentById,
  createCreditPayment,
  updateCreditPayment,
  deleteCreditPayment
};