import express from "express";
const router = express.Router();
import { verifyToken } from "../middlewares/auth.middleware.js";
import { getDashboardStats } from "../controllers/dashboard.controller.js";

// Dashboard routes
router.get("/dashboard", verifyToken, getDashboardStats);

export default router;
