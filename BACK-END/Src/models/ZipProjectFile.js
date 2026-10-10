const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    ruleId: {
      type: String,
      default: "custom-rule",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    severity: {
      type: String,
      enum: [
        "critical",
        "high",
        "medium",
        "low",
        "info",
      ],
      default: "medium",
    },

    confidence: {
      type: String,
      enum: [
        "high",
        "medium",
        "low",
      ],
      default: "medium",
    },

    line: {
      type: Number,
      min: 1,
      default: 1,
    },

    recommendation: {
      type: String,
      trim: true,
      default: "",
    },

    filePath: {
      type: String,
      trim: true,
      default: "",
    },

    fileName: {
      type: String,
      trim: true,
      default: "",
    },

    language: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    owasp: {
      id: {
        type: String,
        default: "Not applicable",
      },

      category: {
        type: String,
        default: "Not applicable",
      },
    },

    cwe: {
      type: String,
      default: "Not applicable",
    },
  },
  {
    _id: false,
  },
);

const issueCountSchema = new mongoose.Schema(
  {
    critical: {
      type: Number,
      default: 0,
      min: 0,
    },

    high: {
      type: Number,
      default: 0,
      min: 0,
    },

    medium: {
      type: Number,
      default: 0,
      min: 0,
    },

    low: {
      type: Number,
      default: 0,
      min: 0,
    },

    info: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const aiFindingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
    },

    severity: {
      type: String,
      enum: [
        "critical",
        "high",
        "medium",
        "low",
        "info",
      ],
      default: "info",
    },

    confidence: {
      type: String,
      enum: [
        "high",
        "medium",
        "low",
      ],
      default: "medium",
    },

    line: {
      type: Number,
      min: 1,
      default: 1,
    },

    explanation: {
      type: String,
      default: "",
    },

    impact: {
      type: String,
      default: "",
    },

    recommendation: {
      type: String,
      default: "",
    },

    secureExample: {
      type: String,
      default: "",
    },

    owasp: {
      id: {
        type: String,
        default: "Not applicable",
      },

      category: {
        type: String,
        default: "Not applicable",
      },
    },

    cwe: {
      type: String,
      default: "Not applicable",
    },
  },
  {
    _id: false,
  },
);

const aiReviewSchema = new mongoose.Schema(
  {
    available: {
      type: Boolean,
      default: false,
    },

    summary: {
      type: String,
      default: "",
    },

    riskLevel: {
      type: String,
      enum: [
        "critical",
        "high",
        "medium",
        "low",
        "safe",
        "unknown",
      ],
      default: "unknown",
    },

    priorityActions: {
      type: [String],
      default: [],
    },

    detailedFindings: {
      type: [aiFindingSchema],
      default: [],
    },

    codeQualitySuggestions: {
      type: [String],
      default: [],
    },

    finalChecklist: {
      type: [String],
      default: [],
    },

    error: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  },
);

function createEmptyAiReview() {
  return {
    available: false,
    summary: "",
    riskLevel: "unknown",
    priorityActions: [],
    detailedFindings: [],
    codeQualitySuggestions: [],
    finalChecklist: [],
    error: null,
  };
}

function normalizePath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "");
}

