const Project = require("../models/Project");
const Scan = require("../models/Scan");
const {
  analyzeCodeLocally,
} = require("../services/localScan.service");

const createPasteCodeScan = async (request, response) => {
  const { projectId, code, language, fileName } = request.body;

  const project = await Project.findOne({
    _id: projectId,
    owner: request.user._id,
  });

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  const scan = await Scan.create({
    project: project._id,
    owner: request.user._id,
    sourceType: "paste",
    fileName,
    language,
    code,
    status: "processing",
    startedAt: new Date(),
  });

  try {
    const result = analyzeCodeLocally(code);

    scan.status = "completed";
    scan.securityScore = result.securityScore;
    scan.issueCount = result.issueCount;
    scan.issues = result.issues;
    scan.completedAt = new Date();

    await scan.save();

    project.status = "completed";
    project.latestSecurityScore = result.securityScore;
    project.totalScans += 1;
    project.lastScannedAt = new Date();

    await project.save();

    return response.status(201).json({
      success: true,
      message: "Code analysis completed successfully",
      scan,
    });
  } catch (error) {
    scan.status = "failed";
    scan.errorMessage = error.message;
    scan.completedAt = new Date();

    await scan.save();

    return response.status(500).json({
      success: false,
      message: "Code analysis failed",
      scanId: scan._id,
    });
  }
};

const getScan = async (request, response) => {
  const scan = await Scan.findOne({
    _id: request.params.scanId,
    owner: request.user._id,
  });

  if (!scan) {
    return response.status(404).json({
      success: false,
      message: "Scan not found",
    });
  }

  return response.status(200).json({
    success: true,
    scan,
  });
};

const listProjectScans = async (request, response) => {
  const project = await Project.findOne({
    _id: request.params.projectId,
    owner: request.user._id,
  });

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  const scans = await Scan.find({
    project: project._id,
    owner: request.user._id,
  }).sort({
    createdAt: -1,
  });

  return response.status(200).json({
    success: true,
    scans,
  });
};

module.exports = {
  createPasteCodeScan,
  getScan,
  listProjectScans,
};