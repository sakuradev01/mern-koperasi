import { Member } from "../models/member.model.js";
import { User } from "../models/user.model.js";
import { Savings } from "../models/savings.model.js";
import { Product } from "../models/product.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// Get all members
const getAllMembers = asyncHandler(async (req, res) => {
  const members = await Member.find()
    .populate("user", "username email isActive")
    .populate("product", "title depositAmount returnProfit termDuration description")
    .sort({ createdAt: -1 });

  // Calculate total savings for each member
  const membersWithSavings = await Promise.all(
    members.map(async (member) => {
      // Method 1: Try to find by current member._id
      let approvedSavings = await Savings.find({
        memberId: member._id,
        type: "Setoran",
        status: "Approved",
      });

      // Method 2: If no savings found, try to find by populating member and matching UUID
      if (approvedSavings.length === 0) {
        const allSavings = await Savings.find({
          type: "Setoran",
          status: "Approved"
        }).populate('memberId', 'uuid name');
        
        approvedSavings = allSavings.filter(saving => 
          saving.memberId && saving.memberId.uuid === member.uuid
        );
      }

      // Calculate total using simple reduce
      const totalSavings = approvedSavings.reduce(
        (sum, saving) => sum + saving.amount,
        0
      );

      return {
        ...member.toObject(),
        totalSavings: totalSavings,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: membersWithSavings,
  });
});

// Get member by UUID
const getMemberByUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  const member = await Member.findOne({ uuid })
    .populate("user", "username email isActive")
    .populate("product", "title depositAmount returnProfit termDuration description");

  if (!member) {
    return res.status(404).json({
      success: false,
      message: "Member tidak ditemukan",
    });
  }

  res.status(200).json({
    success: true,
    data: member,
  });
});

// Create new member
const createMember = asyncHandler(async (req, res) => {
  const {
    uuid,
    name,
    gender,
    phone,
    city,
    completeAddress,
    username,
    password,
    productId,
  } = req.body;

  // Check if username already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Username sudah digunakan",
    });
  }

  // Check if UUID already exists if provided
  if (uuid) {
    const existingMember = await Member.findOne({ uuid });
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "UUID sudah digunakan",
      });
    }
  }

  // Generate UUID for user
  const generateUUID = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `USER_${timestamp}_${random}`;
  };

  // Create user account
  const user = new User({
    username,
    password: password || "default123", // Provide default password if not provided
    name,
    role: "member", // Set default role to member, can be overridden if needed
    uuid: generateUUID(),
  });

  await user.save();

  // Use provided UUID or generate new one
  const memberUUID =
    uuid ||
    (() => {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 8);
      return `MEMBER_${timestamp}_${random}`;
    })();

  // Create member
  const member = new Member({
    name,
    gender,
    phone,
    city,
    completeAddress,
    user: user._id,
    uuid: memberUUID,
    productId: productId || null,
  });

  await member.save();

  // Populate user data
  const populatedMember = await Member.findById(member._id)
    .populate("user", "username email isActive")
    .populate("product", "title depositAmount");

  res.status(201).json({
    success: true,
    data: populatedMember,
    message: "Member berhasil dibuat",
  });
});

// Update member
const updateMember = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const {
    uuid: newUuid,
    name,
    gender,
    phone,
    city,
    completeAddress,
    productId,
  } = req.body;

  const member = await Member.findOne({ uuid });

  if (!member) {
    return res.status(404).json({
      success: false,
      message: "Member tidak ditemukan",
    });
  }

  // Check if new UUID is already used by another member
  if (newUuid && newUuid !== uuid) {
    const existingMember = await Member.findOne({ uuid: newUuid });
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "UUID sudah digunakan oleh member lain",
      });
    }
  }

  // Update member data
  member.uuid = newUuid || member.uuid;
  member.name = name || member.name;
  member.gender = gender || member.gender;
  member.phone = phone || member.phone;
  member.city = city || member.city;
  member.completeAddress = completeAddress || member.completeAddress;
  if (productId !== undefined) {
    member.productId = productId || null;
  }

  await member.save();

  // Populate user data
  const populatedMember = await Member.findById(member._id)
    .populate("user", "username email isActive")
    .populate("product", "title depositAmount");

  res.status(200).json({
    success: true,
    data: populatedMember,
    message: "Member berhasil diperbarui",
  });
});

