const requiredEnvironmentVariables = [
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "FRONTEND_URL",
  "PYTHON_SCANNER_URL",
];

function validateEnvironment() {
  const missingVariables = requiredEnvironmentVariables.filter(
    (variableName) => !process.env[variableName],
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(", ")}`,
    );
  }
}

module.exports = {
  validateEnvironment,
};