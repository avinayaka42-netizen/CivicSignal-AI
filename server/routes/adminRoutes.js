import express from "express";

import {
  getAllIssues,
  updateIssueStatus,
  getDashboardStats,
  resolveIssue,
} from "../controllers/adminController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

import upload from "../middleware/imageUpload.js";

const router = express.Router();

// All routes require authenticated admin access.
router.use(protect, adminOnly);

// Get all civic issues with optional filters.
router.get("/issues", getAllIssues);

// Update an issue's status.
router.put("/issues/:id/status", updateIssueStatus);

// Get dashboard statistics.
router.get("/statistics", getDashboardStats);

// Upload before-and-after images and resolve an issue.
router.put(
  "/issues/:id/resolve",
  upload.fields([
    { name: "beforeImage", maxCount: 1 },
    { name: "afterImage", maxCount: 1 },
  ]),
  resolveIssue
);

export default router;