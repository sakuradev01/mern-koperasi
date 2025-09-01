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

export default router;
