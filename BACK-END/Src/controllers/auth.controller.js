const bcrypt = require("bcrypt");
const User = require("../models/User");

const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  hashToken,
  getRefreshCookieOptions,
} = require("../utils/tokens");

const createTokenPair = (user) => {
  return {
    accessToken:
      createAccessToken(user),

    refreshToken:
      createRefreshToken(user),
  };
};

const saveRefreshToken = async (
  user,
  refreshToken,
) => {
  user.refreshTokenHash =
    hashToken(refreshToken);

  await user.save({
    validateBeforeSave: false,
  });
};

const sendAuthenticationResponse =
  async (
    response,
    user,
    statusCode,
    message,
  ) => {
    const {
      accessToken,
      refreshToken,
    } = createTokenPair(user);

    await saveRefreshToken(
      user,
      refreshToken,
    );

    response.cookie(
      "refreshToken",
      refreshToken,
      getRefreshCookieOptions(),
    );

    return response
      .status(statusCode)
      .json({
        success: true,
        message,
        accessToken,
        user,
      });
  };

const register = async (
  request,
  response,
) => {
  const {
    fullName,
    email,
    password,
  } = request.body;

  const existingUser =
    await User.findOne({
      email,
    });

  if (existingUser) {
    return response
      .status(409)
      .json({
        success: false,

        message:
          "An account with this email already exists",
      });
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      12,
    );

  const user =
    await User.create({
      fullName,
      email,
      passwordHash,
    });

  return sendAuthenticationResponse(
    response,
    user,
    201,
    "Account created successfully",
  );
};

const login = async (
  request,
  response,
) => {
  const {
    email,
    password,
  } = request.body;

  const user =
    await User.findOne({
      email,
    }).select(
      "+passwordHash +refreshTokenHash",
    );

  if (!user) {
    return response
      .status(401)
      .json({
        success: false,

        message:
          "Incorrect email or password",
      });
  }

  const passwordMatches =
    await bcrypt.compare(
      password,
      user.passwordHash,
    );

  if (!passwordMatches) {
    return response
      .status(401)
      .json({
        success: false,

        message:
          "Incorrect email or password",
      });
  }

  if (!user.isActive) {
    return response
      .status(403)
      .json({
        success: false,

        message:
          "This account has been disabled",
      });
  }

  user.lastLoginAt =
    new Date();

  return sendAuthenticationResponse(
    response,
    user,
    200,
    "Login successful",
  );
};

const refreshAccessToken =
  async (
    request,
    response,
  ) => {
    const currentRefreshToken =
      request.cookies
        .refreshToken;

    if (
      !currentRefreshToken
    ) {
      return response
        .status(401)
        .json({
          success: false,

          message:
            "Refresh token is missing",
        });
    }

    let payload;

    try {
      payload =
        verifyRefreshToken(
          currentRefreshToken,
        );
    } catch {
      return response
        .status(401)
        .json({
          success: false,

          message:
            "Invalid or expired refresh token",
        });
    }

    if (
      payload.type !==
      "refresh"
    ) {
      return response
        .status(401)
        .json({
          success: false,

          message:
            "Invalid refresh token",
        });
    }

    const user =
      await User.findById(
        payload.sub,
      ).select(
        "+refreshTokenHash",
      );

    if (
      !user ||
      !user.isActive ||
      !user.refreshTokenHash ||
      user.refreshTokenHash !==
        hashToken(
          currentRefreshToken,
        )
    ) {
      return response
        .status(401)
        .json({
          success: false,

          message:
            "Refresh token has been revoked",
        });
    }

    const {
      accessToken,
      refreshToken,
    } = createTokenPair(user);

    await saveRefreshToken(
      user,
      refreshToken,
    );

    response.cookie(
      "refreshToken",
      refreshToken,
      getRefreshCookieOptions(),
    );

    return response
      .status(200)
      .json({
        success: true,

        message:
          "Access token refreshed successfully",

        accessToken,
      });
  };

const logout = async (
  request,
  response,
) => {
  const refreshToken =
    request.cookies
      .refreshToken;

  if (refreshToken) {
    try {
      const payload =
        verifyRefreshToken(
          refreshToken,
        );

      await User.findByIdAndUpdate(
        payload.sub,
        {
          $set: {
            refreshTokenHash:
              null,
          },
        },
      );
    } catch {
      // Cookie is still cleared.
    }
  }

  response.clearCookie(
    "refreshToken",
    {
      ...getRefreshCookieOptions(),
      maxAge: undefined,
    },
  );

  return response
    .status(200)
    .json({
      success: true,

      message:
        "Logout successful",
    });
};

