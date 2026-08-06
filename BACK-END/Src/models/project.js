const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    primaryLanguage: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 40,
      default: "unknown",
    },

    sourceType: {
      type: String,
      enum: ["paste", "file", "zip", "repository"],
      default: "paste",
    },

    repositoryUrl: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "ready", "scanning", "completed", "failed"],
      default: "draft",
    },

    latestSecurityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    totalScans: {
      type: Number,
      min: 0,
      default: 0,
    },

    lastScannedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

projectSchema.index({
  owner: 1,
  createdAt: -1,
});

projectSchema.index({
  owner: 1,
  name: 1,
});

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;