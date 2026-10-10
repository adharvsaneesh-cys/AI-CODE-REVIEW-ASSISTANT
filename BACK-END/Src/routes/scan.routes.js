const express =
  require("express");

const multer =
  require("multer");

const fs =
  require("fs");

const path =
  require("path");

const authenticate =
  require("../middleware/authenticate");

const asyncHandler =
  require("../utils/asyncHandler");

const {
  createPasteCodeScan,
  createZipCodeScan,
  verifyZipFile,
  getZipProjectFiles,
  getZipProjectFileSource,
  getScan,
  listProjectScans,
} = require("../controllers/scan.controller");

const {
  getZipFileAiReview,
  generateZipFileAiReview,
} = require("../controllers/zipAiReview.controller");

const {
  downloadSecuredZip,
} = require("../controllers/securedZip.controller");

const router =
  express.Router();

const MAX_ZIP_SIZE =
  1024 * 1024 * 1024;

const ZIP_TEMP_DIR =
  path.join(
    process.cwd(),
    "temp",
    "zip-uploads",
  );

fs.mkdirSync(
  ZIP_TEMP_DIR,
  {
    recursive: true,
  },
);

const zipStorage =
  multer.diskStorage({
    destination:
      (
        request,
        file,
        callback,
      ) => {
        callback(
          null,
          ZIP_TEMP_DIR,
        );
      },

    filename:
      (
        request,
        file,
        callback,
      ) => {
        const extension =
          path.extname(
            file.originalname ||
              "",
          ).toLowerCase();

        const uniqueName =
          `zip-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}${extension}`;

        callback(
          null,
          uniqueName,
        );
      },
  });

const zipUpload =
  multer({
    storage:
      zipStorage,

    limits: {
      files: 1,
      fileSize:
        MAX_ZIP_SIZE,
    },

    fileFilter:
      (
        request,
        file,
        callback,
      ) => {
        const fileName =
          String(
            file.originalname ||
              "",
          ).toLowerCase();

        if (
          !fileName.endsWith(
            ".zip",
          )
        ) {
          return callback(
            new Error(
              "Only ZIP project uploads are supported.",
            ),
          );
        }

        return callback(
          null,
          true,
        );
      },
  });

router.post(
  "/paste",
  authenticate,
  asyncHandler(
    createPasteCodeScan,
  ),
);

router.post(
  "/zip",
  authenticate,
  zipUpload.single(
    "file",
  ),
  asyncHandler(
    createZipCodeScan,
  ),
);

router.get(
  "/:scanId/zip-files",
  authenticate,
  asyncHandler(
    getZipProjectFiles,
  ),
);

router.get(
  "/:scanId/zip-file/source",
  authenticate,
  asyncHandler(
    getZipProjectFileSource,
  ),
);

router.get(
  "/:scanId/zip-file/ai-review",
  authenticate,
  asyncHandler(
    getZipFileAiReview,
  ),
);

router.post(
  "/:scanId/zip-file/ai-review",
  authenticate,
  asyncHandler(
    generateZipFileAiReview,
  ),
);

router.post(
  "/:scanId/zip-file/verify",
  authenticate,
  asyncHandler(
    verifyZipFile,
  ),
);

router.get(
  "/:scanId/zip/download",
  authenticate,
  asyncHandler(
    downloadSecuredZip,
  ),
);

router.get(
  "/project/:projectId/history",
  authenticate,
  asyncHandler(
    listProjectScans,
  ),
);

router.get(
  "/:scanId",
  authenticate,
  asyncHandler(
    getScan,
  ),
);

module.exports =
  router;