function normalizeAiReview(review) {
  if (
    !review ||
    typeof review !== "object"
  ) {
    return createEmptyAiReview();
  }

  const riskLevel =
    [
      "critical",
      "high",
      "medium",
      "low",
      "safe",
      "unknown",
    ].includes(
      String(
        review.riskLevel ||
          "unknown",
      ).toLowerCase(),
    )
      ? String(
          review.riskLevel ||
            "unknown",
        ).toLowerCase()
      : "unknown";

  const detailedFindings =
    Array.isArray(
      review.detailedFindings,
    )
      ? review.detailedFindings.map(
          (finding) => {
            const severity =
              [
                "critical",
                "high",
                "medium",
                "low",
                "info",
              ].includes(
                String(
                  finding?.severity ||
                    "info",
                ).toLowerCase(),
              )
                ? String(
                    finding?.severity ||
                      "info",
                  ).toLowerCase()
                : "info";

            const confidence =
              [
                "high",
                "medium",
                "low",
              ].includes(
                String(
                  finding?.confidence ||
                    "medium",
                ).toLowerCase(),
              )
                ? String(
                    finding?.confidence ||
                      "medium",
                  ).toLowerCase()
                : "medium";

            return {
              title: String(
                finding?.title || "",
              ),

              severity,

              confidence,

              line: Math.max(
                Number(
                  finding?.line,
                ) || 1,
                1,
              ),

              explanation: String(
                finding?.explanation ||
                  "",
              ),

              impact: String(
                finding?.impact || "",
              ),

              recommendation:
                String(
                  finding
                    ?.recommendation ||
                    "",
                ),

              secureExample:
                String(
                  finding
                    ?.secureExample ||
                    "",
                ),

              owasp: {
                id: String(
                  finding?.owasp?.id ||
                    "Not applicable",
                ),

                category: String(
                  finding?.owasp
                    ?.category ||
                    "Not applicable",
                ),
              },

              cwe: String(
                finding?.cwe ||
                  "Not applicable",
              ),
            };
          },
        )
      : [];

  return {
    available: Boolean(
      review.available,
    ),

    summary: String(
      review.summary || "",
    ),

    riskLevel,

    priorityActions:
      Array.isArray(
        review.priorityActions,
      )
        ? review.priorityActions.map(
            (item) =>
              String(item),
          )
        : [],

    detailedFindings,

    codeQualitySuggestions:
      Array.isArray(
        review.codeQualitySuggestions,
      )
        ? review.codeQualitySuggestions.map(
            (item) =>
              String(item),
          )
        : [],

    finalChecklist:
      Array.isArray(
        review.finalChecklist,
      )
        ? review.finalChecklist.map(
            (item) =>
              String(item),
          )
        : [],

    error:
      review.error === null ||
      review.error === undefined
        ? null
        : String(
            review.error,
          ),
  };
}

const zipProjectFileSchema =
  new mongoose.Schema(
    {
      scan: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Scan",
        required: true,
        index: true,
      },

      project: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "Project",
        required: true,
        index: true,
      },

      owner: {
        type:
          mongoose.Schema.Types
            .ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      path: {
        type: String,
        required: true,
        trim: true,
      },

      fileName: {
        type: String,
        required: true,
        trim: true,
      },

      language: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      originalCode: {
        type: String,
        required: true,
        select: false,
      },

      currentCode: {
        type: String,
        required: true,
        select: false,
      },

      lineCount: {
        type: Number,
        min: 0,
        default: 0,
      },

      sizeBytes: {
        type: Number,
        min: 0,
        default: 0,
      },

      originalSizeBytes: {
        type: Number,
        min: 0,
        default: 0,
      },

      securityScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
      },

      issueCount: {
        type: issueCountSchema,
        default: () => ({
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        }),
      },

      issueTotal: {
        type: Number,
        min: 0,
        default: 0,
      },

      issues: {
        type: [issueSchema],
        default: [],
      },

      aiReview: {
        type: aiReviewSchema,
        default:
          createEmptyAiReview,
      },

      aiReviewStatus: {
        type: String,
        enum: [
          "not_requested",
          "processing",
          "completed",
          "failed",
          "stale",
        ],
        default: "not_requested",
      },

      aiReviewedAt: {
        type: Date,
        default: null,
      },

      aiReviewCodeHash: {
        type: String,
        default: "",
        trim: true,
      },

      modified: {
        type: Boolean,
        default: false,
      },

      verified: {
        type: Boolean,
        default: false,
      },

      verificationCount: {
        type: Number,
        min: 0,
        default: 0,
      },

      lastVerifiedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

zipProjectFileSchema.index(
  {
    scan: 1,
    path: 1,
  },
  {
    unique: true,
  },
);

zipProjectFileSchema.index({
  owner: 1,
  scan: 1,
});

zipProjectFileSchema.index({
  project: 1,
  createdAt: -1,
});

