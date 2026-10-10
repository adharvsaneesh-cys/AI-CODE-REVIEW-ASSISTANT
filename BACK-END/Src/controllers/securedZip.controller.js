const Scan = require("../models/Scan");

const {
  buildSecuredZip,
} = require("../services/securedZip.service");

function sanitizeHeaderFileName(
  value,
) {
  return String(
    value ||
      "project-codeguard-secured.zip",
  )
    .replace(/[\\/"\r\n]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .trim();
}

const downloadSecuredZip =
  async (
    request,
    response,
  ) => {
    try {
      const scanId =
        String(
          request.params
            ?.scanId || "",
        ).trim();

      if (!scanId) {
        return response
          .status(400)
          .json({
            success: false,
            message:
              "Scan ID is required.",
          });
      }

      const scan =
        await Scan.findOne({
          _id:
            scanId,

          owner:
            request.user._id,
        });

      if (!scan) {
        return response
          .status(404)
          .json({
            success: false,
            message:
              "Scan not found.",
          });
      }

      if (
        scan.sourceType !==
        "zip"
      ) {
        return response
          .status(400)
          .json({
            success: false,

            message:
              "Secured ZIP download is only available for ZIP project scans.",
          });
      }

      if (
        scan.status !==
        "completed"
      ) {
        return response
          .status(409)
          .json({
            success: false,

            message:
              "The ZIP scan must be completed before downloading the secured project.",
          });
      }

      if (
        !scan.zipMetadata
          ?.archiveStorageId
      ) {
        return response
          .status(409)
          .json({
            success: false,

            message:
              "The original ZIP archive is not available for this scan. Upload and scan the project again to enable secured ZIP download.",
          });
      }

      const securedZip =
        await buildSecuredZip({
          scan,

          ownerId:
            request.user._id,
        });

      const downloadName =
        sanitizeHeaderFileName(
          securedZip.fileName,
        );

      response.setHeader(
        "Content-Type",
        "application/zip",
      );

      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${downloadName}"`,
      );

      response.setHeader(
        "Content-Length",
        securedZip.buffer.length,
      );

      response.setHeader(
        "X-CodeGuard-Replaced-Files",
        String(
          securedZip
            .replacedFiles,
        ),
      );

      response.setHeader(
        "X-CodeGuard-Source-Files",
        String(
          securedZip
            .totalPersistedFiles,
        ),
      );

      return response
        .status(200)
        .send(
          securedZip.buffer,
        );
    } catch (error) {
      console.error(
        "SECURED ZIP DOWNLOAD ERROR:",
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

      const statusCode =
        Number(
          error.statusCode,
        ) || 500;

      return response
        .status(statusCode)
        .json({
          success: false,

          message:
            process.env
              .NODE_ENV ===
              "production" &&
            statusCode >= 500
              ? "Unable to generate secured ZIP project."
              : error.message ||
                "Unable to generate secured ZIP project.",

          missingFiles:
            Array.isArray(
              error.missingFiles,
            )
              ? error
                  .missingFiles
              : undefined,
        });
    }
  };

module.exports = {
  downloadSecuredZip,
};