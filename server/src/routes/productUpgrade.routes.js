import express from "express";
import {
  calculateUpgradeCompensation,
  executeProductUpgrade,
  getUpgradeHistory,
  getActiveUpgrade
} from "../controllers/productUpgrade.controller.js";
import { verifyToken, requireAdminOrStaff } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Semua routes memerlukan authentication
router.use(verifyToken);

// Routes untuk product upgrade
router.post("/calculate/:memberUuid", requireAdminOrStaff, calculateUpgradeCompensation);
router.post("/execute/:memberUuid", requireAdminOrStaff, executeProductUpgrade);
router.get("/history/:memberUuid", requireAdminOrStaff, getUpgradeHistory);
router.get("/active/:memberUuid", requireAdminOrStaff, getActiveUpgrade);

export default router;