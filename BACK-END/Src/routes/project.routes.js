const express = require("express");

const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const asyncHandler = require("../utils/asyncHandler");

const {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
} = require("../controllers/project.controller");

const {
  projectIdSchema,
  createProjectSchema,
  updateProjectSchema,
} = require("../validators/project.validator");

const router = express.Router();

router.use(authenticate);

router
  .route("/")
  .post(
    validate(createProjectSchema),
    asyncHandler(createProject),
  )
  .get(asyncHandler(listProjects));

router
  .route("/:projectId")
  .get(
    validate(projectIdSchema),
    asyncHandler(getProject),
  )
  .patch(
    validate(updateProjectSchema),
    asyncHandler(updateProject),
  )
  .delete(
    validate(projectIdSchema),
    asyncHandler(deleteProject),
  );

module.exports = router;