zipProjectFileSchema.index({
  scan: 1,
  aiReviewStatus: 1,
});

zipProjectFileSchema.pre(
  "validate",
  function normalizeZipProjectFile() {
    if (this.path) {
      this.path =
        normalizePath(
          this.path,
        );
    }

    if (this.fileName) {
      this.fileName =
        String(
          this.fileName,
        ).trim();
    }

    if (this.language) {
      this.language =
        String(
          this.language,
        )
          .trim()
          .toLowerCase();
    }
  },
);

zipProjectFileSchema.statics
  .createForScan =
  async function createForScan({
    scanId,
    projectId,
    ownerId,
    files,
  }) {
    if (!scanId) {
      throw new Error(
        "Scan ID is required.",
      );
    }

    if (!projectId) {
      throw new Error(
        "Project ID is required.",
      );
    }

    if (!ownerId) {
      throw new Error(
        "Owner ID is required.",
      );
    }

    if (!Array.isArray(files)) {
      throw new Error(
        "ZIP project files are required.",
      );
    }

    if (files.length === 0) {
      return [];
    }

    const documents =
      files.map(
        (file) => {
          const code =
            String(
              file.code || "",
            );

          const normalizedPath =
            normalizePath(
              file.path,
            );

          return {
            scan: scanId,

            project: projectId,

            owner: ownerId,

            path:
              normalizedPath,

            fileName:
              String(
                file.fileName ||
                  "",
              ).trim(),

            language:
              String(
                file.language ||
                  "",
              )
                .trim()
                .toLowerCase(),

            originalCode:
              code,

            currentCode:
              code,

            lineCount:
              Number(
                file.lineCount ||
                  0,
              ),

            sizeBytes:
              Number(
                file.sizeBytes ||
                  Buffer.byteLength(
                    code,
                    "utf8",
                  ),
              ),

            originalSizeBytes:
              Number(
                file.sizeBytes ||
                  Buffer.byteLength(
                    code,
                    "utf8",
                  ),
              ),

            securityScore:
              Number.isFinite(
                Number(
                  file.securityScore,
                ),
              )
                ? Number(
                    file.securityScore,
                  )
                : 100,

            issueCount:
              file.issueCount || {
                critical: 0,
                high: 0,
                medium: 0,
                low: 0,
                info: 0,
              },

            issueTotal:
              Number(
                file.issueTotal ||
                  0,
              ),

            issues:
              Array.isArray(
                file.issues,
              )
                ? file.issues
                : [],

            aiReview:
              createEmptyAiReview(),

            aiReviewStatus:
              "not_requested",

            aiReviewedAt:
              null,

            aiReviewCodeHash:
              "",

            modified:
              false,

            verified:
              false,

            verificationCount:
              0,

            lastVerifiedAt:
              null,
          };
        },
      );

    const operations =
      documents.map(
        (document) => ({
          updateOne: {
            filter: {
              scan:
                document.scan,

              path:
                document.path,
            },

            update: {
              $setOnInsert:
                document,
            },

            upsert: true,
          },
        }),
      );

    await this.bulkWrite(
      operations,
      {
        ordered: false,
      },
    );

    return this.find({
      scan: scanId,
      owner: ownerId,
    })
      .sort({
        path: 1,
      })
      .lean();
  };

zipProjectFileSchema.statics
  .findForScan =
  function findForScan({
    scanId,
    ownerId,
    includeCode = false,
  }) {
    let query =
      this.find({
        scan: scanId,
        owner: ownerId,
      }).sort({
        path: 1,
      });

    if (includeCode) {
      query =
        query.select(
          "+originalCode +currentCode",
        );
    }

    return query;
  };

zipProjectFileSchema.statics
  .findFile =
  function findFile({
    scanId,
    ownerId,
    filePath,
  }) {
    const normalizedPath =
      normalizePath(
        filePath,
      );

    return this.findOne({
      scan: scanId,
      owner: ownerId,
      path: normalizedPath,
    }).select(
      "+originalCode +currentCode",
    );
  };

