import express from "express";
const router = express.Router();
import { verifyToken, requireAdminOrStaff, requireMemberOwnership } from "../middlewares/auth.middleware.js";
import {
  getAllMembers,
  getMemberByUuid,
  createMember,
  updateMember,
  deleteMember,
  validateMemberUuid,
} from "../controllers/member.controller.js";
import { getStudentDashboardSavings } from "../controllers/savings.controller.js";
import { createMemberSavings } from "../controllers/member.controller.js";
import multer from "multer";

// Configure multer for member savings file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/savings/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname +
        "-" +
        uniqueSuffix +
        "." +
        file.originalname.split(".").pop()
    );
  },
});

const upload = multer({ storage: storage });

// Public routes (HAPUS YANG BERBAHAYA - hanya validasi yang aman)
router.get("/validate/:uuid", validateMemberUuid);

// Protected routes untuk Admin/Staff
router.get("/", verifyToken, requireAdminOrStaff, getAllMembers);
router.get("/:uuid", verifyToken, requireAdminOrStaff, getMemberByUuid);
router.post("/", verifyToken, requireAdminOrStaff, createMember);
router.put("/:uuid", verifyToken, requireAdminOrStaff, updateMember);
router.delete("/:uuid", verifyToken, requireAdminOrStaff, deleteMember);

// Protected routes untuk Member - hanya bisa akses data sendiri
router.get("/dashboard/:uuid", verifyToken, requireMemberOwnership, getStudentDashboardSavings);

// Member submit savings - hanya bisa submit untuk diri sendiri
router.post("/savings/:uuid", verifyToken, requireMemberOwnership, upload.single("proofFile"), createMemberSavings);

export default router;
