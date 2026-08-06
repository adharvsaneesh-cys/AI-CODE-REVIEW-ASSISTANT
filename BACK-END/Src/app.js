const authRoutes = require("./routes/auth.routes");
const projectRoutes = require("./routes/project.routes");
const scanRoutes = require("./routes/scan.routes");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const app = express();

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});
app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

app.get("/health", (request, response) => {
  response.status(200).json({
    success: true,
    message: "AI Code Review Assistant backend is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1", (request, response) => {
  response.status(200).json({
    success: true,
    message: "API version 1 is active",
  });
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/scans", scanRoutes);
app.use((request, response) => {
  response.status(404).json({
    success: false,
    message: `Route not found: ${request.method} ${request.originalUrl}`,
  });
});

app.use((error, request, response, next) => {
  console.error(error);

  if (error.code === 11000) {
    return response.status(409).json({
      success: false,
      message: "A record with this value already exists",
    });
  }

  if (error.name === "ValidationError") {
    return response.status(400).json({
      success: false,
      message: "Database validation failed",
      errors: Object.values(error.errors).map(
        (item) => item.message,
      ),
    });
  }

  return response.status(error.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message,
  });
});

app.use((error, request, response, next) => {
  console.error(error);

  response.status(error.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message,
  });
});

module.exports = app;