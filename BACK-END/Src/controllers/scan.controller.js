const fs = require("fs");

const {
  generateGeminiReview,
} = require("../services/geminiReview.service");

const Project = require("../models/Project");
const Scan = require("../models/Scan");
const ZipProjectFile = require("../models/ZipProjectFile");

const {
  analyzeCodeLocally,
} = require("../services/localScan.service");

const {
  inspectZipArchive,
} = require("../services/zipScan.service");

const {
  storeZipArchiveFromFile,
  deleteZipArchive,
} = require("../services/zipArchiveStorage.service");

const MAX_CODE_LINES = 25100;
const MAX_CODE_BYTES = 5 * 1024 * 1024;

const SEVERITY_WEIGHTS = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 1,
};

const GEMINI_REVIEW_MODES = new Set([
  "findings",
  "sensitive",
  "remaining",
  "off",
]);

function countLines(code = "") {
  const text = String(code || "");

  if (!text) {
    return 0;
  }

  const lines = text.replace(/\r\n/g, "\n").split("\n");

  while (
    lines.length > 1 &&
    lines[lines.length - 1] === ""
  ) {
    lines.pop();
  }

  return lines.length;
}

function booleanHeader(value, fallback = true) {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  return (
    String(value).toLowerCase() ===
    "true"
  );
}

function readScanSettings(request) {
  const allowedProfiles = new Set([
    "quick",
    "balanced",
    "deep",
  ]);

  const allowedSeverities = new Set([
    "info",
    "low",
    "medium",
    "high",
    "critical",
  ]);

  const allowedAiModes = new Set([
    "quick",
    "standard",
    "detailed",
  ]);

  let scanProfile = String(
    request.get(
      "X-CodeGuard-Scan-Profile",
    ) || "balanced",
  ).toLowerCase();

  let minimumSeverity = String(
    request.get(
      "X-CodeGuard-Min-Severity",
    ) || "info",
  ).toLowerCase();

  let aiReviewMode = String(
    request.get(
      "X-CodeGuard-AI-Mode",
    ) || "standard",
  ).toLowerCase();

  if (!allowedProfiles.has(scanProfile)) {
    scanProfile = "balanced";
  }

  if (!allowedSeverities.has(minimumSeverity)) {
    minimumSeverity = "info";
  }

  if (!allowedAiModes.has(aiReviewMode)) {
    aiReviewMode = "standard";
  }

  return {
    scanProfile,
    minimumSeverity,
    aiReviewMode,
    secureCodeExamples: booleanHeader(
      request.get(
        "X-CodeGuard-Secure-Examples",
      ),
      true,
    ),
    showOwasp: booleanHeader(
      request.get(
        "X-CodeGuard-Show-OWASP",
      ),
      true,
    ),
    showCwe: booleanHeader(
      request.get(
        "X-CodeGuard-Show-CWE",
      ),
      true,
    ),
  };
}

function readGeminiReviewMode(request) {
  const rawMode = String(
    request.body?.geminiReviewMode ||
      "findings",
  )
    .trim()
    .toLowerCase();

  return GEMINI_REVIEW_MODES.has(rawMode)
    ? rawMode
    : "findings";
}

function normalizeIssueDescription(issue = {}) {
  const descriptionCandidates = [
    issue.description,
    issue.message,
    issue.details,
    issue.explanation,
    issue.title,
    issue.name,
    issue.rule,
    issue.ruleId,
  ];

  const description =
    descriptionCandidates.find(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== "",
    ) ||
    "Security issue detected by CodeGuard.";

  return {
    ...issue,
    description: String(description),
  };
}

function applyMappingPreferences(
  issues = [],
  settings,
) {
  return issues.map((issue) =>
    normalizeIssueDescription({
      ...issue,
      owasp: settings.showOwasp
        ? issue.owasp
        : {
            id: "Not applicable",
            category: "Not applicable",
          },
      cwe: settings.showCwe
        ? issue.cwe
        : "Not applicable",
    }),
  );
}

function normalizeSeverity(severity) {
  const value = String(
    severity || "info",
  ).toLowerCase();

  return Object.prototype.hasOwnProperty.call(
    SEVERITY_WEIGHTS,
    value,
  )
    ? value
    : "info";
}

function createIssueCount() {
  return {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
}

function calculateIssueCount(issues = []) {
  const count = createIssueCount();

  for (const issue of issues) {
    const severity = normalizeSeverity(
      issue.severity,
    );

    count[severity] += 1;
  }

  return count;
}

function calculateSecurityScore(issues = []) {
  let penalty = 0;

  for (const issue of issues) {
    const severity = normalizeSeverity(
      issue.severity,
    );

    penalty +=
      SEVERITY_WEIGHTS[severity];
  }

  return Math.max(
    0,
    Math.min(100, 100 - penalty),
  );
}

function getIssueTotal(issueCount = {}) {
  return (
    (issueCount.critical || 0) +
    (issueCount.high || 0) +
    (issueCount.medium || 0) +
    (issueCount.low || 0) +
    (issueCount.info || 0)
  );
}

function normalizeZipPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^(\.\.\/)+/, "")
    .trim();
}

