import express from "express";
import {
  getAllSavings,
  getSavingsById,
  createSavings,
  updateSavings,
  deleteSavings,
  getSavingsByMember,
} from "../controllers/savings.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = express.Router();

// Configure multer for file uploads
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

// Public routes (with authentication)
router.use(verifyToken);

// Routes
router
  .route("/")
  .get(getAllSavings)
  .post(upload.single("proofFile"), createSavings);

router
  .route("/:id")
  .get(getSavingsById)
  .put(upload.single("proofFile"), updateSavings)
  .delete(deleteSavings);

router.route("/member/:memberId").get(getSavingsByMember);

export default router;
