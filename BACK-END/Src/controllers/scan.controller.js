const {
  generateGeminiReview,
} = require(
  "../services/geminiReview.service",
);

const Project =
  require("../models/Project");

const Scan =
  require("../models/Scan");

const {
  analyzeCodeLocally,
} = require(
  "../services/localScan.service",
);

const MAX_CODE_LINES =
  25100;

const MAX_CODE_BYTES =
  5 * 1024 * 1024;

function countLines(
  code = "",
) {
  const text =
    String(code || "");

  if (!text) {
    return 0;
  }

  const lines =
    text
      .replace(
        /\r\n/g,
        "\n",
      )
      .split(
        "\n",
      );

  while (
    lines.length > 1 &&
    lines[
      lines.length - 1
    ] === ""
  ) {
    lines.pop();
  }

  return lines.length;
}

function booleanHeader(
  value,
  fallback = true,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  return (
    String(value)
      .toLowerCase() ===
    "true"
  );
}

function readScanSettings(
  request,
) {
  const allowedProfiles =
    new Set([
      "quick",
      "balanced",
      "deep",
    ]);

  const allowedSeverities =
    new Set([
      "info",
      "low",
      "medium",
      "high",
      "critical",
    ]);

  const allowedAiModes =
    new Set([
      "quick",
      "standard",
      "detailed",
    ]);

  let scanProfile =
    String(
      request.get(
        "X-CodeGuard-Scan-Profile",
      ) || "balanced",
    ).toLowerCase();

  let minimumSeverity =
    String(
      request.get(
        "X-CodeGuard-Min-Severity",
      ) || "info",
    ).toLowerCase();

  let aiReviewMode =
    String(
      request.get(
        "X-CodeGuard-AI-Mode",
      ) || "standard",
    ).toLowerCase();

  if (
    !allowedProfiles.has(
      scanProfile,
    )
  ) {
    scanProfile =
      "balanced";
  }

  if (
    !allowedSeverities.has(
      minimumSeverity,
    )
  ) {
    minimumSeverity =
      "info";
  }

  if (
    !allowedAiModes.has(
      aiReviewMode,
    )
  ) {
    aiReviewMode =
      "standard";
  }

  return {
    scanProfile,

    minimumSeverity,

    aiReviewMode,

    secureCodeExamples:
      booleanHeader(
        request.get(
          "X-CodeGuard-Secure-Examples",
        ),
        true,
      ),

    showOwasp:
      booleanHeader(
        request.get(
          "X-CodeGuard-Show-OWASP",
        ),
        true,
      ),

    showCwe:
      booleanHeader(
        request.get(
          "X-CodeGuard-Show-CWE",
        ),
        true,
      ),
  };
}

function applyMappingPreferences(
  issues,
  settings,
) {
  return issues.map(
    (issue) => ({
      ...issue,

      owasp:
        settings.showOwasp
          ? issue.owasp
          : {
              id:
                "Not applicable",

              category:
                "Not applicable",
            },

      cwe:
        settings.showCwe
          ? issue.cwe
          : "Not applicable",
    }),
  );
}

const createPasteCodeScan =
  async (
    request,
    response,
  ) => {
    const {
      projectId,
      code,
      language,
      fileName,
    } = request.body;

    const sourceCode =
      String(code || "");

    const lineCount =
      countLines(
        sourceCode,
      );

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

          message:
            `Maximum supported source size is ${MAX_CODE_LINES.toLocaleString()} lines. This source contains ${lineCount.toLocaleString()} lines.`,
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
      readScanSettings(
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

    const scan =
      await Scan.create({
        project:
          project._id,

        owner:
          request.user._id,

        sourceType:
          "paste",

        fileName,

        language,

        code:
          sourceCode,

        status:
          "processing",

        startedAt:
          new Date(),
      });

    try {
      /*
       * IMPORTANT:
       * Local scanner receives the
       * entire source file.
       */
     const rawResult =
  analyzeCodeLocally(
    sourceCode,
    {
      profile:
        settings.scanProfile,

      minimumSeverity:
        settings.minimumSeverity,

      language:
        String(
          language || "",
        ).toLowerCase(),
    },
  );

      const result = {
        ...rawResult,

        issues:
          applyMappingPreferences(
            rawResult.issues,
            settings,
          ),
      };

      /*
       * Gemini service receives the
       * complete source here, but
       * geminiReview.service.js will
       * intelligently extract only
       * relevant vulnerable sections.
       */
      const aiReview =
        await generateGeminiReview({
          language,

          fileName,

          code:
            sourceCode,

          securityScore:
            result.securityScore,

          issueCount:
            result.issueCount,

          issues:
            result.issues,

          mode:
            settings.aiReviewMode,

          secureCodeExamples:
            settings
              .secureCodeExamples,

          showOwasp:
            settings.showOwasp,

          showCwe:
            settings.showCwe,
        });

      scan.status =
        "completed";

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
        (project.totalScans ||
          0) + 1;

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
                byteSize /
                  1024,
              ),

            scannedEntireFile:
              true,
          },

          appliedSettings: {
            scanProfile:
              settings.scanProfile,

            minimumSeverity:
              settings
                .minimumSeverity,

            aiReviewMode:
              settings.aiReviewMode,
          },
        });
    } catch (error) {
      console.error(
        "SCAN CONTROLLER ERROR:",
      );

      console.error(
        error,
      );

      scan.status =
        "failed";

      scan.completedAt =
        new Date();

      try {
        await scan.save();
      } catch (
        saveError
      ) {
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
            process.env
              .NODE_ENV ===
            "production"
              ? "Code analysis failed"
              : error.message,
        });
    }
  };

const getScan =
  async (
    request,
    response,
  ) => {
    const scan =
      await Scan.findOne({
        _id:
          request.params
            .scanId,

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
          request.params
            .projectId,

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
  getScan,
  listProjectScans,
};