function isUnsafeZipPath(value) {
  const filePath = String(value || "");

  if (
    !filePath ||
    filePath.includes("\0") ||
    filePath.startsWith("/") ||
    filePath.startsWith("\\\\") ||
    /^[A-Za-z]:[\\/]/.test(filePath)
  ) {
    return true;
  }

  return filePath
    .split(/[\\/]+/)
    .includes("..");
}

function createZipManifest(archive) {
  return JSON.stringify({
    archiveName: archive.archiveName,
    files: archive.files.map(
      (file) => ({
        path: file.path,
        fileName: file.fileName,
        language: file.language,
        lineCount: file.lineCount,
        sizeBytes: file.sizeBytes,
      }),
    ),
    metadata: archive.metadata,
  });
}

function chooseGeminiFile(files = []) {
  if (!files.length) {
    return null;
  }

  return [...files].sort((a, b) => {
    const critical =
      (b.issueCount?.critical || 0) -
      (a.issueCount?.critical || 0);

    if (critical !== 0) {
      return critical;
    }

    const high =
      (b.issueCount?.high || 0) -
      (a.issueCount?.high || 0);

    if (high !== 0) {
      return high;
    }

    const score =
      (a.securityScore ?? 100) -
      (b.securityScore ?? 100);

    if (score !== 0) {
      return score;
    }

    return (
      getIssueTotal(b.issueCount) -
      getIssueTotal(a.issueCount)
    );
  })[0];
}

