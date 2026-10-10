const crypto = require("crypto");

const Scan = require("../models/Scan");

const ZipProjectFile = require(
  "../models/ZipProjectFile",
);

const {
  generateGeminiReview,
} = require(
  "../services/geminiReview.service",
);

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .trim();
}

function createCodeHash(code) {
  return crypto
    .createHash("sha256")
    .update(
      String(code || ""),
      "utf8",
    )
    .digest("hex");
}

function countIssues(
  issues = [],
) {
  const count = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const issue of issues) {
    const severity =
      String(
        issue?.severity ||
          "info",
      ).toLowerCase();

    if (
      Object.prototype.hasOwnProperty.call(
        count,
        severity,
      )
    ) {
      count[severity] += 1;
    } else {
      count.info += 1;
    }
  }

  return count;
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
      .trim()
      .toLowerCase() ===
    "true"
  );
}

function readAiSettings(
  request,
) {
  const allowedModes =
    new Set([
      "quick",
      "standard",
      "detailed",
    ]);

  let aiReviewMode =
    String(
      request.get(
        "X-CodeGuard-AI-Mode",
      ) || "standard",
    )
      .trim()
      .toLowerCase();

  if (
    !allowedModes.has(
      aiReviewMode,
    )
  ) {
    aiReviewMode =
      "standard";
  }

  return {
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

function serializeAiReview(
  file,
) {
  return {
    path:
      file.path,

    fileName:
      file.fileName,

    language:
      file.language,

    securityScore:
      file.securityScore,

    issueCount:
      file.issueCount,

    issueTotal:
      file.issueTotal,

    issues:
      file.issues,

    modified:
      Boolean(
        file.modified,
      ),

    verified:
      Boolean(
        file.verified,
      ),

    aiReview:
      file.aiReview,

    aiReviewStatus:
      file.aiReviewStatus,

    aiReviewedAt:
      file.aiReviewedAt,

    aiReviewCodeHash:
      file.aiReviewCodeHash,
  };
}

async function findOwnedZipScan({
  scanId,
  ownerId,
}) {
  const scan =
    await Scan.findOne({
      _id: scanId,
      owner: ownerId,
      sourceType: "zip",
    });

  return scan;
}

const getZipFileAiReview =
  async (
    request,
    response,
  ) => {
    try {
      const scanId =
        request.params.scanId;

      const ownerId =
        request.user._id;

      const filePath =
        normalizePath(
          request.query.filePath,
        );

      if (!filePath) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "ZIP file path is required.",
          });
      }

      const scan =
        await findOwnedZipScan({
          scanId,
          ownerId,
        });

      if (!scan) {
        return response
          .status(404)
          .json({
            success: false,
            message:
              "ZIP scan not found.",
          });
      }

      const file =
        await ZipProjectFile.findFile({
          scanId:
            scan._id,

          ownerId,

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

      const currentCode =
        String(
          file.currentCode ||
            "",
        );

      const currentHash =
        createCodeHash(
          currentCode,
        );

      const reviewIsCurrent =
        file.aiReviewStatus ===
          "completed" &&
        file.aiReview?.available ===
          true &&
        file.aiReviewCodeHash ===
          currentHash;

      return response
        .status(200)
        .json({
          success: true,

          reviewCurrent:
            reviewIsCurrent,

          file:
            serializeAiReview(
              file,
            ),
        });
    } catch (error) {
      console.error(
        "GET ZIP AI REVIEW ERROR:",
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
            process.env
              .NODE_ENV ===
            "production"
              ? "Unable to load ZIP AI review."
              : error.message ||
                "Unable to load ZIP AI review.",
        });
    }
  };

const generateZipFileAiReview =
  async (
    request,
    response,
  ) => {
    let file = null;

    try {
      const scanId =
        request.params.scanId;

      const ownerId =
        request.user._id;

      const filePath =
        normalizePath(
          request.body?.filePath,
        );

      const force =
        request.body?.force ===
        true;

      if (!filePath) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "ZIP file path is required.",
          });
      }

      const scan =
        await findOwnedZipScan({
          scanId,
          ownerId,
        });

      if (!scan) {
        return response
          .status(404)
          .json({
            success: false,
            message:
              "ZIP scan not found.",
          });
      }

      file =
        await ZipProjectFile.findFile({
          scanId:
            scan._id,

          ownerId,

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

      const currentCode =
        String(
          file.currentCode ||
            "",
        );

      if (!currentCode.trim()) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "The selected ZIP file has no source code to review.",
          });
      }

      const codeHash =
        createCodeHash(
          currentCode,
        );

      const reviewIsCurrent =
        file.aiReviewStatus ===
          "completed" &&
        file.aiReview?.available ===
          true &&
        file.aiReviewCodeHash ===
          codeHash;

      if (
        reviewIsCurrent &&
        !force
      ) {
        return response
          .status(200)
          .json({
            success: true,

            cached: true,

            message:
              `Loaded the existing AI review for ${file.path}.`,

            file:
              serializeAiReview(
                file,
              ),
          });
      }

      if (
        file.aiReviewStatus ===
          "processing" &&
        !force
      ) {
        return response
          .status(202)
          .json({
            success: true,

            cached: false,

            processing: true,

            message:
              `AI is already reviewing ${file.path}.`,

            file:
              serializeAiReview(
                file,
              ),
          });
      }

      await file.markAiReviewProcessing();

      const settings =
        readAiSettings(
          request,
        );

      const issues =
        Array.isArray(
          file.issues,
        )
          ? file.issues
          : [];

      const issueCount =
        file.issueCount &&
        typeof file.issueCount ===
          "object"
          ? file.issueCount
          : countIssues(
              issues,
            );

      const review =
        await generateGeminiReview({
          code:
            currentCode,

          language:
            file.language,

          fileName:
            file.path ||
            file.fileName,

          issues,

          issueCount,

          securityScore:
            Number.isFinite(
              Number(
                file.securityScore,
              ),
            )
              ? Number(
                  file.securityScore,
                )
              : 100,

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

      await file.saveAiReview({
        review,
        codeHash,
      });

      return response
        .status(200)
        .json({
          success: true,

          cached: false,

          message:
            file.aiReview
              ?.available
              ? `AI review completed for ${file.path}.`
              : `AI review could not be completed for ${file.path}.`,

          file:
            serializeAiReview(
              file,
            ),

          appliedSettings: {
            aiReviewMode:
              settings.aiReviewMode,

            secureCodeExamples:
              settings
                .secureCodeExamples,

            showOwasp:
              settings.showOwasp,

            showCwe:
              settings.showCwe,
          },
        });
    } catch (error) {
      console.error(
        "GENERATE ZIP AI REVIEW ERROR:",
        error,
      );

      if (file) {
        try {
          await file.failAiReview(
            error.message ||
              "AI review failed.",
          );
        } catch (
          saveError
        ) {
          console.error(
            "FAILED TO SAVE ZIP AI REVIEW ERROR:",
            saveError,
          );
        }
      }

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
            process.env
              .NODE_ENV ===
            "production"
              ? "ZIP AI review failed."
              : error.message ||
                "ZIP AI review failed.",

          file:
            file
              ? serializeAiReview(
                  file,
                )
              : null,
        });
    }
  };

module.exports = {
  getZipFileAiReview,
  generateZipFileAiReview,
};