// Delete member
const deleteMember = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  const member = await Member.findOne({ uuid });

  if (!member) {
    return res.status(404).json({
      success: false,
      message: "Member tidak ditemukan",
    });
  }

  // Delete associated user
  await User.findByIdAndDelete(member.user);

  // Delete member
  await Member.findByIdAndDelete(member._id);

  res.status(200).json({
    success: true,
    message: "Member berhasil dihapus",
  });
});

// Validate member UUID
const validateMemberUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  const member = await Member.findOne({ uuid });

  if (member) {
    return res.status(200).json({
      success: true,
      isValid: true,
      message: "UUID valid",
    });
  } else {
    return res.status(404).json({
      success: false,
      isValid: false,
      message: "UUID tidak valid",
    });
  }
});

// Create savings by member (secure - member can only submit for themselves)
const createMemberSavings = asyncHandler(async (req, res) => {
  try {
    const { uuid } = req.params;
    const { amount, description } = req.body;
    
    // Validasi input
    if (!amount || amount <= 0) {
      throw new ApiError(400, "Jumlah simpanan harus lebih dari 0");
    }

    // Member data sudah tersedia dari middleware requireMemberOwnership
    const member = req.member;
    
    // Validasi member memiliki productId
    if (!member.productId) {
      throw new ApiError(400, "Member belum memiliki produk yang terdaftar");
    }

    // Validasi product masih aktif
    const product = await Product.findById(member.productId);
    if (!product || !product.isActive) {
      throw new ApiError(400, "Produk tidak aktif atau tidak ditemukan");
    }

    // Validasi amount sesuai dengan depositAmount produk (convert to number)
    const numAmount = parseInt(amount);
    if (numAmount !== product.depositAmount) {
      throw new ApiError(400, `Jumlah simpanan harus sesuai dengan produk "${product.title}": Rp ${product.depositAmount.toLocaleString()}`);
    }

    // Cari periode installment terakhir untuk member dan produk ini
    const lastSaving = await Savings.findOne({
      memberId: member._id,
      productId: member.productId,
      type: "Setoran"
    }).sort({ installmentPeriod: -1 });

    // Tentukan periode installment berikutnya
    const nextPeriod = lastSaving ? lastSaving.installmentPeriod + 1 : 1;

    // Validasi tidak melebihi termDuration
    if (nextPeriod > product.termDuration) {
      throw new ApiError(400, `Periode simpanan sudah mencapai maksimal (${product.termDuration} periode)`);
    }

    // Cek apakah sudah ada simpanan pending untuk periode ini
    const existingPendingSaving = await Savings.findOne({
      memberId: member._id,
      productId: member.productId,
      installmentPeriod: nextPeriod,
      status: "Pending"
    });

    if (existingPendingSaving) {
      throw new ApiError(400, `Sudah ada simpanan pending untuk periode ${nextPeriod}`);
    }

    // Buat data simpanan baru
    const savingsData = {
      installmentPeriod: nextPeriod,
      memberId: member._id,
      productId: member.productId,
      amount: amount,
      savingsDate: new Date(),
      type: "Setoran",
      description: description || `Simpanan periode ${nextPeriod}`,
      status: "Pending", // Selalu pending untuk member submission
      proofFile: req.file ? req.file.path : null
    };

    // Simpan ke database
    const newSaving = new Savings(savingsData);
    await newSaving.save();

    // Populate data untuk response
    await newSaving.populate([
      {
        path: "memberId",
        select: "uuid name"
      },
      {
        path: "productId",
        select: "title depositAmount returnProfit termDuration"
      }
    ]);

    res.status(201).json(
      new ApiResponse(
        201,
        {
          saving: newSaving,
          message: "Simpanan berhasil disubmit dan menunggu persetujuan admin"
        },
        "Simpanan berhasil dibuat"
      )
    );

  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    console.error("Create member savings error:", error);
    throw new ApiError(500, "Gagal membuat simpanan");
  }
});

export {
  getAllMembers,
  getMemberByUuid,
  createMember,
  updateMember,
  deleteMember,
  validateMemberUuid,
  createMemberSavings,
};
