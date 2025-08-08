import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { findUserByUsername, findUserById } from "../db/mockData.js";

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || "koperasi-secret-key-2024",
    {
      expiresIn: "7d",
    }
  );
};

// Login User dengan Mock Data
export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  // Validasi input
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username dan password harus diisi",
    });
  }

  try {
    // Cari user berdasarkan username di mock data
    const user = findUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah",
      });
    }

    // Cek apakah user aktif
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Akun tidak aktif",
      });
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Username atau password salah",
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Return success response (tanpa password)
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
};

// Get Current User dengan Mock Data
export const getCurrentUser = async (req, res) => {
  try {
    const user = findUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    // Return user tanpa password
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
};

// Logout User
export const logoutUser = async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout berhasil",
  });
};

// Register User (disabled untuk koperasi)
export const registerUser = async (req, res) => {
  res.status(403).json({
    success: false,
    message: "Registrasi tidak diizinkan untuk sistem koperasi",
  });
};
