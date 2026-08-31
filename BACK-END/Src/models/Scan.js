const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    ruleId: {
      type: String,
      default: "custom-rule",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    severity: {
      type: String,
      enum: [
        "critical",
        "high",
        "medium",
        "low",
        "info",
      ],
      default: "medium",
    },

    confidence: {
      type: String,
      enum: [
        "high",
        "medium",
        "low",
      ],
      default: "medium",
    },

    line: {
      type: Number,
      min: 1,
      default: 1,
    },

    recommendation: {
      type: String,
      trim: true,
      default: "",
    },

    owasp: {
      id: {
        type: String,
        default: "Not applicable",
      },

      category: {
        type: String,
        default: "Not applicable",
      },
    },

    cwe: {
      type: String,
      default: "Not applicable",
    },
  },
  {
    _id: false,
  },
);

const aiFindingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
    },

    severity: {
      type: String,
      enum: [
        "critical",
        "high",
        "medium",
        "low",
        "info",
      ],
      default: "info",
    },

    confidence: {
      type: String,
      enum: [
        "high",
        "medium",
        "low",
      ],
      default: "medium",
    },

    line: {
      type: Number,
      default: 1,
    },

    explanation: {
      type: String,
      default: "",
    },

    impact: {
      type: String,
      default: "",
    },

    recommendation: {
      type: String,
      default: "",
    },

    secureExample: {
      type: String,
      default: "",
    },

    owasp: {
      id: {
        type: String,
        default: "Not applicable",
      },

      category: {
        type: String,
        default: "Not applicable",
      },
    },

    cwe: {
      type: String,
      default: "Not applicable",
    },
  },
  {
    _id: false,
  },
);

const scanSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sourceType: {
      type: String,
      enum: [
        "paste",
        "file",
        "zip",
        "repository",
      ],
      default: "paste",
    },

    fileName: {
      type: String,
      trim: true,
      default: "pasted-code",
    },

    language: {
      type: String,
      trim: true,
      lowercase: true,
      default: "unknown",
    },

    code: {
      type: String,
      required: true,
      select: false,
    },

    status: {
      type: String,
      enum: [
        "queued",
        "processing",
        "completed",
        "failed",
      ],
      default: "queued",
    },

    securityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    issueCount: {
      critical: {
        type: Number,
        default: 0,
      },

      high: {
        type: Number,
        default: 0,
      },

      medium: {
        type: Number,
        default: 0,
      },

      low: {
        type: Number,
        default: 0,
      },

      info: {
        type: Number,
        default: 0,
      },
    },

    issues: {
      type: [issueSchema],
      default: [],
    },

    aiReview: {
      available: {
        type: Boolean,
        default: false,
      },

      summary: {
        type: String,
        default: "",
      },

      riskLevel: {
        type: String,
        enum: [
          "critical",
          "high",
          "medium",
          "low",
          "safe",
          "unknown",
        ],
        default: "unknown",
      },

      priorityActions: {
        type: [String],
        default: [],
      },

      detailedFindings: {
        type: [aiFindingSchema],
        default: [],
      },

      codeQualitySuggestions: {
        type: [String],
        default: [],
      },

      finalChecklist: {
        type: [String],
        default: [],
      },

      error: {
        type: String,
        default: null,
      },
    },

    errorMessage: {
      type: String,
      default: null,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

scanSchema.index({
  owner: 1,
  createdAt: -1,
});

scanSchema.index({
  project: 1,
  createdAt: -1,
});

const Scan =
  mongoose.models.Scan ||
  mongoose.model(
    "Scan",
    scanSchema,
  );

module.exports = Scan;