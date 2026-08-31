const express =
  require("express");

const {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
  getSecurityStatus,
  changePassword,
  logoutAllSessions,
} = require(
  "../controllers/auth.controller",
);

const authenticate =
  require(
    "../middleware/authenticate",
  );

const validate =
  require(
    "../middleware/validate",
  );

const {
  registerSchema,
  loginSchema,
} = require(
  "../validators/auth.validator",
);

const asyncHandler =
  require(
    "../utils/asyncHandler",
  );

const router =
  express.Router();

router.post(
  "/register",

  validate(
    registerSchema,
  ),

  asyncHandler(
    register,
  ),
);

router.post(
  "/login",

  validate(
    loginSchema,
  ),

  asyncHandler(
    login,
  ),
);

router.post(
  "/refresh",

  asyncHandler(
    refreshAccessToken,
  ),
);

router.post(
  "/logout",

  asyncHandler(
    logout,
  ),
);

router.get(
  "/me",

  authenticate,

  asyncHandler(
    getCurrentUser,
  ),
);

/* =============================
   SECURITY ROUTES
============================= */

router.get(
  "/security",

  authenticate,

  asyncHandler(
    getSecurityStatus,
  ),
);

router.patch(
  "/change-password",

  authenticate,

  asyncHandler(
    changePassword,
  ),
);

router.post(
  "/logout-all",

  authenticate,

  asyncHandler(
    logoutAllSessions,
  ),
);

module.exports =
  router;