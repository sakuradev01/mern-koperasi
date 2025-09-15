import { Router } from "express";
import {
  getCreditPayments,
  getCreditPaymentById,
  createCreditPayment,
  updateCreditPayment,
  deleteCreditPayment
} from "../controllers/creditPayment.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

// Apply authentication middleware
router.use(verifyToken);

// Routes
router.route("/")
  .get(getCreditPayments)
  .post(upload.single("proofFile"), createCreditPayment);

router.route("/:id")
  .get(getCreditPaymentById)
  .patch(upload.single("proofFile"), updateCreditPayment)
  .delete(deleteCreditPayment);

export default router;