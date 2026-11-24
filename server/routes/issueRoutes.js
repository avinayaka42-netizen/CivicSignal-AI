import express from "express";

import {
  createIssue,
  getMyIssues
} from "../controllers/issueController.js";

import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/imageUpload.js";

const router = express.Router();

// Submit a new civic issue with a mandatory image
router.post(
  "/",
  protect,
  upload.single("image"),
  createIssue
);

// Get all issues reported by the logged-in citizen
router.get("/my-reports", protect, getMyIssues);

export default router;