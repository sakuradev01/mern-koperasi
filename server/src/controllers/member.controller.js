import { Member } from "../models/member.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all members
const getAllMembers = asyncHandler(async (req, res) => {
  const members = await Member.find()
    .populate("user", "username email isActive")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: members,
  });
});

// Get member by UUID
const getMemberByUuid = asyncHandler(async (req, res) => {
  const { uuid } = req.params;

  const member = await Member.findOne({ uuid }).populate(
    "user",
    "username email isActive"
  );

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
  const { name, gender, phone, city, completeAddress, username, password } =
    req.body;

  // Check if username already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Username sudah digunakan",
    });
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
    role: "staff",
    uuid: generateUUID(),
  });

  await user.save();

  // Generate UUID for member
  const generateMemberUUID = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `MEMBER_${timestamp}_${random}`;
  };

  // Create member
  const member = new Member({
    name,
    gender,
    phone,
    city,
    completeAddress,
    user: user._id,
    uuid: generateMemberUUID(),
  });

  await member.save();

  // Populate user data
  const populatedMember = await Member.findById(member._id).populate(
    "user",
    "username email isActive"
  );

  res.status(201).json({
    success: true,
    data: populatedMember,
    message: "Member berhasil dibuat",
  });
});

// Update member
const updateMember = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  const { name, gender, phone, city, completeAddress } = req.body;

  const member = await Member.findOne({ uuid });

  if (!member) {
    return res.status(404).json({
      success: false,
      message: "Member tidak ditemukan",
    });
  }

  // Update member data
  member.name = name || member.name;
  member.gender = gender || member.gender;
  member.phone = phone || member.phone;
  member.city = city || member.city;
  member.completeAddress = completeAddress || member.completeAddress;

  await member.save();

  // Populate user data
  const populatedMember = await Member.findById(member._id).populate(
    "user",
    "username email isActive"
  );

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

export {
  getAllMembers,
  getMemberByUuid,
  createMember,
  updateMember,
  deleteMember,
  validateMemberUuid,
};