zipProjectFileSchema.statics
  .clearAiReviewsForScan =
  async function clearAiReviewsForScan({
    scanId,
    ownerId,
  }) {
    if (
      !scanId ||
      !ownerId
    ) {
      return;
    }

    await this.updateMany(
      {
        scan: scanId,
        owner: ownerId,
      },
      {
        $set: {
          aiReview:
            createEmptyAiReview(),

          aiReviewStatus:
            "not_requested",

          aiReviewedAt:
            null,

          aiReviewCodeHash:
            "",
        },
      },
    );
  };

zipProjectFileSchema.methods
  .markAiReviewProcessing =
  async function markAiReviewProcessing() {
    this.aiReviewStatus =
      "processing";

    this.aiReview = {
      ...createEmptyAiReview(),
      summary:
        `AI security review is being generated for ${this.fileName}.`,
    };

    await this.save();

    return this;
  };

zipProjectFileSchema.methods
  .saveAiReview =
  async function saveAiReview({
    review,
    codeHash = "",
  }) {
    const normalizedReview =
      normalizeAiReview(
        review,
      );

    this.aiReview =
      normalizedReview;

    this.aiReviewStatus =
      normalizedReview.available
        ? "completed"
        : "failed";

    this.aiReviewedAt =
      new Date();

    this.aiReviewCodeHash =
      String(
        codeHash || "",
      );

    await this.save();

    return this;
  };

zipProjectFileSchema.methods
  .failAiReview =
  async function failAiReview(
    errorMessage,
  ) {
    this.aiReview = {
      ...createEmptyAiReview(),

      error:
        String(
          errorMessage ||
            "AI review failed.",
        ),
    };

    this.aiReviewStatus =
      "failed";

    this.aiReviewedAt =
      new Date();

    this.aiReviewCodeHash =
      "";

    await this.save();

    return this;
  };

zipProjectFileSchema.methods
  .markAiReviewStale =
  async function markAiReviewStale() {
    if (
      this.aiReviewStatus ===
        "completed" ||
      this.aiReviewStatus ===
        "failed"
    ) {
      this.aiReviewStatus =
        "stale";
    }

    this.aiReviewCodeHash =
      "";

    await this.save();

    return this;
  };

zipProjectFileSchema.methods
  .verifyCode =
  async function verifyCode({
    code,
    issues,
    issueCount,
    issueTotal,
    securityScore,
    lineCount,
    sizeBytes,
  }) {
    const nextCode =
      String(
        code ?? "",
      );

    const codeChanged =
      nextCode !==
      this.currentCode;

    this.currentCode =
      nextCode;

    this.issues =
      Array.isArray(issues)
        ? issues
        : [];

    this.issueCount =
      issueCount || {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0,
      };

    this.issueTotal =
      Number(
        issueTotal || 0,
      );

    const score =
      Number(
        securityScore,
      );

    this.securityScore =
      Number.isFinite(score)
        ? Math.max(
            0,
            Math.min(
              100,
              score,
            ),
          )
        : 100;

    this.lineCount =
      Number(
        lineCount || 0,
      );

    this.sizeBytes =
      Number(
        sizeBytes ||
          Buffer.byteLength(
            nextCode,
            "utf8",
          ),
      );

    this.modified =
      nextCode !==
      this.originalCode;

    this.verified =
      true;

    this.verificationCount =
      Number(
        this.verificationCount ||
          0,
      ) + 1;

    this.lastVerifiedAt =
      new Date();

    if (codeChanged) {
      if (
        this.aiReviewStatus ===
          "completed" ||
        this.aiReviewStatus ===
          "failed"
      ) {
        this.aiReviewStatus =
          "stale";
      }

      this.aiReviewCodeHash =
        "";
    }

    await this.save();

    return this;
  };

const ZipProjectFile =
  mongoose.models
    .ZipProjectFile ||
  mongoose.model(
    "ZipProjectFile",
    zipProjectFileSchema,
  );

module.exports =
  ZipProjectFile;