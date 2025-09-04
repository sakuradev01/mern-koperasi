import express from "express";
import {
  getAllSavings,
  getSavingsById,
  createSavings,
  updateSavings,
  deleteSavings,
  getSavingsByMember,
  getSavingsByMemberUuid,
  getSavingsSummary,
  getLastInstallmentPeriod,
  getStudentDashboardSavings,
} from "../controllers/savings.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { uploadWithErrorHandling } from "../middlewares/upload.middleware.js";

const router = express.Router();

// Public routes (with authentication)
router.use(verifyToken);

// Routes
router
  .route("/")
  .get(getAllSavings)
  .post(uploadWithErrorHandling("proofFile"), createSavings);

router
  .route("/:id")
  .get(getSavingsById)
  .put(uploadWithErrorHandling("proofFile"), updateSavings)
  .delete(deleteSavings);

router.route("/member/:memberId").get(getSavingsByMember);
router.route("/member-by-uuid/:uuid").get(getSavingsByMemberUuid);
router.route("/summary").get(getSavingsSummary);
router
  .route("/check-period/:memberId/:productId")
  .get(getLastInstallmentPeriod);
// Route ini telah dipindahkan ke member.routes.js untuk keamanan
// router.route("/student-dashboard/:memberUuid").get(getStudentDashboardSavings);

export default router;
