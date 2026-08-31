const authRoutes =
  require(
    "./routes/auth.routes",
  );

const projectRoutes =
  require(
    "./routes/project.routes",
  );

const scanRoutes =
  require(
    "./routes/scan.routes",
  );

const express =
  require("express");

const cors =
  require("cors");

const cookieParser =
  require("cookie-parser");

const helmet =
  require("helmet");

const rateLimit =
  require(
    "express-rate-limit",
  );

const app =
  express();

app.use(
  (
    request,
    response,
    next,
  ) => {
    if (
      process.env
        .NODE_ENV !==
      "production"
    ) {
      console.log(
        `${request.method} ${request.originalUrl}`,
      );
    }

    next();
  },
);

app.disable(
  "x-powered-by",
);

app.use(
  helmet(),
);

const allowedOrigins = [
  process.env
    .FRONTEND_URL,

  "http://localhost:4173",
].filter(Boolean);

app.use(
  cors({
    origin(
      origin,
      callback,
    ) {
      if (
        !origin ||
        allowedOrigins.includes(
          origin,
        )
      ) {
        return callback(
          null,
          true,
        );
      }

      return callback(
        new Error(
          "Origin not allowed by CORS",
        ),
      );
    },

    credentials:
      true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",

      "X-CodeGuard-Scan-Profile",

      "X-CodeGuard-Min-Severity",

      "X-CodeGuard-AI-Mode",

      "X-CodeGuard-Secure-Examples",

      "X-CodeGuard-Show-OWASP",

      "X-CodeGuard-Show-CWE",
    ],
  }),
);

const apiLimiter =
  rateLimit({
    windowMs:
      15 *
      60 *
      1000,

    limit:
      200,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    message: {
      success: false,

      message:
        "Too many requests. Please try again later.",
    },
  });

app.use(
  "/api",
  apiLimiter,
);

app.use(
  express.json({
    limit: "6mb",
  }),
);

app.use(
  express.urlencoded({
    extended:
      true,

    limit: "6mb",
  }),
);

app.use(
  cookieParser(),
);

app.get(
  "/health",
  (
    request,
    response,
  ) => {
    response
      .status(200)
      .json({
        success:
          true,

        message:
          "AI Code Review Assistant backend is running",

        environment:
          process.env
            .NODE_ENV,

        timestamp:
          new Date()
            .toISOString(),
      });
  },
);

app.get(
  "/api/v1",
  (
    request,
    response,
  ) => {
    response
      .status(200)
      .json({
        success:
          true,

        message:
          "API version 1 is active",

        scanning: {
          maxLines:
            25000,

          maxSourceFileSize:
            "5 MB",

          requestLimit:
            "6 MB",
        },
      });
  },
);

app.use(
  "/api/v1/auth",
  authRoutes,
);

app.use(
  "/api/v1/projects",
  projectRoutes,
);

app.use(
  "/api/v1/scans",
  scanRoutes,
);

app.use(
  (
    request,
    response,
  ) => {
    response
      .status(404)
      .json({
        success:
          false,

        message:
          `Route not found: ${request.method} ${request.originalUrl}`,
      });
  },
);

app.use(
  (
    error,
    request,
    response,
    next,
  ) => {
    console.error(
      error,
    );

    if (
      error.type ===
      "entity.too.large"
    ) {
      return response
        .status(413)
        .json({
          success:
            false,

          message:
            "Source-code request is too large. Maximum supported source file size is 5 MB.",
        });
    }

    if (
      error.code ===
      11000
    ) {
      return response
        .status(409)
        .json({
          success:
            false,

          message:
            "A record with this value already exists",
        });
    }

    if (
      error.name ===
      "ValidationError"
    ) {
      return response
        .status(400)
        .json({
          success:
            false,

          message:
            "Database validation failed",

          errors:
            Object.values(
              error.errors,
            ).map(
              (item) =>
                item.message,
            ),
        });
    }

    if (
      error.message ===
      "Origin not allowed by CORS"
    ) {
      return response
        .status(403)
        .json({
          success:
            false,

          message:
            "This origin is not allowed to access the API.",
        });
    }

    return response
      .status(
        error.statusCode ||
          500,
      )
      .json({
        success:
          false,

        message:
          process.env
            .NODE_ENV ===
          "production"
            ? "Internal server error"
            : error.message,
      });
  },
);

module.exports =
  app;