const getCurrentUser =
  async (
    request,
    response,
  ) => {
    return response
      .status(200)
      .json({
        success: true,

        user:
          request.user,
      });
  };

/* =================================
   SECURITY PAGE INFORMATION
================================= */

const getSecurityStatus =
  async (
    request,
    response,
  ) => {
    const user =
      await User.findById(
        request.user._id,
      ).select(
        "+refreshTokenHash",
      );

    if (!user) {
      return response
        .status(404)
        .json({
          success: false,

          message:
            "User account not found",
        });
    }

    return response
      .status(200)
      .json({
        success: true,

        security: {
          accountActive:
            Boolean(
              user.isActive,
            ),

          role:
            user.role,

          email:
            user.email,

          lastLoginAt:
            user.lastLoginAt,

          passwordProtected:
            Boolean(
              user.passwordHash,
            ),

          activeSession:
            Boolean(
              user.refreshTokenHash,
            ),

          refreshSessionEnabled:
            Boolean(
              user.refreshTokenHash,
            ),

          accountCreatedAt:
            user.createdAt,

          passwordHashing:
            "bcrypt",

          accessTokenLifetime:
            process.env
              .JWT_ACCESS_EXPIRES_IN ||
            "15m",

          refreshTokenLifetime:
            process.env
              .JWT_REFRESH_EXPIRES_IN ||
            "7d",
        },
      });
  };

/* =================================
   CHANGE PASSWORD
================================= */

const changePassword =
  async (
    request,
    response,
  ) => {
    const {
      currentPassword,
      newPassword,
    } = request.body;

    if (
      !currentPassword ||
      !newPassword
    ) {
      return response
        .status(400)
        .json({
          success: false,

          message:
            "Current password and new password are required",
        });
    }

    if (
      newPassword.length <
      8
    ) {
      return response
        .status(400)
        .json({
          success: false,

          message:
            "New password must contain at least 8 characters",
        });
    }

    if (
      currentPassword ===
      newPassword
    ) {
      return response
        .status(400)
        .json({
          success: false,

          message:
            "New password must be different from your current password",
        });
    }

    const user =
      await User.findById(
        request.user._id,
      ).select(
        "+passwordHash +refreshTokenHash",
      );

    if (!user) {
      return response
        .status(404)
        .json({
          success: false,

          message:
            "User account not found",
        });
    }

    const passwordMatches =
      await bcrypt.compare(
        currentPassword,
        user.passwordHash,
      );

    if (!passwordMatches) {
      return response
        .status(401)
        .json({
          success: false,

          message:
            "Current password is incorrect",
        });
    }

    const existingMatch =
      await bcrypt.compare(
        newPassword,
        user.passwordHash,
      );

    if (existingMatch) {
      return response
        .status(400)
        .json({
          success: false,

          message:
            "New password cannot be the same as your current password",
        });
    }

    user.passwordHash =
      await bcrypt.hash(
        newPassword,
        12,
      );

    /*
      Revoke refresh token after
      password modification.
    */
    user.refreshTokenHash =
      null;

    await user.save({
      validateBeforeSave: false,
    });

    response.clearCookie(
      "refreshToken",
      {
        ...getRefreshCookieOptions(),
        maxAge: undefined,
      },
    );

    return response
      .status(200)
      .json({
        success: true,

        message:
          "Password changed successfully. Please sign in again.",
      });
  };

/* =================================
   LOG OUT ALL SESSIONS
================================= */

const logoutAllSessions =
  async (
    request,
    response,
  ) => {
    const user =
      await User.findById(
        request.user._id,
      ).select(
        "+refreshTokenHash",
      );

    if (!user) {
      return response
        .status(404)
        .json({
          success: false,

          message:
            "User account not found",
        });
    }

    user.refreshTokenHash =
      null;

    await user.save({
      validateBeforeSave: false,
    });

    response.clearCookie(
      "refreshToken",
      {
        ...getRefreshCookieOptions(),
        maxAge: undefined,
      },
    );

    return response
      .status(200)
      .json({
        success: true,

        message:
          "All sessions have been revoked successfully",
      });
  };

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,

  getSecurityStatus,
  changePassword,
  logoutAllSessions,
};