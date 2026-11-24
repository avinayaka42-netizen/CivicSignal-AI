import Issue from "../models/Issue.js";
import { analyzeIssueWithImage } from "../services/aiService.js";
import { uploadToCloudinary } from "../middleware/imageUpload.js";

// Calculate distance between two GPS coordinates in metres
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
};

// Calculate similarity between two descriptions
const calculateTextSimilarity = (text1, text2) => {
  const getWords = (text) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2)
    );

  const words1 = getWords(text1);
  const words2 = getWords(text2);

  if (words1.size === 0 || words2.size === 0) return 0;

  const commonWords = [...words1].filter((word) => words2.has(word));
  const totalWords = new Set([...words1, ...words2]);

  return commonWords.length / totalWords.size;
};

// Find possible duplicate reports
const findSimilarIssues = async (category, description, latitude, longitude) => {
  const recentIssues = await Issue.find({
    category,
    createdAt: {
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .select("title description category status location createdAt");

  const similarIssues = [];

  for (const existingIssue of recentIssues) {
    const distance = calculateDistance(
      latitude,
      longitude,
      existingIssue.location.latitude,
      existingIssue.location.longitude
    );

    const textSimilarity = calculateTextSimilarity(
      description,
      existingIssue.description
    );

    if (distance <= 150 && textSimilarity >= 0.25) {
      similarIssues.push({
        id: existingIssue._id,
        title: existingIssue.title,
        category: existingIssue.category,
        status: existingIssue.status,
        address: existingIssue.location.address,
        distance: Math.round(distance),
        similarity: Math.round(textSimilarity * 100)
      });
    }
  }

  return similarIssues;
};

// Create a new civic issue with mandatory image
export const createIssue = async (req, res) => {
  try {
    const {
      title,
      description,
      latitude,
      longitude,
      address
    } = req.body;

    // Validate required fields
    if (
      !title?.trim() ||
      !description?.trim() ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Title, description and location are required."
      });
    }

    // Image is mandatory
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an issue image before submitting."
      });
    }

    // Validate GPS coordinates
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS coordinates."
      });
    }

    const cleanDescription = description.trim();

    // Analyze description and uploaded image using Gemini
    const aiResult = await analyzeIssueWithImage(
      cleanDescription,
      req.file.buffer,
      req.file.mimetype
    );

    // Upload image to Cloudinary
    const uploadedImage = await uploadToCloudinary(
      req.file.buffer,
      "issues"
    );

    // Check for similar reports
    const potentialDuplicates = await findSimilarIssues(
      aiResult.category,
      cleanDescription,
      lat,
      lng
    );

    // Save issue and image URL in MongoDB
    const issue = await Issue.create({
      title: title.trim(),
      description: cleanDescription,

      category: aiResult.category,
      priority: aiResult.priority,
      priorityScore: aiResult.priorityScore,
      aiAnalysis: aiResult.analysis,

      images: [uploadedImage.url],

      location: {
        latitude: lat,
        longitude: lng,
        address: address || ""
      },

      reportedBy: req.user.id
    });

    return res.status(201).json({
      success: true,
      message: potentialDuplicates.length > 0
        ? "Report submitted. Similar reports were found nearby."
        : "Civic issue reported successfully.",

      issue,
      aiAnalysis: aiResult,
      imageAnalyzed: true,
      duplicateWarning: potentialDuplicates.length > 0,
      potentialDuplicates
    });

  } catch (error) {
    console.error("Create issue error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit civic issue."
    });
  }
};

// Get all issues reported by the logged-in citizen
export const getMyIssues = async (req, res) => {
  try {
    const issues = await Issue.find({
      reportedBy: req.user.id
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: issues.length,
      issues
    });

  } catch (error) {
    console.error("Get my issues error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your civic issues."
    });
  }
};