import express from "express";
import { getMemberToken, generateTestPayload } from "../controllers/memberAuth.controller.js";

const router = express.Router();

// Endpoint untuk mendapatkan token member menggunakan encrypted payload
router.post("/token", getMemberToken);

// Endpoint untuk generate test payload (untuk development/testing)
router.post("/generate-payload", generateTestPayload);

export default router;