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
    accessToken: createAccessToken(user),
    refreshToken: createRefreshToken(user),
  };
};

const saveRefreshToken = async (user, refreshToken) => {
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });
};

const sendAuthenticationResponse = async (
  response,
  user,
  statusCode,
  message,
) => {
  const { accessToken, refreshToken } = createTokenPair(user);

  await saveRefreshToken(user, refreshToken);

  response.cookie(
    "refreshToken",
    refreshToken,
    getRefreshCookieOptions(),
  );

  return response.status(statusCode).json({
    success: true,
    message,
    accessToken,
    user,
  });
};

const register = async (request, response) => {
  const { fullName, email, password } = request.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return response.status(409).json({
      success: false,
      message: "An account with this email already exists",
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
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

const login = async (request, response) => {
  const { email, password } = request.body;

  const user = await User.findOne({ email }).select(
    "+passwordHash +refreshTokenHash",
  );

  if (!user) {
    return response.status(401).json({
      success: false,
      message: "Incorrect email or password",
    });
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    return response.status(401).json({
      success: false,
      message: "Incorrect email or password",
    });
  }

  if (!user.isActive) {
    return response.status(403).json({
      success: false,
      message: "This account has been disabled",
    });
  }

  user.lastLoginAt = new Date();

  return sendAuthenticationResponse(
    response,
    user,
    200,
    "Login successful",
  );
};

const refreshAccessToken = async (request, response) => {
  const currentRefreshToken = request.cookies.refreshToken;

  if (!currentRefreshToken) {
    return response.status(401).json({
      success: false,
      message: "Refresh token is missing",
    });
  }

  let payload;

  try {
    payload = verifyRefreshToken(currentRefreshToken);
  } catch (error) {
    return response.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }

  if (payload.type !== "refresh") {
    return response.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }

  const user = await User.findById(payload.sub).select(
    "+refreshTokenHash",
  );

  if (
    !user ||
    !user.isActive ||
    !user.refreshTokenHash ||
    user.refreshTokenHash !== hashToken(currentRefreshToken)
  ) {
    return response.status(401).json({
      success: false,
      message: "Refresh token has been revoked",
    });
  }

  const { accessToken, refreshToken } = createTokenPair(user);

  await saveRefreshToken(user, refreshToken);

  response.cookie(
    "refreshToken",
    refreshToken,
    getRefreshCookieOptions(),
  );

  return response.status(200).json({
    success: true,
    message: "Access token refreshed successfully",
    accessToken,
  });
};

const logout = async (request, response) => {
  const refreshToken = request.cookies.refreshToken;

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);

      await User.findByIdAndUpdate(payload.sub, {
        $set: {
          refreshTokenHash: null,
        },
      });
    } catch (error) {
      // Clear the cookie even when the token is invalid or expired.
    }
  }

  response.clearCookie("refreshToken", {
    ...getRefreshCookieOptions(),
    maxAge: undefined,
  });

  return response.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

const getCurrentUser = async (request, response) => {
  return response.status(200).json({
    success: true,
    user: request.user,
  });
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
};