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

// Debug endpoint untuk testing member authentication
const debugMemberAuth = asyncHandler(async (req, res) => {
  const { uuid } = req.params;
  
  try {
    // Cari member berdasarkan UUID
    const member = await Member.findOne({ uuid }).populate("user");
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan",
        uuid: uuid
      });
    }
    
    // Generate encrypted payload
    const encryptedPayload = encryptionUtils.generateEncryptedPayload(uuid);
    
    // Generate token langsung
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
    
    res.status(200).json({
      success: true,
      data: {
        member: {
          uuid: member.uuid,
          name: member.name,
          role: member.user.role
        },
        encryptedPayload: encryptedPayload,
        token: token,
        testUrl: `http://localhost:8000/api/members/dashboard/${uuid}`
      },
      message: "Debug data berhasil dibuat"
    });
    
  } catch (error) {
    console.error("Debug member auth error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal debug member auth",
      error: error.message
    });
  }
});

// Get proof file for member savings
const getProofFile = asyncHandler(async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validasi filename untuk keamanan
    if (!filename || filename.includes('..') || filename.includes('/')) {
      throw new ApiError(400, "Nama file tidak valid");
    }
    
    // Validasi format file
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf'];
    const fileExtension = filename.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      throw new ApiError(400, "Format file tidak didukung");
    }
    
    const fs = await import('fs');
    const path = await import('path');
    
    // Path ke file
    const filePath = path.join(process.cwd(), 'uploads', 'savings', filename);
    
    console.log(`🔍 Accessing proof file: ${filename}`);
    console.log(`🔍 Full path: ${filePath}`);
    
    // Cek apakah file ada
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      throw new ApiError(404, "File bukti tidak ditemukan");
    }
    
    // Set headers yang sesuai berdasarkan tipe file
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg', 
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf'
    };
    
    const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 tahun
    
    // Untuk PDF, set header agar bisa dibuka di browser
    if (fileExtension === 'pdf') {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }
    
    console.log(`✅ Serving file: ${filename} (${mimeType})`);
    
    // Kirim file
    res.sendFile(filePath);
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    console.error("Get proof file error:", error);
    throw new ApiError(500, "Gagal mengakses file bukti");
  }
});

export { getMemberToken, generateTestPayload, debugMemberAuth, getProofFile };
