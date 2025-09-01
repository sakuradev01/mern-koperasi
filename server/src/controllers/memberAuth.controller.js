import jwt from "jsonwebtoken";
import { Member } from "../models/member.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { encryptionUtils } from "../utils/encryption.js";

// Generate token untuk member menggunakan encrypted payload
const getMemberToken = asyncHandler(async (req, res) => {
  try {
    // Ambil encrypted payload dari custom header
    const encryptedPayload = req.headers["x-koperasi-auth"];

    if (!encryptedPayload) {
      throw new ApiError(400, "Missing authentication payload");
    }

    // Validate dan decrypt payload
    const validation =
      encryptionUtils.validateEncryptedPayload(encryptedPayload);

    if (!validation.valid) {
      throw new ApiError(401, `Authentication failed: ${validation.error}`);
    }

    const { uuid } = validation;

    // Cari member berdasarkan UUID
    const member = await Member.findOne({ uuid }).populate("user");

    if (!member) {
      throw new ApiError(404, "Member tidak ditemukan");
    }

    if (!member.user) {
      throw new ApiError(404, "User data tidak ditemukan untuk member ini");
    }

    if (!member.user.isActive) {
      throw new ApiError(401, "Akun member tidak aktif");
    }

    // Generate JWT token untuk member - Menggunakan role dari user data
    const tokenPayload = {
      userId: member.user._id,
      memberUuid: member.uuid,
      role: member.user.role || "member",
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Response dengan token
    res.status(200).json(
      new ApiResponse(
        200,
        {
          token: token,
          member: {
            uuid: member.uuid,
            name: member.name,
            role: member.user.role || "member", // Menggunakan role dari user data
          },
          expiresIn: "24h",
        },
        "Token member berhasil dibuat"
      )
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error("Member token generation error:", error);
    throw new ApiError(500, "Gagal membuat token member");
  }
});

// Utility function untuk generate encrypted payload (untuk testing)
const generateTestPayload = asyncHandler(async (req, res) => {
  const { uuid } = req.body;

  if (!uuid) {
    throw new ApiError(400, "UUID wajib diisi");
  }

  // Generate encrypted payload
  const encryptedPayload = encryptionUtils.generateEncryptedPayload(uuid);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        uuid: uuid,
        encryptedPayload: encryptedPayload,
        headerName: "x-koperasi-auth",
        usage: `Gunakan encrypted payload ini di header 'x-koperasi-auth' untuk mendapatkan token`,
      },
      "Encrypted payload berhasil dibuat"
    )
  );
});

export { getMemberToken, generateTestPayload };
