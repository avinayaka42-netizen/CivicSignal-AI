import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true
    },

    category: {
      type: String,
      enum: [
        "Road Damage",
        "Garbage",
        "Water Leakage",
        "Drainage",
        "Streetlight",
        "Other"
      ],
      default: "Other"
    },

    images: [
      {
        type: String
      }
    ],

    location: {
      address: {
        type: String,
        default: ""
      },

      latitude: {
        type: Number,
        required: true
      },

      longitude: {
        type: Number,
        required: true
      }
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Under Review",
        "In Progress",
        "Resolved",
        "Rejected"
      ],
      default: "Pending"
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium"
    },

    priorityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    aiAnalysis: {
      type: String,
      default: ""
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // BEFORE RESOLUTION IMAGE
    beforeImage: {
      url: {
        type: String,
        default: ""
      },
      publicId: {
        type: String,
        default: ""
      }
    },

    // AFTER RESOLUTION IMAGE
    afterImage: {
      url: {
        type: String,
        default: ""
      },
      publicId: {
        type: String,
        default: ""
      }
    },

    // RESOLUTION REMARKS
    resolutionRemarks: {
      type: String,
      default: ""
    },

    // RESOLUTION DATE
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Issue = mongoose.model("Issue", issueSchema);

export default Issue;