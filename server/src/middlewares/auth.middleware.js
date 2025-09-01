import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// Middleware untuk verifikasi JWT Token
export const verifyToken = async (req, res, next) => {
  try {
    // Ambil token dari header Authorization
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan, akses ditolak",
      });
    }

    // Verifikasi token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Cari user berdasarkan ID dari token
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid, user tidak ditemukan",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Akun tidak aktif",
      });
    }

    // Attach user info ke request
    req.user = {
      userId: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      memberUuid: decoded.memberUuid || null, // Untuk member token
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token sudah expired, silakan login ulang",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid",
      });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};

// Middleware untuk cek role admin
export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak, hanya admin yang diizinkan",
    });
  }
};

// Middleware untuk cek role admin atau staff
export const requireAdminOrStaff = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "staff")) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak, hanya admin atau staff yang diizinkan",
    });
  }
};

// Middleware untuk cek role member
export const requireMember = (req, res, next) => {
  if (req.user && req.user.role === "member") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak, hanya member yang diizinkan",
    });
  }
};

// Middleware untuk member yang hanya bisa akses data mereka sendiri
export const requireMemberOwnership = async (req, res, next) => {
  try {
    // Cek apakah user sudah terautentikasi dan memiliki role member
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan, akses ditolak",
      });
    }

    if (req.user.role !== "member") {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak, hanya member yang diizinkan",
      });
    }

    // Cek apakah UUID di parameter sesuai dengan UUID member yang login
    const { uuid, memberUuid } = req.params;
    const targetUuid = uuid || memberUuid;
    
    // Gunakan memberUuid dari token jika tersedia
    const tokenMemberUuid = req.user.memberUuid;
    
    if (!tokenMemberUuid) {
      return res.status(403).json({
        success: false,
        message: "Token tidak valid untuk member",
      });
    }
    
    if (tokenMemberUuid !== targetUuid) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak, Anda hanya bisa mengakses data Anda sendiri",
      });
    }

    // Import Member model di sini untuk menghindari circular dependency
    const { Member } = await import("../models/member.model.js");
    
    // Cari member berdasarkan UUID dari token
    const member = await Member.findOne({ uuid: tokenMemberUuid }).populate('productId');
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Data member tidak ditemukan",
      });
    }

    // Attach member info ke request untuk digunakan di controller
    req.member = member;
    next();
    
  } catch (error) {
    console.error("Member ownership middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
    });
  }
};
