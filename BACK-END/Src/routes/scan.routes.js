const express = require("express");

const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const {
  createPasteCodeScan,
  getScan,
  listProjectScans,
} = require("../controllers/scan.controller");

const {
  pasteCodeScanSchema,
  scanIdSchema,
  projectScanListSchema,
} = require("../validators/scan.validator");

const router = express.Router();

router.use(authenticate);

router.post(
  "/paste",
  validate(pasteCodeScanSchema),
  asyncHandler(createPasteCodeScan),
);

router.get(
  "/:scanId",
  validate(scanIdSchema),
  asyncHandler(getScan),
);

router.get(
  "/project/:projectId/history",
  validate(projectScanListSchema),
  asyncHandler(listProjectScans),
);

module.exports = router;