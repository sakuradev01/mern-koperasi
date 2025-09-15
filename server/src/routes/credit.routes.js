import { Router } from "express";
import {
  getCredits,
  getCreditById,
  getCreditsByMemberUuid,
  createCredit,
  updateCredit,
  deleteCredit,
  payInstallment,
  calculateInstallment
} from "../controllers/credit.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply authentication middleware
router.use(verifyToken);

// Routes
router.route("/")
  .get(getCredits)
  .post(createCredit);

router.route("/calculate")
  .post(calculateInstallment);

router.route("/:id")
  .get(getCreditById)
  .patch(updateCredit)
  .delete(deleteCredit);

router.route("/member-by-uuid/:memberUuid")
  .get(getCreditsByMemberUuid);

router.route("/:id/pay/:period")
  .patch(payInstallment);

export default router;