function isSecuritySensitiveFile(file = {}) {
  const pathValue = String(
    file.path ||
      file.fileName ||
      "",
  ).toLowerCase();

  const code = String(
    file.code || "",
  ).toLowerCase();

  const pathPatterns = [
    /(^|\/)(auth|authentication|authorization|security)(\/|\.|$)/,
    /(login|signin|signup|register|session|permission|role)/,
    /(password|secret|credential|token|jwt|apikey|api-key)/,
    /(crypto|cryptography|encryption|decrypt|hash|bcrypt|argon)/,
    /(admin|middleware|access-control|acl)/,
    /(database|db|connection|repository|model)/,
    /(config|configuration|environment|\.env)/,
    /(route|routes|controller|service)/,
  ];

  if (
    pathPatterns.some((pattern) =>
      pattern.test(pathValue),
    )
  ) {
    return true;
  }

  const codePatterns = [
    /\bpassword\b/,
    /\bpasswd\b/,
    /\bsecret\b/,
    /\bapi[\-_]?key\b/,
    /\baccess[\-_]?token\b/,
    /\brefresh[\-_]?token\b/,
    /\bjsonwebtoken\b/,
    /\bjwt\b/,
    /\bbcrypt\b/,
    /\bargon2\b/,
    /\bcrypto\b/,
    /\bdecrypt\b/,
    /\bencrypt\b/,
    /\bsql\b/,
    /\bquery\s*\(/,
    /\beval\s*\(/,
    /\bexec\s*\(/,
    /\bspawn\s*\(/,
    /\bchild_process\b/,
    /\bpermission\b/,
    /\bauthorization\b/,
    /\bauthentication\b/,
    /\bsession\b/,
  ];

  return codePatterns.some((pattern) =>
    pattern.test(code),
  );
}

function selectGeminiFiles(
  files = [],
  mode = "findings",
) {
  if (mode === "off") {
    return [];
  }

  if (mode === "findings") {
    return files
      .filter(
        (file) =>
          getIssueTotal(
            file.issueCount,
          ) > 0 ||
          (Array.isArray(file.issues) &&
            file.issues.length > 0),
      )
      .sort(
        (a, b) =>
          getIssueTotal(
            b.issueCount,
          ) -
          getIssueTotal(
            a.issueCount,
          ),
      );
  }

  if (mode === "sensitive") {
    return files.filter((file) =>
      isSecuritySensitiveFile(file),
    );
  }

  if (mode === "remaining") {
    return files.filter((file) => {
      const hasFindings =
        getIssueTotal(
          file.issueCount,
        ) > 0 ||
        (Array.isArray(file.issues) &&
          file.issues.length > 0);

      const isSensitive =
        isSecuritySensitiveFile(file);

      return (
        !hasFindings &&
        !isSensitive
      );
    });
  }

  return [];
}

async function generateGeminiReviewsForFiles({
  files = [],
  mode,
  settings,
}) {
  const selectedFiles =
    selectGeminiFiles(
      files,
      mode,
    );

  if (!selectedFiles.length) {
    return [];
  }

  const reviews = [];

  for (const file of selectedFiles) {
    try {
      const review =
        await generateGeminiReview({
          language: file.language,
          fileName: file.path,
          code: file.code,
          securityScore:
            file.securityScore,
          issueCount:
            file.issueCount,
          issues: file.issues,
          mode: settings.aiReviewMode,
          secureCodeExamples:
            settings.secureCodeExamples,
          showOwasp:
            settings.showOwasp,
          showCwe:
            settings.showCwe,
        });

      reviews.push({
        filePath: file.path,
        fileName: file.fileName,
        language: file.language,
        review,
      });
    } catch (error) {
      console.error(
        `Gemini review failed for ${file.path}:`,
        error.message,
      );

      reviews.push({
        filePath: file.path,
        fileName: file.fileName,
        language: file.language,
        review: null,
        error:
          error.message ||
          "Gemini review failed.",
      });
    }
  }

  return reviews;
}

function serializeZipFile(
  file,
  includeCode = false,
) {
  const source =
    typeof file?.toObject ===
    "function"
      ? file.toObject()
      : file || {};

  const result = {
    _id: source._id,
    path: source.path,
    fileName: source.fileName,
    language: source.language,
    lineCount: source.lineCount,
    sizeBytes: source.sizeBytes,
    originalSizeBytes:
      source.originalSizeBytes,
    securityScore:
      source.securityScore,
    issueCount:
      source.issueCount,
    issueTotal:
      source.issueTotal,
    issues: Array.isArray(
      source.issues,
    )
      ? source.issues.map(
          normalizeIssueDescription,
        )
      : [],
    modified: Boolean(
      source.modified,
    ),
    verified: Boolean(
      source.verified,
    ),
    verificationCount:
      source.verificationCount || 0,
    lastVerifiedAt:
      source.lastVerifiedAt || null,
    updatedAt: source.updatedAt,
  };

  if (includeCode) {
    result.code =
      source.currentCode || "";
    result.currentCode =
      source.currentCode || "";
  }

  return result;
}

async function findOwnedZipScan(
  scanId,
  ownerId,
) {
  const scan =
    await Scan.findOne({
      _id: scanId,
      owner: ownerId,
    });

  if (!scan) {
    return {
      scan: null,
      error: "Scan not found",
      status: 404,
    };
  }

  if (scan.sourceType !== "zip") {
    return {
      scan: null,
      error:
        "This operation is only available for ZIP project scans.",
      status: 400,
    };
  }

  return {
    scan,
    error: null,
    status: 200,
  };
}

const createPasteCodeScan = async (
  request,
  response,
) => {
  const {
    projectId,
    code,
    language,
    fileName,
  } = request.body;

  const sourceCode = String(
    code || "",
  );

  const lineCount =
    countLines(sourceCode);

  const byteSize =
    Buffer.byteLength(
      sourceCode,
      "utf8",
    );

  if (
    lineCount >
    MAX_CODE_LINES
  ) {
    return response
      .status(413)
      .json({
        success: false,
        message: `Maximum supported source size is ${MAX_CODE_LINES.toLocaleString()} lines. This source contains ${lineCount.toLocaleString()} lines.`,
      });
  }

  if (
    byteSize >
    MAX_CODE_BYTES
  ) {
    return response
      .status(413)
      .json({
        success: false,
        message:
          "Source code exceeds the 5 MB scanning limit.",
      });
  }

  const settings =
    readScanSettings(request);

  const project =
    await Project.findOne({
      _id: projectId,
      owner: request.user._id,
    });

  if (!project) {
    return response
      .status(404)
      .json({
        success: false,
        message:
          "Project not found",
      });
  }

  const scan =
    await Scan.create({
      project: project._id,
      owner: request.user._id,
      sourceType: "paste",
      fileName,
      language,
      code: sourceCode,
      status: "processing",
      startedAt: new Date(),
    });

  try {
    const rawResult =
      analyzeCodeLocally(
        sourceCode,
        {
          profile:
            settings.scanProfile,
          minimumSeverity:
            settings.minimumSeverity,
          language,
          filePath:
            fileName || "",
        },
      );

    const result = {
      ...rawResult,
      issues:
        applyMappingPreferences(
          rawResult.issues || [],
          settings,
        ),
    };

    result.issueCount =
      calculateIssueCount(
        result.issues,
      );

    result.securityScore =
      calculateSecurityScore(
        result.issues,
      );

    result.score =
      result.securityScore;

    const aiReview =
      await generateGeminiReview({
        language,
        fileName,
        code: sourceCode,
        securityScore:
          result.securityScore,
        issueCount:
          result.issueCount,
        issues: result.issues,
        mode:
          settings.aiReviewMode,
        secureCodeExamples:
          settings.secureCodeExamples,
        showOwasp:
          settings.showOwasp,
        showCwe:
          settings.showCwe,
      });

    scan.status = "completed";
    scan.securityScore =
      result.securityScore;
    scan.issueCount =
      result.issueCount;
    scan.issues =
      result.issues;
    scan.aiReview =
      aiReview;
    scan.completedAt =
      new Date();

    await scan.save();

    project.status =
      "completed";

    project.latestSecurityScore =
      result.securityScore;

    project.totalScans =
      (project.totalScans || 0) + 1;

    project.lastScannedAt =
      new Date();

    await project.save();

    return response
      .status(201)
      .json({
        success: true,
        message:
          "Code analysis completed successfully",
        scan,
        scanMetadata: {
          lineCount,
          fileSizeBytes:
            byteSize,
          fileSizeKB:
            Math.ceil(
              byteSize / 1024,
            ),
          scannedEntireFile:
            true,
        },
        appliedSettings: {
          scanProfile:
            settings.scanProfile,
          minimumSeverity:
            settings.minimumSeverity,
          aiReviewMode:
            settings.aiReviewMode,
        },
      });
  } catch (error) {
    console.error(
      "SCAN CONTROLLER ERROR:",
      error,
    );

    scan.status =
      "failed";

    scan.completedAt =
      new Date();

    try {
      await scan.save();
    } catch (saveError) {
      console.error(
        "Failed to save failed scan:",
        saveError.message,
      );
    }

    return response
      .status(500)
      .json({
        success: false,
        message:
          process.env.NODE_ENV ===
          "production"
            ? "Code analysis failed"
            : error.message,
      });
  }
};

const createZipCodeScan = async (
  request,
  response,
) => {
  let scan = null;
  let storedArchive = null;
  let temporaryZipPath = null;

  try {
    if (
      !request.file ||
      !request.file.path
    ) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "Select a ZIP project before starting the scan.",
        });
    }

    temporaryZipPath =
      request.file.path;

    const projectId =
      String(
        request.body?.projectId ||
          "",
      ).trim();

    if (!projectId) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "Project ID is required.",
        });
    }

    const settings =
      readScanSettings(request);

    const geminiReviewMode =
      readGeminiReviewMode(
        request,
      );

    const project =
      await Project.findOne({
        _id: projectId,
        owner:
          request.user._id,
      });

    if (!project) {
      return response
        .status(404)
        .json({
          success: false,
          message:
            "Project not found",
        });
    }

    const archive =
      inspectZipArchive({
        filePath:
          request.file.path,
        originalName:
          request.file.originalname,
      });

    scan =
      await Scan.create({
        project: project._id,
        owner: request.user._id,
        sourceType: "zip",
        fileName:
          request.file.originalname,
        language:
          "multi-language",
        code:
          createZipManifest(
            archive,
          ),
        status: "processing",
        startedAt: new Date(),
      });

    storedArchive =
      await storeZipArchiveFromFile({
        filePath:
          request.file.path,
        fileName:
          request.file.originalname,
        scanId: scan._id,
        projectId:
          project._id,
        ownerId:
          request.user._id,
      });

    const combinedIssues = [];
    const scannedFiles = [];

    let totalLines = 0;
    let totalSourceBytes = 0;

    for (
      const file of archive.files
    ) {
      const rawResult =
        analyzeCodeLocally(
          file.code,
          {
            profile:
              settings.scanProfile,
            minimumSeverity:
              settings.minimumSeverity,
            language:
              file.language,
            filePath:
              file.path,
          },
        );

      const mappedIssues =
        applyMappingPreferences(
          rawResult.issues || [],
          settings,
        ).map((issue) =>
          normalizeIssueDescription({
            ...issue,
            filePath:
              file.path,
            fileName:
              file.fileName,
            language:
              file.language,
          }),
        );

      const fileIssueCount =
        calculateIssueCount(
          mappedIssues,
        );

      const fileSecurityScore =
        calculateSecurityScore(
          mappedIssues,
        );

      console.log(
        `[CodeGuard] ${file.path} | language=${file.language} | issues=${mappedIssues.length} | score=${fileSecurityScore}`,
      );

      combinedIssues.push(
        ...mappedIssues,
      );

      totalLines +=
        Number(
          file.lineCount || 0,
        );

      totalSourceBytes +=
        Number(
          file.sizeBytes || 0,
        );

      scannedFiles.push({
        path: file.path,
        fileName:
          file.fileName,
        language:
          file.language,
        lineCount:
          file.lineCount,
        sizeBytes:
          file.sizeBytes,
        securityScore:
          fileSecurityScore,
        issueCount:
          fileIssueCount,
        issueTotal:
          getIssueTotal(
            fileIssueCount,
          ),
        issues:
          mappedIssues,
        code:
          file.code,
      });
    }

    const issueCount =
      calculateIssueCount(
        combinedIssues,
      );

    const securityScore =
      calculateSecurityScore(
        combinedIssues,
      );

    console.log(
      `[CodeGuard] ZIP FINAL | files=${scannedFiles.length} | issues=${combinedIssues.length} | score=${securityScore}`,
    );

    const selectedGeminiFiles =
      selectGeminiFiles(
        scannedFiles,
        geminiReviewMode,
      );

    const aiReviews =
      await generateGeminiReviewsForFiles({
        files:
          scannedFiles,
        mode:
          geminiReviewMode,
        settings,
      });

    let aiReview = null;

    if (aiReviews.length === 1) {
      aiReview =
        aiReviews[0].review;
    } else if (
      aiReviews.length > 1
    ) {
      aiReview = {
        mode:
          geminiReviewMode,
        totalReviewedFiles:
          aiReviews.length,
        reviews:
          aiReviews.map(
            (item) => ({
              filePath:
                item.filePath,
              fileName:
                item.fileName,
              language:
                item.language,
              review:
                item.review,
              error:
                item.error ||
                null,
            }),
          ),
      };
    }

    const reviewedFilePaths =
      new Set(
        aiReviews.map(
          (item) =>
            normalizeZipPath(
              item.filePath,
            ),
        ),
      );

    const fileResults =
      scannedFiles.map(
        ({
          code,
          issues,
          issueCount:
            fileIssueCount,
          ...file
        }) => ({
          ...file,
          issueTotal:
            getIssueTotal(
              fileIssueCount,
            ),
          issues:
            Array.isArray(issues)
              ? issues.map(
                  normalizeIssueDescription,
                )
              : [],
          geminiReviewed:
            reviewedFilePaths.has(
              normalizeZipPath(
                file.path,
              ),
            ),
        }),
      );

    scan.status =
      "completed";

    scan.securityScore =
      securityScore;

    scan.issueCount =
      issueCount;

    scan.issues =
      combinedIssues.map(
        normalizeIssueDescription,
      );

    scan.zipMetadata = {
      archiveStorageId:
        storedArchive.fileId,
      archiveStorageName:
        storedArchive.fileName,
      archiveStorageSize:
        storedArchive.sizeBytes,
      archiveName:
        archive.archiveName,
      totalArchiveEntries:
        archive.metadata
          .totalArchiveEntries,
      supportedFiles:
        archive.metadata
          .supportedFiles,
      skippedFiles:
        archive.metadata
          .skippedFiles,
      totalExtractedBytes:
        archive.metadata
          .totalExtractedBytes,
      totalSourceBytes,
      totalLines,
      languages:
        archive.metadata
          .languages,
      languageCounts:
        archive.metadata
          .languageCounts,
      files:
        fileResults,
      skipped:
        archive.skippedFiles,
      geminiReviewedFile:
        selectedGeminiFiles.length
          ? selectedGeminiFiles[0]
              .path
          : "",
      geminiReviewMode,
      geminiReviewedFiles:
        aiReviews.map(
          (item) =>
            item.filePath,
        ),
    };

    if (aiReview) {
      scan.aiReview =
        aiReview;
    }

    scan.completedAt =
      new Date();

    await scan.save();

    await ZipProjectFile.createForScan({
      scanId: scan._id,
      projectId: project._id,
      ownerId: request.user._id,
      files: scannedFiles,
    });

    project.status =
      "completed";

    project.latestSecurityScore =
      securityScore;

    project.totalScans =
      (project.totalScans || 0) + 1;

    project.lastScannedAt =
      new Date();

    await project.save();

    if (temporaryZipPath) {
      try {
        await fs.promises.unlink(
          temporaryZipPath,
        );

        temporaryZipPath = null;
      } catch (cleanupError) {
        console.error(
          "Failed to delete temporary ZIP:",
          cleanupError.message,
        );
      }
    }

    const storedZipMetadata =
      scan.zipMetadata?.toObject
        ? scan.zipMetadata.toObject()
        : scan.zipMetadata;

    return response
      .status(201)
      .json({
        success: true,
        message:
          "ZIP project analysis completed successfully",
        scan,
        zipMetadata: {
          ...storedZipMetadata,
          files:
            scannedFiles.map(
              (file) => ({
                ...file,
                issues:
                  Array.isArray(
                    file.issues,
                  )
                    ? file.issues.map(
                        normalizeIssueDescription,
                      )
                    : [],
              }),
            ),
          geminiReviewMode,
          geminiReviewedFiles:
            aiReviews.map(
              (item) =>
                item.filePath,
            ),
        },
        appliedSettings: {
          scanProfile:
            settings.scanProfile,
          minimumSeverity:
            settings.minimumSeverity,
          aiReviewMode:
            settings.aiReviewMode,
          geminiReviewMode,
        },
      });
  } catch (error) {
    console.error(
      "ZIP SCAN CONTROLLER ERROR:",
      error,
    );

    if (temporaryZipPath) {
      try {
        await fs.promises.unlink(
          temporaryZipPath,
        );
      } catch (cleanupError) {
        if (
          cleanupError.code !==
          "ENOENT"
        ) {
          console.error(
            "Failed to delete temporary ZIP:",
            cleanupError.message,
          );
        }
      }
    }

    if (scan) {
      scan.status =
        "failed";

      scan.completedAt =
        new Date();

      scan.errorMessage =
        error.message ||
        "ZIP project analysis failed";

      try {
        await ZipProjectFile.deleteMany({
          scan: scan._id,
        });
      } catch (cleanupError) {
        console.error(
          "Failed to clean ZIP project files:",
          cleanupError.message,
        );
      }

      if (
        storedArchive?.fileId
      ) {
        try {
          await deleteZipArchive({
            fileId:
              storedArchive.fileId,
          });

          storedArchive = null;

          if (scan.zipMetadata) {
            scan.zipMetadata.archiveStorageId =
              null;

            scan.zipMetadata.archiveStorageName =
              "";

            scan.zipMetadata.archiveStorageSize =
              0;
          }
        } catch (cleanupError) {
          console.error(
            "Failed to clean stored ZIP archive:",
            cleanupError.message,
          );
        }
      }

      try {
        await scan.save();
      } catch (saveError) {
        console.error(
          "Failed to save failed ZIP scan:",
          saveError.message,
        );
      }
    }

    const message = String(
      error.message || "",
    );

    const clientError =
      /zip|archive|source-code|supported|unsafe|too many|limit|empty|project id/i.test(
        message,
      );

    return response
      .status(
        clientError ? 400 : 500,
      )
      .json({
        success: false,
        message:
          process.env.NODE_ENV ===
            "production" &&
          !clientError
            ? "ZIP project analysis failed"
            : message ||
              "ZIP project analysis failed",
      });
  }
};

