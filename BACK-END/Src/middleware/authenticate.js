const User = require("../models/User");
const { verifyAccessToken } = require("../utils/tokens");

const authenticate = async (request, response, next) => {
  try {
    const authorizationHeader = request.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return response.status(401).json({
        success: false,
        message: "Authentication token is missing",
      });
    }

    const accessToken = authorizationHeader.split(" ")[1];
    const payload = verifyAccessToken(accessToken);

    if (
      payload.type !== "access" ||
      typeof payload.sub !== "string"
    ) {
      return response.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const user = await User.findById(payload.sub);

    if (!user || !user.isActive) {
      return response.status(401).json({
        success: false,
        message: "User account was not found or is disabled",
      });
    }

    request.user = user;

    return next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return response.status(401).json({
        success: false,
        message:
          error.name === "TokenExpiredError"
            ? "Access token has expired"
            : "Invalid access token",
      });
    }

    return next(error);
  }
};

module.exports = authenticate;