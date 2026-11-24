import Issue from "../models/Issue.js";
import {
  uploadToCloudinary,
} from "../middleware/imageUpload.js";

// ======================================
// GET ALL CIVIC ISSUES
// ======================================

export const getAllIssues = async (req, res) => {
  try {
    const { category, priority, status } = req.query;

    const filter = {};

    if (category && category !== "All") {
      filter.category = category;
    }

    if (priority && priority !== "All") {
      filter.priority = priority;
    }

    if (status && status !== "All") {
      filter.status = status;
    }

    const issues = await Issue.find(filter)
      .populate("reportedBy", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: issues.length,
      issues,
    });
  } catch (error) {
    console.error("Get all issues error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch civic issues.",
    });
  }
};

// ======================================
// UPDATE ISSUE STATUS
// ======================================

export const updateIssueStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Under Review",
      "In Progress",
      "Resolved",
      "Rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid issue status.",
      });
    }

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Civic issue not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Issue status updated successfully.",
      issue,
    });
  } catch (error) {
    console.error("Update status error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to update issue status.",
    });
  }
};

// ======================================
// ADMIN DASHBOARD STATISTICS
// ======================================

export const getDashboardStats = async (req, res) => {
  try {
    const totalIssues = await Issue.countDocuments();

    const pendingIssues = await Issue.countDocuments({
      status: "Pending",
    });

    const underReviewIssues = await Issue.countDocuments({
      status: "Under Review",
    });

    const inProgressIssues = await Issue.countDocuments({
      status: "In Progress",
    });

    const resolvedIssues = await Issue.countDocuments({
      status: "Resolved",
    });

    const rejectedIssues = await Issue.countDocuments({
      status: "Rejected",
    });

    const highPriorityIssues = await Issue.countDocuments({
      priority: { $in: ["High", "Critical"] },
    });

    res.status(200).json({
      success: true,
      statistics: {
        totalIssues,
        pendingIssues,
        underReviewIssues,
        inProgressIssues,
        resolvedIssues,
        rejectedIssues,
        highPriorityIssues,
      },
    });
  } catch (error) {
    console.error("Dashboard statistics error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to fetch dashboard statistics.",
    });
  }
};

// ======================================
// RESOLVE CIVIC ISSUE
// ======================================

export const resolveIssue = async (req, res) => {
  try {
    const { resolutionRemarks } = req.body;

    if (
      !resolutionRemarks ||
      typeof resolutionRemarks !== "string" ||
      !resolutionRemarks.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide resolution remarks.",
      });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: "Civic issue not found.",
      });
    }

    const files = req.files || {};

    const beforeFile = files.beforeImage?.[0];
    const afterFile = files.afterImage?.[0];

    if (!beforeFile || !afterFile) {
      return res.status(400).json({
        success: false,
        message: "Both before and after images are required.",
      });
    }

    // Upload BEFORE resolution image
    const beforeUpload = await uploadToCloudinary(
      beforeFile.buffer,
      "before-resolution"
    );

    // Upload AFTER resolution image
    const afterUpload = await uploadToCloudinary(
      afterFile.buffer,
      "after-resolution"
    );

    // Save resolution details
    issue.beforeImage = {
      url: beforeUpload.url,
      publicId: beforeUpload.publicId,
    };

    issue.afterImage = {
      url: afterUpload.url,
      publicId: afterUpload.publicId,
    };

    issue.resolutionRemarks = resolutionRemarks.trim();
    issue.status = "Resolved";
    issue.resolvedAt = new Date();

    await issue.save();

    res.status(200).json({
      success: true,
      message: "Civic issue resolved successfully.",
      issue,
    });
  } catch (error) {
    console.error("Resolve issue error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to resolve civic issue.",
    });
  }
};