const getZipProjectFiles =
  async (
    request,
    response,
  ) => {
    try {
      const scanId =
        String(
          request.params?.scanId ||
            "",
        ).trim();

      const result =
        await findOwnedZipScan(
          scanId,
          request.user._id,
        );

      if (!result.scan) {
        return response
          .status(result.status)
          .json({
            success: false,
            message:
              result.error,
          });
      }

      const files =
        await ZipProjectFile.findForScan({
          scanId:
            result.scan._id,
          ownerId:
            request.user._id,
        });

      return response
        .status(200)
        .json({
          success: true,
          scanId:
            result.scan._id,
          archiveName:
            result.scan.zipMetadata
              ?.archiveName ||
            result.scan.fileName,
          files:
            files.map(
              (file) =>
                serializeZipFile(
                  file,
                ),
            ),
        });
    } catch (error) {
      console.error(
        "ZIP FILE LIST ERROR:",
        error,
      );

      if (
        error.name ===
        "CastError"
      ) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "Invalid scan ID.",
          });
      }

      return response
        .status(500)
        .json({
          success: false,
          message:
            process.env.NODE_ENV ===
            "production"
              ? "Unable to load ZIP project files"
              : error.message ||
                "Unable to load ZIP project files",
        });
    }
  };

const getZipProjectFileSource =
  async (
    request,
    response,
  ) => {
    try {
      const scanId =
        String(
          request.params?.scanId ||
            "",
        ).trim();

      const rawFilePath =
        String(
          request.query?.filePath ||
            "",
        ).trim();

      if (!rawFilePath) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "ZIP file path is required.",
          });
      }

      if (
        isUnsafeZipPath(
          rawFilePath,
        )
      ) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "Invalid ZIP file path.",
          });
      }

      const filePath =
        normalizeZipPath(
          rawFilePath,
        );

      const result =
        await findOwnedZipScan(
          scanId,
          request.user._id,
        );

      if (!result.scan) {
        return response
          .status(result.status)
          .json({
            success: false,
            message:
              result.error,
          });
      }

      const file =
        await ZipProjectFile.findFile({
          scanId:
            result.scan._id,
          ownerId:
            request.user._id,
          filePath,
        });

      if (!file) {
        return response
          .status(404)
          .json({
            success: false,
            message:
              "ZIP project file not found.",
          });
      }

      return response
        .status(200)
        .json({
          success: true,
          file:
            serializeZipFile(
              file,
              true,
            ),
        });
    } catch (error) {
      console.error(
        "ZIP FILE SOURCE ERROR:",
        error,
      );

      if (
        error.name ===
        "CastError"
      ) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "Invalid scan ID.",
          });
      }

      return response
        .status(500)
        .json({
          success: false,
          message:
            process.env.NODE_ENV ===
            "production"
              ? "Unable to load ZIP project file"
              : error.message ||
                "Unable to load ZIP project file",
        });
    }
  };

const verifyZipFile = async (
  request,
  response,
) => {
  try {
    const scanId =
      String(
        request.params?.scanId ||
          "",
      ).trim();

    const rawFilePath =
      String(
        request.body?.filePath ||
          "",
      ).trim();

    const sourceCode =
      String(
        request.body?.code || "",
      );

    const guardRemediation =
      request.body
        ?.guardRemediation === true;

    const targetRuleId =
      String(
        request.body?.targetRuleId ||
          "",
      ).trim();

    if (!rawFilePath) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "ZIP file path is required.",
        });
    }

    if (
      isUnsafeZipPath(
        rawFilePath,
      )
    ) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "Invalid ZIP file path.",
        });
    }

    const filePath =
      normalizeZipPath(
        rawFilePath,
      );

    const lineCount =
      countLines(sourceCode);

    const byteSize =
      Buffer.byteLength(
        sourceCode,
        "utf8",
      );

    if (
      lineCount >
      MAX_CODE_LINES
    ) {
      return response
        .status(413)
        .json({
          success: false,
          message: `Maximum supported source size is ${MAX_CODE_LINES.toLocaleString()} lines. This source contains ${lineCount.toLocaleString()} lines.`,
        });
    }

    if (
      byteSize >
      MAX_CODE_BYTES
    ) {
      return response
        .status(413)
        .json({
          success: false,
          message:
            "Source code exceeds the 5 MB scanning limit.",
        });
    }

    const result =
      await findOwnedZipScan(
        scanId,
        request.user._id,
      );

    if (!result.scan) {
      return response
        .status(result.status)
        .json({
          success: false,
          message:
            result.error,
        });
    }

    const scan =
      result.scan;

    const persistedFile =
      await ZipProjectFile.findFile({
        scanId:
          scan._id,
        ownerId:
          request.user._id,
        filePath,
      });

    if (!persistedFile) {
      return response
        .status(404)
        .json({
          success: false,
          message:
            "The selected file does not belong to this ZIP scan or was created before persistent ZIP storage was enabled.",
        });
    }

    const language =
      String(
        persistedFile.language ||
          "",
      ).toLowerCase();

    if (!language) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "The selected ZIP file does not have a supported language.",
        });
    }

    const settings =
      readScanSettings(request);

    const rawResult =
      analyzeCodeLocally(
        sourceCode,
        {
          profile:
            settings.scanProfile,
          minimumSeverity:
            settings.minimumSeverity,
          language,
          filePath,
        },
      );

    const mappedIssues =
      applyMappingPreferences(
        rawResult.issues || [],
        settings,
      ).map((issue) =>
        normalizeIssueDescription({
          ...issue,
          filePath,
          fileName:
            persistedFile.fileName,
          language,
        }),
      );

    const issueCount =
      calculateIssueCount(
        mappedIssues,
      );

    const securityScore =
      calculateSecurityScore(
        mappedIssues,
      );

    const issueTotal =
      getIssueTotal(
        issueCount,
      );

    const previousIssues =
      Array.isArray(
        persistedFile.issues,
      )
        ? persistedFile.issues.map(
            normalizeIssueDescription,
          )
        : [];

    const previousIssueCount =
      calculateIssueCount(
        previousIssues,
      );

    const previousIssueTotal =
      getIssueTotal(
        previousIssueCount,
      );

    const previousSecurityScore =
      calculateSecurityScore(
        previousIssues,
      );

    const calculatePenalty =
      (counts = {}) =>
        Object.entries(
          SEVERITY_WEIGHTS,
        ).reduce(
          (
            total,
            [
              severity,
              weight,
            ],
          ) =>
            total +
            Number(
              counts?.[
                severity
              ] || 0,
            ) * weight,
          0,
        );

    const beforePenalty =
      calculatePenalty(
        previousIssueCount,
      );

    const afterPenalty =
      calculatePenalty(
        issueCount,
      );

    const targetBeforePresent =
      Boolean(
        targetRuleId &&
          previousIssues.some(
            (issue) =>
              String(
                issue?.ruleId ||
                  "",
              ) ===
              targetRuleId,
          ),
      );

    const targetAfterPresent =
      Boolean(
        targetRuleId &&
          mappedIssues.some(
            (issue) =>
              String(
                issue?.ruleId ||
                  "",
              ) ===
              targetRuleId,
          ),
      );

    const targetResolved =
      targetBeforePresent &&
      !targetAfterPresent;

    const worsenedTotal =
      issueTotal >
      previousIssueTotal;

    const worsenedPenalty =
      afterPenalty >
      beforePenalty;

    const worsenedScore =
      securityScore <
      previousSecurityScore;

    const noImprovement =
      !targetRuleId &&
      issueTotal >=
        previousIssueTotal &&
      afterPenalty >=
        beforePenalty;

    const targetFailed =
      targetBeforePresent &&
      targetAfterPresent;

    const remediationAccepted =
      !guardRemediation ||
      (!worsenedTotal &&
        !worsenedPenalty &&
        !worsenedScore &&
        !targetFailed &&
        !noImprovement);

    const remediation = {
      guarded:
        guardRemediation,
      accepted:
        remediationAccepted,
      targetRuleId:
        targetRuleId || null,
      targetResolved,
      beforeIssueTotal:
        previousIssueTotal,
      afterIssueTotal:
        issueTotal,
      beforeIssueCount:
        previousIssueCount,
      afterIssueCount:
        issueCount,
      beforeSecurityScore:
        previousSecurityScore,
      afterSecurityScore:
        securityScore,
      beforePenalty,
      afterPenalty,
    };

    if (!remediationAccepted) {
      const rejectionReasons = [];

      if (targetFailed) {
        rejectionReasons.push(
          "the targeted finding is still present",
        );
      }

      if (worsenedTotal) {
        rejectionReasons.push(
          "the total number of findings increased",
        );
      }

      if (worsenedPenalty) {
        rejectionReasons.push(
          "the weighted severity became worse",
        );
      }

      if (worsenedScore) {
        rejectionReasons.push(
          "the security score decreased",
        );
      }

      if (noImprovement) {
        rejectionReasons.push(
          "the candidate did not improve the deterministic scan",
        );
      }

      return response
        .status(200)
        .json({
          success: true,
          accepted: false,
          message:
            `Secure fix rejected because ${rejectionReasons.join(
              " and ",
            )}. Your previously verified code was preserved.`,
          remediation,
          file:
            serializeZipFile(
              persistedFile,
              true,
            ),
          candidate: {
            securityScore,
            issueCount,
            issueTotal,
            issues:
              mappedIssues.map(
                normalizeIssueDescription,
              ),
          },
          scan: {
            _id: scan._id,
            sourceType:
              scan.sourceType,
            securityScore:
              scan.securityScore,
            issueCount:
              scan.issueCount,
            issues:
              Array.isArray(
                scan.issues,
              )
                ? scan.issues.map(
                    normalizeIssueDescription,
                  )
                : [],
            zipMetadata:
              scan.zipMetadata,
          },
        });
    }

    await persistedFile.verifyCode({
      code: sourceCode,
      issues:
        mappedIssues.map(
          normalizeIssueDescription,
        ),
      issueCount,
      issueTotal,
      securityScore,
      lineCount,
      sizeBytes:
        byteSize,
    });

    const scanIssues =
      Array.isArray(
        scan.issues,
      )
        ? scan.issues.map(
            normalizeIssueDescription,
          )
        : [];

    const otherIssues =
      scanIssues.filter(
        (issue) =>
          normalizeZipPath(
            issue.filePath ||
              "",
          ) !== filePath,
      );

    const combinedIssues = [
      ...otherIssues,
      ...mappedIssues.map(
        normalizeIssueDescription,
      ),
    ];

    const aggregateIssueCount =
      calculateIssueCount(
        combinedIssues,
      );

    const aggregateSecurityScore =
      calculateSecurityScore(
        combinedIssues,
      );

    const zipFiles =
      Array.isArray(
        scan.zipMetadata?.files,
      )
        ? scan.zipMetadata.files
        : [];

    const updatedFiles =
      zipFiles.map(
        (file) => {
          if (
            normalizeZipPath(
              file.path || "",
            ) !== filePath
          ) {
            return file;
          }

          const current =
            typeof file.toObject ===
            "function"
              ? file.toObject()
              : file;

          return {
            ...current,
            lineCount,
            sizeBytes:
              byteSize,
            securityScore,
            issueCount,
            issueTotal,
            issues:
              mappedIssues.map(
                normalizeIssueDescription,
              ),
            modified:
              persistedFile.modified,
            verified: true,
            verificationCount:
              persistedFile.verificationCount,
            lastVerifiedAt:
              persistedFile.lastVerifiedAt,
          };
        },
      );

    scan.issues =
      combinedIssues.map(
        normalizeIssueDescription,
      );

    scan.issueCount =
      aggregateIssueCount;

    scan.securityScore =
      aggregateSecurityScore;

    scan.zipMetadata.files =
      updatedFiles;

    scan.completedAt =
      new Date();

    await scan.save();

    const project =
      await Project.findOne({
        _id: scan.project,
        owner:
          request.user._id,
      });

    if (project) {
      project.latestSecurityScore =
        aggregateSecurityScore;

      project.lastScannedAt =
        new Date();

      await project.save();
    }

    return response
      .status(200)
      .json({
        success: true,
        accepted: true,
        message:
          mappedIssues.length === 0
            ? guardRemediation
              ? "Secure fix verified and accepted. No remaining security findings in this file."
              : "ZIP project file verified and saved. No remaining security findings."
            : guardRemediation
              ? `Secure fix verified and accepted. ${mappedIssues.length} ${
                  mappedIssues.length === 1
                    ? "finding remains"
                    : "findings remain"
                }.`
              : `ZIP project file verified and saved. ${mappedIssues.length} ${
                  mappedIssues.length === 1
                    ? "finding remains"
                    : "findings remain"
                }.`,
        remediation,
        file: {
          path: filePath,
          fileName:
            persistedFile.fileName,
          language,
          code: sourceCode,
          currentCode:
            sourceCode,
          lineCount,
          sizeBytes:
            byteSize,
          securityScore,
          issueCount,
          issueTotal,
          issues:
            mappedIssues.map(
              normalizeIssueDescription,
            ),
          modified:
            persistedFile.modified,
          verified: true,
          verificationCount:
            persistedFile.verificationCount,
          lastVerifiedAt:
            persistedFile.lastVerifiedAt,
        },
        scan: {
          _id: scan._id,
          sourceType:
            scan.sourceType,
          securityScore:
            scan.securityScore,
          issueCount:
            scan.issueCount,
          issues:
            scan.issues.map(
              normalizeIssueDescription,
            ),
          zipMetadata:
            scan.zipMetadata,
        },
        appliedSettings: {
          scanProfile:
            settings.scanProfile,
          minimumSeverity:
            settings.minimumSeverity,
        },
      });
  } catch (error) {
    console.error(
      "ZIP FILE VERIFY ERROR:",
      error,
    );

    if (
      error.name ===
      "CastError"
    ) {
      return response
        .status(400)
        .json({
          success: false,
          message:
            "Invalid scan ID.",
        });
    }

    return response
      .status(500)
      .json({
        success: false,
        message:
          process.env.NODE_ENV ===
          "production"
            ? "ZIP file verification failed"
            : error.message ||
              "ZIP file verification failed",
      });
  }
};

const getScan = async (
  request,
  response,
) => {
  const scan =
    await Scan.findOne({
      _id:
        request.params.scanId,
      owner:
        request.user._id,
    });

  if (!scan) {
    return response
      .status(404)
      .json({
        success: false,
        message:
          "Scan not found",
      });
  }

  return response
    .status(200)
    .json({
      success: true,
      scan,
    });
};

const listProjectScans =
  async (
    request,
    response,
  ) => {
    const project =
      await Project.findOne({
        _id:
          request.params.projectId,
        owner:
          request.user._id,
      });

    if (!project) {
      return response
        .status(404)
        .json({
          success: false,
          message:
            "Project not found",
        });
    }

    const scans =
      await Scan.find({
        project:
          project._id,
        owner:
          request.user._id,
      }).sort({
        createdAt: -1,
      });

    return response
      .status(200)
      .json({
        success: true,
        scans,
      });
  };

module.exports = {
  createPasteCodeScan,
  createZipCodeScan,
  verifyZipFile,
  getZipProjectFiles,
  getZipProjectFileSource,
  getScan,
  listProjectScans,
};