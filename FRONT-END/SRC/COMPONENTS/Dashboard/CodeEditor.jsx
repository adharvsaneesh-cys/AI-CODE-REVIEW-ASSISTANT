import Editor from "@monaco-editor/react";

import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AnalysisContext } from "../../context/analysis-context";

import {
  analyzePastedCode,
  getZipProjectFiles,
  getZipProjectFileSource,
  generateZipFileAiReview,
  verifyZipProjectFile,
  downloadSecuredZip,
} from "../../services/scan";

import "./CodeEditor.css";

const LANGUAGE_OPTIONS = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
];

const extensionByLanguage = {
  python: "py",
  javascript: "js",
  typescript: "ts",
  cpp: "cpp",
  c: "c",
  java: "java",
  go: "go",
  php: "php",
  ruby: "rb",
  rust: "rs",
};

function getSeverity(value) {
  const severity = String(
    value || "medium",
  ).toLowerCase();

  if (
    [
      "critical",
      "high",
      "medium",
      "low",
      "info",
    ].includes(severity)
  ) {
    return severity;
  }

  return "medium";
}

function formatOwasp(owasp) {
  if (!owasp) {
    return "Not applicable";
  }

  if (
    typeof owasp === "string"
  ) {
    return owasp;
  }

  const id =
    owasp.id ||
    "Not applicable";

  const category =
    owasp.category ||
    "Not applicable";

  return `${id} - ${category}`;
}

function getSecuredFileName(
  fileName,
  language,
) {
  const extension =
    extensionByLanguage[
      language
    ] || "txt";

  let base =
    String(
      fileName ||
        "source-code",
    )
      .trim()
      .replace(
        /[<>:"/\\|?*]+/g,
        "-",
      )
      .replace(
        /\.[^.]+$/,
        "",
      )
      .replace(
        /-codeguard-secured$/i,
        "",
      );

  if (!base) {
    base =
      "source-code";
  }

  return `${base}-codeguard-secured.${extension}`;
}

function getMimeType(
  language,
) {
  const types = {
    python:
      "text/x-python;charset=utf-8",

    javascript:
      "text/javascript;charset=utf-8",

    typescript:
      "text/typescript;charset=utf-8",

    cpp:
      "text/x-c++src;charset=utf-8",

    c:
      "text/x-csrc;charset=utf-8",

    java:
      "text/x-java-source;charset=utf-8",
  };

  return (
    types[language] ||
    "text/plain;charset=utf-8"
  );
}

function buildSecureSuggestion({
  issue,
  language,
  currentLine,
}) {
  const ruleId =
    String(
      issue?.ruleId || "",
    ).toLowerCase();

  const line =
    String(
      currentLine || "",
    );

  if (
    ruleId ===
      "eval-usage" &&
    language ===
      "python"
  ) {
    const replacement =
      line.replace(
        /\beval\s*\(/,
        "ast.literal_eval(",
      );

    return {
      code:
        replacement,

      imports: [
        "import ast",
      ],

      autoApplicable:
        replacement !==
        line,

      explanation:
        "Replace eval() with ast.literal_eval() when parsing Python literals. This prevents arbitrary code execution.",
    };
  }

  if (
    ruleId ===
    "hardcoded-password"
  ) {
    if (
      language ===
      "python"
    ) {
      const match =
        line.match(
          /^(\s*)([A-Za-z_]\w*)\s*=/,
        );

      if (!match) {
        return {
          code:
            issue?.recommendation ||
            "Manual security review required.",

          imports: [],

          autoApplicable:
            false,

          explanation:
            "CodeGuard could not safely identify the password variable.",
        };
      }

      const indentation =
        match[1] || "";

      const variable =
        match[2];

      const replacement =
        `${indentation}${variable} = os.getenv("APP_PASSWORD")`;

      return {
        code:
          replacement,

        imports: [
          "import os",
        ],

        autoApplicable:
          replacement !==
          line,

        explanation:
          "Move the hardcoded password outside source code and load it from an environment variable.",
      };
    }

    if (
      language ===
        "javascript" ||
      language ===
        "typescript"
    ) {
      const match =
        line.match(
          /^(\s*)(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*=/,
        );

      if (!match) {
        return {
          code:
            issue?.recommendation ||
            "Manual security review required.",

          imports: [],

          autoApplicable:
            false,

          explanation:
            "CodeGuard could not safely identify the password variable.",
        };
      }

      const indentation =
        match[1] || "";

      const variable =
        match[2];

      const replacement =
        `${indentation}const ${variable} = process.env.APP_PASSWORD;`;

      return {
        code:
          replacement,

        imports: [],

        autoApplicable:
          replacement !==
          line,

        explanation:
          "Read the credential from the process environment instead of hardcoding it.",
      };
    }
  }

  if (
    ruleId ===
      "hardcoded-api-key" ||
    ruleId ===
      "weak-jwt-secret"
  ) {
    if (
      language ===
      "python"
    ) {
      const match =
        line.match(
          /^(\s*)([A-Za-z_]\w*)\s*=/,
        );

      if (!match) {
        return {
          code:
            issue?.recommendation ||
            "Manual security review required.",

          imports: [],

          autoApplicable:
            false,

          explanation:
            "CodeGuard could not safely identify the secret variable.",
        };
      }

      const indentation =
        match[1] || "";

      const variable =
        match[2];

      const environmentName =
        ruleId ===
        "weak-jwt-secret"
          ? "JWT_SECRET"
          : "API_KEY";

      const replacement =
        `${indentation}${variable} = os.getenv("${environmentName}")`;

      return {
        code:
          replacement,

        imports: [
          "import os",
        ],

        autoApplicable:
          replacement !==
          line,

        explanation:
          "Remove the secret from source code and load it securely from the environment.",
      };
    }

    if (
      language ===
        "javascript" ||
      language ===
        "typescript"
    ) {
      const match =
        line.match(
          /^(\s*)(?:(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*=/,
        );

      if (!match) {
        return {
          code:
            issue?.recommendation ||
            "Manual security review required.",

          imports: [],

          autoApplicable:
            false,

          explanation:
            "CodeGuard could not safely identify the secret variable.",
        };
      }

      const indentation =
        match[1] || "";

      const variable =
        match[2];

      const environmentName =
        ruleId ===
        "weak-jwt-secret"
          ? "JWT_SECRET"
          : "API_KEY";

      const replacement =
        `${indentation}const ${variable} = process.env.${environmentName};`;

      return {
        code:
          replacement,

        imports: [],

        autoApplicable:
          replacement !==
          line,

        explanation:
          "Remove the secret from source code and load it from the process environment.",
      };
    }
  }

  if (
    ruleId ===
    "weak-hash"
  ) {
    const replacement =
      line
        .replace(
          /hashlib\.md5/g,
          "hashlib.sha256",
        )
        .replace(
          /hashlib\.sha1/g,
          "hashlib.sha256",
        )
        .replace(
          /createHash\(\s*["']md5["']\s*\)/gi,
          'createHash("sha256")',
        )
        .replace(
          /createHash\(\s*["']sha1["']\s*\)/gi,
          'createHash("sha256")',
        );

    return {
      code:
        replacement,

      imports: [],

      autoApplicable:
        replacement !==
        line,

      explanation:
        "Replace weak MD5/SHA-1 hashing with SHA-256 for general integrity hashing.",
    };
  }

  if (
    ruleId ===
    "tls-verification-disabled"
  ) {
    const replacement =
      line
        .replace(
          /verify\s*=\s*False/g,
          "verify=True",
        )
        .replace(
          /rejectUnauthorized\s*:\s*false/gi,
          "rejectUnauthorized: true",
        )
        .replace(
          /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0["']?/gi,
          'NODE_TLS_REJECT_UNAUTHORIZED = "1"',
        );

    return {
      code:
        replacement,

      imports: [],

      autoApplicable:
        replacement !==
        line,

      explanation:
        "Keep TLS certificate verification enabled.",
    };
  }

  if (
    ruleId ===
    "debug-mode"
  ) {
    const replacement =
      line
        .replace(
          /debug\s*=\s*True/g,
          "debug=False",
        )
        .replace(
          /DEBUG\s*=\s*true/g,
          "DEBUG = false",
        )
        .replace(
          /DEBUG\s*:\s*true/g,
          "DEBUG: false",
        );

    return {
      code:
        replacement,

      imports: [],

      autoApplicable:
        replacement !==
        line,

      explanation:
        "Disable application debug mode outside development environments.",
    };
  }

  if (
    ruleId ===
      "sql-injection" ||
    ruleId ===
      "command-construction" ||
    ruleId ===
      "shell-command" ||
    ruleId ===
      "unsafe-pickle" ||
    ruleId ===
      "path-traversal" ||
    ruleId ===
      "open-redirect" ||
    ruleId ===
      "unsafe-file-upload" ||
    ruleId ===
      "sensitive-logging"
  ) {
    return {
      code:
        issue?.recommendation ||
        "Manual security review required.",

      imports: [],

      autoApplicable:
        false,

      explanation:
        issue?.recommendation ||
        "This vulnerability depends on surrounding application logic and should not be modified automatically.",
    };
  }

  return {
    code:
      issue?.recommendation ||
      "Manual security review required.",

    imports: [],

    autoApplicable:
      false,

    explanation:
      issue?.recommendation ||
      "This vulnerability requires contextual review.",
  };
}

export default function CodeEditor() {
  const {
    analysisResult,
    setAnalysisResult,

    selectedProjectId,
    refreshScans,

    editorCode,
    setEditorCode,

    editorLanguage,
    setEditorLanguage,

    editorFileName,
    setEditorFileName,
  } = useContext(
    AnalysisContext,
  );

  const editorRef =
    useRef(null);

  const decorationsRef =
    useRef(null);

  const [
    activeZipFilePath,
    setActiveZipFilePath,
  ] = useState("");

  const zipDraftsRef =
    useRef({});

  const currentZipFilePathRef =
    useRef("");

  const zipHydratedScanRef =
    useRef("");

  const zipLoadRequestRef =
    useRef(0);

  const zipAiRequestRef =
    useRef(0);

  const isZipScan =
    analysisResult?.sourceType ===
    "zip";

  const zipFiles =
    useMemo(
      () =>
        isZipScan &&
        Array.isArray(
          analysisResult
            ?.zipMetadata
            ?.files,
        )
          ? analysisResult
              .zipMetadata
              .files
          : [],
      [
        isZipScan,
        analysisResult,
      ],
    );

  const activeZipFile =
    useMemo(
      () =>
        zipFiles.find(
          (file) =>
            file.path ===
            activeZipFilePath,
        ) || null,
      [
        zipFiles,
        activeZipFilePath,
      ],
    );

  const [
    selectedIssue,
    setSelectedIssue,
  ] = useState(null);

  const [
    rescanning,
    setRescanning,
  ] = useState(false);

  const [
    downloadingZip,
    setDownloadingZip,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    beforeScore,
    setBeforeScore,
  ] = useState(null);

  const [
    beforeIssues,
    setBeforeIssues,
  ] = useState(null);

  const [
    afterScore,
    setAfterScore,
  ] = useState(null);

  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    fixesApplied,
    setFixesApplied,
  ] = useState(false);

  const [
    theme,
    setTheme,
  ] = useState(() => {
    return (
      document.documentElement.getAttribute(
        "data-theme",
      ) ||
      localStorage.getItem(
        "dashboardTheme",
      ) ||
      "dark"
    );
  });

  useEffect(() => {
    const updateTheme =
      () => {
        setTheme(
          document.documentElement.getAttribute(
            "data-theme",
          ) ||
            "dark",
        );
      };

    updateTheme();

    const observer =
      new MutationObserver(
        updateTheme,
      );

    observer.observe(
      document.documentElement,
      {
        attributes: true,

        attributeFilter: [
          "data-theme",
        ],
      },
    );

    return () =>
      observer.disconnect();
  }, []);

  const issues =
    useMemo(() => {
      if (isZipScan) {
        if (!activeZipFilePath) {
          return [];
        }

        if (
          Array.isArray(
            activeZipFile?.issues,
          )
        ) {
          return activeZipFile.issues;
        }

        return Array.isArray(
          analysisResult?.issues,
        )
          ? analysisResult.issues.filter(
              (issue) =>
                issue.filePath ===
                activeZipFilePath,
            )
          : [];
      }

      return Array.isArray(
        analysisResult?.issues,
      )
        ? analysisResult.issues
        : [];
    }, [
      isZipScan,
      activeZipFilePath,
      activeZipFile,
      analysisResult,
    ]);

  async function loadZipAiReview(
    filePath,
    force = false,
  ) {
    const scanId =
      analysisResult?._id;

    if (
      !isZipScan ||
      !scanId ||
      !filePath
    ) {
      return;
    }

    const requestId =
      zipAiRequestRef.current +
      1;

    zipAiRequestRef.current =
      requestId;

    setAnalysisResult(
      (current) => {
        if (
          !current ||
          current._id !==
            scanId
        ) {
          return current;
        }

        return {
          ...current,
          aiReview: {
            available: false,
            summary:
              `Reviewing ${filePath} with Gemini...`,
            riskLevel:
              "unknown",
            priorityActions: [],
            detailedFindings: [],
            codeQualitySuggestions: [],
            finalChecklist: [],
            error: null,
          },
        };
      },
    );

    try {
      const result =
        await generateZipFileAiReview({
          scanId,
          filePath,
          force,
        });

      if (
        requestId !==
          zipAiRequestRef.current ||
        currentZipFilePathRef.current !==
          filePath
      ) {
        return;
      }

      const reviewedFile =
        result?.file;

      if (!reviewedFile) {
        throw new Error(
          "The backend did not return the selected file AI review.",
        );
      }

      const review =
        reviewedFile.aiReview || {
          available: false,
          summary:
            `No AI review is available for ${filePath}.`,
          riskLevel:
            "unknown",
          priorityActions: [],
          detailedFindings: [],
          codeQualitySuggestions: [],
          finalChecklist: [],
          error:
            "AI review unavailable.",
        };

      setAnalysisResult(
        (current) => {
          if (
            !current ||
            current._id !==
              scanId ||
            currentZipFilePathRef.current !==
              filePath
          ) {
            return current;
          }

          const currentFiles =
            Array.isArray(
              current
                ?.zipMetadata
                ?.files,
            )
              ? current
                  .zipMetadata
                  .files
              : [];

          return {
            ...current,
            aiReview:
              review,

            zipMetadata: {
              ...current.zipMetadata,

              geminiReviewedFile:
                filePath,

              files:
                currentFiles.map(
                  (currentFile) =>
                    currentFile.path ===
                    filePath
                      ? {
                          ...currentFile,
                          aiReview:
                            review,
                          aiReviewStatus:
                            reviewedFile.aiReviewStatus,
                          aiReviewedAt:
                            reviewedFile.aiReviewedAt,
                        }
                      : currentFile,
                ),
            },
          };
        },
      );
    } catch (error) {
      if (
        requestId !==
          zipAiRequestRef.current ||
        currentZipFilePathRef.current !==
          filePath
      ) {
        return;
      }

      setAnalysisResult(
        (current) => {
          if (
            !current ||
            current._id !==
              scanId
          ) {
            return current;
          }

          return {
            ...current,
            aiReview: {
              available: false,
              summary:
                `Gemini review failed for ${filePath}.`,
              riskLevel:
                "unknown",
              priorityActions: [],
              detailedFindings: [],
              codeQualitySuggestions: [],
              finalChecklist: [],
              error:
                error.message ||
                "Unable to generate the selected file AI review.",
            },
          };
        },
      );
    }
  }

  async function loadZipFile(
    file,
  ) {
    if (!file) {
      return;
    }

    const currentPath =
      currentZipFilePathRef.current;

    if (currentPath) {
      zipDraftsRef.current[
        currentPath
      ] =
        editorRef.current
          ?.getModel()
          ?.getValue() ??
        editorCode ??
        "";
    }

    const nextPath =
      file.path;

    currentZipFilePathRef.current =
      nextPath;

    setActiveZipFilePath(
      nextPath,
    );

    loadZipAiReview(
      nextPath,
    );

    setEditorLanguage(
      file.language ||
        "javascript",
    );

    setEditorFileName(
      file.path ||
        file.fileName ||
        "zip-source",
    );

    setSelectedIssue(
      null,
    );

    setBeforeScore(
      null,
    );

    setBeforeIssues(
      null,
    );

    setAfterScore(
      null,
    );

    setFixesApplied(
      false,
    );

    const hasDraft =
      Object.prototype
        .hasOwnProperty.call(
          zipDraftsRef.current,
          nextPath,
        );

    if (hasDraft) {
      setEditorCode(
        zipDraftsRef.current[
          nextPath
        ],
      );

      setMessage("");
      return;
    }

    const scanId =
      analysisResult?._id;

    if (!scanId) {
      const fallbackCode =
        file.code || "";

      zipDraftsRef.current[
        nextPath
      ] = fallbackCode;

      setEditorCode(
        fallbackCode,
      );

      setMessage("");
      return;
    }

    const requestId =
      zipLoadRequestRef.current +
      1;

    zipLoadRequestRef.current =
      requestId;

    setMessage(
      `Loading ${nextPath}...`,
    );

    try {
      const result =
        await getZipProjectFileSource({
          scanId,
          filePath:
            nextPath,
        });

      if (
        requestId !==
          zipLoadRequestRef.current ||
        currentZipFilePathRef.current !==
          nextPath
      ) {
        return;
      }

      const persistedFile =
        result?.file;

      if (!persistedFile) {
        throw new Error(
          "The backend did not return the ZIP project file source.",
        );
      }

      const persistedCode =
        typeof persistedFile.code ===
        "string"
          ? persistedFile.code
          : typeof persistedFile.currentCode ===
              "string"
            ? persistedFile.currentCode
            : "";

      zipDraftsRef.current[
        nextPath
      ] = persistedCode;

      setEditorCode(
        persistedCode,
      );

      setEditorLanguage(
        persistedFile.language ||
          file.language ||
          "javascript",
      );

      setEditorFileName(
        persistedFile.path ||
          nextPath,
      );

      setAnalysisResult(
        (current) => {
          if (
            !current ||
            current._id !==
              scanId
          ) {
            return current;
          }

          const currentFiles =
            Array.isArray(
              current
                ?.zipMetadata
                ?.files,
            )
              ? current
                  .zipMetadata
                  .files
              : [];

          return {
            ...current,

            zipMetadata: {
              ...current.zipMetadata,

              files:
                currentFiles.map(
                  (currentFile) =>
                    currentFile.path ===
                    nextPath
                      ? {
                          ...currentFile,
                          ...persistedFile,
                          code:
                            persistedCode,
                        }
                      : currentFile,
                ),
            },
          };
        },
      );

      setMessage("");
    } catch (error) {
      if (
        requestId !==
          zipLoadRequestRef.current ||
        currentZipFilePathRef.current !==
          nextPath
      ) {
        return;
      }

      const fallbackCode =
        file.code || "";

      if (fallbackCode) {
        zipDraftsRef.current[
          nextPath
        ] = fallbackCode;

        setEditorCode(
          fallbackCode,
        );
      }

      setMessage(
        error.message ||
          "Unable to load the persisted ZIP project file.",
      );
    }
  }
    useEffect(() => {
    if (!isZipScan) {
      zipHydratedScanRef.current =
        "";

      zipLoadRequestRef.current +=
        1;

      zipAiRequestRef.current +=
        1;

      if (
        currentZipFilePathRef.current
      ) {
        currentZipFilePathRef.current =
          "";
      }

      if (activeZipFilePath) {
        setActiveZipFilePath(
          "",
        );
      }

      zipDraftsRef.current = {};
      return;
    }

    const scanId =
      analysisResult?._id;

    if (!scanId) {
      return;
    }

    if (
      zipHydratedScanRef.current ===
      scanId
    ) {
      return;
    }

    zipHydratedScanRef.current =
      scanId;

    zipLoadRequestRef.current +=
      1;

    zipAiRequestRef.current +=
      1;

    currentZipFilePathRef.current =
      "";

    setActiveZipFilePath(
      "",
    );

    zipDraftsRef.current = {};

    let cancelled = false;

    async function hydrateZipProject() {
      try {
        setMessage(
          "Loading persisted ZIP project files...",
        );

        const result =
          await getZipProjectFiles(
            scanId,
          );

        if (cancelled) {
          return;
        }

        const persistedFiles =
          Array.isArray(
            result?.files,
          )
            ? result.files
            : [];

        if (!persistedFiles.length) {
          throw new Error(
            "No persisted source files were found for this ZIP scan. Create a new ZIP scan with persistent storage enabled.",
          );
        }

        const firstFile =
          [...persistedFiles].sort(
            (a, b) => {
              const issueDifference =
                (b.issueTotal || 0) -
                (a.issueTotal || 0);

              if (
                issueDifference !== 0
              ) {
                return issueDifference;
              }

              return (
                (a.securityScore ??
                  100) -
                (b.securityScore ??
                  100)
              );
            },
          )[0];

        setAnalysisResult(
          (current) => {
            if (
              !current ||
              current._id !==
                scanId
            ) {
              return current;
            }

            return {
              ...current,

              zipMetadata: {
                ...current.zipMetadata,

                archiveName:
                  result.archiveName ||
                  current
                    .zipMetadata
                    ?.archiveName,

                files:
                  persistedFiles,
              },
            };
          },
        );

        await loadZipFile(
          firstFile,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        zipHydratedScanRef.current =
          "";

        setMessage(
          error.message ||
            "Unable to load persisted ZIP project files.",
        );
      }
    }

    hydrateZipProject();

    return () => {
      cancelled = true;
    };
  }, [
    isZipScan,
    analysisResult?._id,
  ]);

  function handleZipFileChange(
    event,
  ) {
    const nextFile =
      zipFiles.find(
        (file) =>
          file.path ===
          event.target.value,
      );

    if (nextFile) {
      loadZipFile(
        nextFile,
      );
    }
  }

  const suggestions =
    useMemo(() => {
      const lines =
        String(
          editorCode || "",
        ).split(
          /\r?\n/,
        );

      return issues.map(
        (issue) => ({
          issue,

          suggestion:
            buildSecureSuggestion({
              issue,

              language:
                editorLanguage,

              currentLine:
                lines[
                  Number(
                    issue.line,
                  ) - 1
                ] || "",
            }),
        }),
      );
    }, [
      issues,
      editorCode,
      editorLanguage,
    ]);

  const safeFixes =
    useMemo(
      () =>
        suggestions.filter(
          ({
            issue,
            suggestion,
          }) => {
            const line =
              Number(
                issue?.line,
              );

            return (
              suggestion
                ?.autoApplicable ===
                true &&
              Number.isInteger(
                line,
              ) &&
              line >= 1
            );
          },
        ),
      [suggestions],
    );

  const safeFixGroups =
    useMemo(() => {
      const groups =
        new Map();

      safeFixes.forEach(
        ({
          issue,
          suggestion,
        }) => {
          const line =
            Number(
              issue.line,
            );

          if (
            !groups.has(
              line,
            )
          ) {
            groups.set(
              line,
              [],
            );
          }

          const group =
            groups.get(
              line,
            );

          const duplicate =
            group.some(
              (item) =>
                item.issue
                  .ruleId ===
                issue.ruleId,
            );

          if (!duplicate) {
            group.push({
              issue,
              suggestion,
            });
          }
        },
      );

      return [
        ...groups.entries(),
      ]
        .map(
          ([
            line,
            fixes,
          ]) => ({
            line,
            fixes,
          }),
        )
        .sort(
          (a, b) =>
            b.line -
            a.line,
        );
    }, [safeFixes]);

  const safeCodeChanges =
    safeFixGroups.length;

  const safeFindingsCovered =
    safeFixGroups.reduce(
      (
        total,
        group,
      ) =>
        total +
        group.fixes.length,
      0,
    );

  function getAutoFixPriority(
    ruleId,
  ) {
    const priorities = {
      "hardcoded-api-key":
        10,

      "hardcoded-password":
        20,

      "weak-jwt-secret":
        30,

      "weak-hash":
        20,

      "tls-verification-disabled":
        30,

      "debug-mode":
        20,

      "eval-usage":
        30,
    };

    return (
      priorities[
        String(
          ruleId || "",
        ).toLowerCase()
      ] || 0
    );
  }

  const currentSuggestion =
    selectedIssue
      ? suggestions.find(
          ({ issue }) =>
            issue ===
            selectedIssue,
        )?.suggestion
      : null;

  useEffect(() => {
    if (
      issues.length > 0 &&
      !selectedIssue
    ) {
      setSelectedIssue(
        issues[0],
      );
    }

    if (
      issues.length === 0
    ) {
      setSelectedIssue(
        null,
      );
    }
  }, [
    issues,
    selectedIssue,
  ]);

  const applyHighlights =
    () => {
      const editor =
        editorRef.current;

      if (!editor) {
        return;
      }

      const model =
        editor.getModel();

      if (!model) {
        return;
      }

      const decorations =
        issues
          .filter(
            (issue) => {
              const line =
                Number(
                  issue.line,
                );

              return (
                Number.isInteger(
                  line,
                ) &&
                line >= 1 &&
                line <=
                  model.getLineCount()
              );
            },
          )
          .map(
            (issue) => {
              const line =
                Number(
                  issue.line,
                );

              const severity =
                getSeverity(
                  issue.severity,
                );

              return {
                range: {
                  startLineNumber:
                    line,

                  startColumn:
                    1,

                  endLineNumber:
                    line,

                  endColumn:
                    model.getLineMaxColumn(
                      line,
                    ),
                },

                options: {
                  isWholeLine:
                    true,

                  className:
                    `vulnerability-line vulnerability-${severity}`,

                  linesDecorationsClassName:
                    `vulnerability-glyph vulnerability-glyph-${severity}`,

                  hoverMessage: {
                    value:
                      `### ${issue.title}\n\n` +
                      `**Severity:** ${severity.toUpperCase()}\n\n` +
                      `**OWASP:** ${formatOwasp(
                        issue.owasp,
                      )}\n\n` +
                      `**CWE:** ${
                        issue.cwe ||
                        "Not applicable"
                      }\n\n` +
                      "Use Secure Remediation below for guidance.",
                  },
                },
              };
            },
          );

      decorationsRef.current
        ?.clear();

      decorationsRef.current =
        editor.createDecorationsCollection(
          decorations,
        );
    };

  useEffect(() => {
    applyHighlights();
  }, [
    analysisResult,
    editorCode,
    activeZipFilePath,
  ]);

  function rememberBaseline() {
    if (
      beforeScore !== null
    ) {
      return;
    }

    setBeforeScore(
      isZipScan
        ? activeZipFile
            ?.securityScore ??
          100
        : analysisResult
            ?.securityScore ??
          100,
    );

    setBeforeIssues(
      issues.length,
    );
  }

  function addImports(
    lines,
    imports,
  ) {
    const cleanImports =
      [
        ...new Set(
          imports.filter(
            Boolean,
          ),
        ),
      ];

    const missing =
      cleanImports.filter(
        (item) =>
          !lines.some(
            (line) =>
              line.trim() ===
              item.trim(),
          ),
      );

    if (
      !missing.length
    ) {
      return lines;
    }

    if (
      editorLanguage ===
      "python"
    ) {
      const modules =
        missing
          .map(
            (item) => {
              const match =
                item
                  .trim()
                  .match(
                    /^import\s+([A-Za-z_][\w.]*)$/,
                  );

              return match?.[1];
            },
          )
          .filter(
            Boolean,
          );

      if (
        modules.length ===
        missing.length
      ) {
        const combined =
          `import ${[
            ...new Set(
              modules,
            ),
          ].join(", ")}`;

        const blankIndex =
          lines.findIndex(
            (
              line,
              index,
            ) =>
              index < 80 &&
              line.trim() ===
                "",
          );

        if (
          blankIndex !== -1
        ) {
          const next =
            [...lines];

          next[
            blankIndex
          ] =
            combined;

          return next;
        }

        const importIndex =
          lines.findIndex(
            (
              line,
              index,
            ) =>
              index < 80 &&
              /^import\s+/.test(
                line.trim(),
              ),
          );

        if (
          importIndex !== -1
        ) {
          const existing =
            lines[
              importIndex
            ]
              .trim()
              .replace(
                /^import\s+/,
                "",
              )
              .split(",")
              .map(
                (item) =>
                  item.trim(),
              )
              .filter(
                Boolean,
              );

          const next =
            [...lines];

          next[
            importIndex
          ] =
            `import ${[
              ...new Set([
                ...existing,
                ...modules,
              ]),
            ].join(", ")}`;

          return next;
        }
      }
    }

    return [
      ...missing,
      "",
      ...lines,
    ];
  }

  async function persistGuardedZipFix(updatedCode, targetRuleId = "") {
    const scanId = analysisResult?._id;
    const verifiedPath = activeZipFilePath;

    if (!scanId || !verifiedPath) {
      setMessage("Select a ZIP project file before applying a secure fix.");
      return false;
    }

    setRescanning(true);
    setMessage(`Validating secure fix for ${verifiedPath}...`);

    try {
      const result = await verifyZipProjectFile({
        scanId,
        filePath: verifiedPath,
        code: updatedCode,
        guardRemediation: true,
        targetRuleId,
      });

      const verifiedFile = result?.file;

      if (!verifiedFile) {
        throw new Error("The backend did not return the ZIP project file.");
      }

      const persistedCode =
        typeof verifiedFile.code === "string"
          ? verifiedFile.code
          : typeof verifiedFile.currentCode === "string"
            ? verifiedFile.currentCode
            : editorCode;

      zipDraftsRef.current[verifiedPath] = persistedCode;
      setEditorCode(persistedCode);

      const model = editorRef.current?.getModel();
      if (model && model.getValue() !== persistedCode) {
        model.setValue(persistedCode);
      }

      setAnalysisResult((current) => {
        if (!current || current._id !== scanId) {
          return current;
        }

        const currentFiles = Array.isArray(current?.zipMetadata?.files)
          ? current.zipMetadata.files
          : [];

        return {
          ...current,
          securityScore: result.scan?.securityScore ?? current.securityScore,
          issueCount: result.scan?.issueCount ?? current.issueCount,
          issues: Array.isArray(result.scan?.issues)
            ? result.scan.issues
            : current.issues,
          zipMetadata: {
            ...current.zipMetadata,
            files: currentFiles.map((file) =>
              file.path === verifiedPath
                ? { ...file, ...verifiedFile, code: persistedCode }
                : file,
            ),
          },
        };
      });

      setAfterScore(verifiedFile.securityScore ?? 100);
      setSelectedIssue(null);
      decorationsRef.current?.clear();

      if (result.accepted === false) {
        setFixesApplied(false);
        setMessage(
          result.message ||
            `Secure fix rejected for ${verifiedPath}. The last verified source was restored.`,
        );

        if (typeof refreshScans === "function") {
          await refreshScans();
        }

        return false;
      }

      setFixesApplied(false);
      setMessage(`Secure fix verified for ${verifiedPath}. Refreshing Gemini review...`);
      await loadZipAiReview(verifiedPath, true);

      if (currentZipFilePathRef.current === verifiedPath) {
        setMessage(`Secure fix accepted and verified for ${verifiedPath}.`);
      }

      if (typeof refreshScans === "function") {
        await refreshScans();
      }

      return true;
    } catch (error) {
      setMessage(error.message || "Unable to validate the secure fix.");
      return false;
    } finally {
      setRescanning(false);
    }
  }

  async function applySingleFix() {
    if (!selectedIssue) {
      return;
    }

    rememberBaseline();

    let lines = String(editorCode || "").split(/\r?\n/);
    const index = Number(selectedIssue.line) - 1;

    if (index < 0 || index >= lines.length) {
      setMessage(
        isZipScan
          ? "The selected finding no longer matches the editor. Run Verify Project File to refresh the findings."
          : "The selected finding no longer matches the editor. Run Verify Secured Code to refresh the findings.",
      );
      return;
    }

    const freshSuggestion = buildSecureSuggestion({
      issue: selectedIssue,
      language: editorLanguage,
      currentLine: lines[index],
    });

    if (!freshSuggestion?.autoApplicable) {
      setMessage(
        isZipScan
          ? "This finding is already fixed or requires manual review."
          : "This finding is already fixed or requires manual review. Run Verify Secured Code to refresh the findings.",
      );
      return;
    }

    if (!freshSuggestion.code || freshSuggestion.code === lines[index]) {
      setMessage("This secure replacement is already present.");
      return;
    }

    lines[index] = freshSuggestion.code;
    lines = addImports(lines, freshSuggestion.imports || []);
    const updatedCode = lines.join("\n");

    if (isZipScan) {
      await persistGuardedZipFix(updatedCode, String(selectedIssue.ruleId || ""));
      return;
    }

    setEditorCode(updatedCode);
    const model = editorRef.current?.getModel();
    if (model && model.getValue() !== updatedCode) {
      model.setValue(updatedCode);
    }
    decorationsRef.current?.clear();
    setMessage("Secure fix applied. Click Verify Secured Code to refresh the security findings.");
  }

  async function fixAllSafeIssues() {
    if (safeFixGroups.length === 0) {
      setMessage(
        fixesApplied
          ? isZipScan
            ? "Safe fixes have already been applied."
            : "Safe fixes have already been applied. Click Verify Secured Code to refresh the findings."
          : "No deterministic fixes are available. Remaining findings require manual review.",
      );
      return;
    }

    rememberBaseline();

    const liveCode =
      editorRef.current?.getModel()?.getValue() ?? editorCode ?? "";
    let lines = String(liveCode).split(/\r?\n/);
    const imports = new Set();
    let codeChanges = 0;
    let findingsCovered = 0;

    safeFixGroups.forEach((group) => {
      const index = Number(group.line) - 1;
      if (index < 0 || index >= lines.length) {
        return;
      }

      let currentLine = lines[index];
      if (!currentLine?.trim()) {
        return;
      }

      const orderedFixes = [...group.fixes].sort(
        (first, second) =>
          getAutoFixPriority(second.issue.ruleId) -
          getAutoFixPriority(first.issue.ruleId),
      );

      let changed = false;

      for (const entry of orderedFixes) {
        const suggestion = buildSecureSuggestion({
          issue: entry.issue,
          language: editorLanguage,
          currentLine,
        });

        if (!suggestion?.autoApplicable || !suggestion.code || suggestion.code === currentLine) {
          continue;
        }

        currentLine = suggestion.code;
        (suggestion.imports || []).forEach((item) => imports.add(item));
        changed = true;
        findingsCovered += 1;
      }

      if (changed) {
        lines[index] = currentLine;
        codeChanges += 1;
      }
    });

    if (codeChanges === 0) {
      setFixesApplied(true);
      setMessage("The deterministic secure replacements are already present.");
      return;
    }

    lines = addImports(lines, [...imports]);
    const updatedCode = lines.join("\n");

    if (isZipScan) {
      await persistGuardedZipFix(updatedCode);
      return;
    }

    const model = editorRef.current?.getModel();
    if (model && model.getValue() !== updatedCode) {
      model.setValue(updatedCode);
    }

    setEditorCode(updatedCode);
    setFixesApplied(true);
    decorationsRef.current?.clear();
    setMessage(
      `${codeChanges} source ${codeChanges === 1 ? "change" : "changes"} applied, covering ${findingsCovered} ${findingsCovered === 1 ? "finding" : "findings"}. Now click Verify Secured Code.`,
    );
  }

    async function verifySecuredCode() {
    const liveCode =
      editorRef.current
        ?.getModel()
        ?.getValue() ??
      editorCode ??
      "";

    if (!liveCode.trim()) {
      setMessage(
        "There is no source code to verify.",
      );

      return;
    }

    if (
      isZipScan &&
      !activeZipFilePath
    ) {
      setMessage(
        "Select a ZIP project file before verification.",
      );

      return;
    }

    if (
      !isZipScan &&
      !selectedProjectId
    ) {
      setMessage(
        "Select a project before verification.",
      );

      return;
    }

    setRescanning(
      true,
    );

    setMessage(
      isZipScan
        ? `Verifying ${activeZipFilePath}...`
        : "Verifying secured code...",
    );

    try {
      if (isZipScan) {
        const scanId =
          analysisResult?._id;

        if (!scanId) {
          throw new Error(
            "ZIP scan ID is missing.",
          );
        }

        const verifiedPath =
          activeZipFilePath;

        const result =
          await verifyZipProjectFile({
            scanId,
            filePath:
              verifiedPath,
            code:
              liveCode,
          });

        const verifiedFile =
          result?.file;

        if (!verifiedFile) {
          throw new Error(
            "The backend did not return the verified ZIP project file.",
          );
        }

        const persistedCode =
          typeof verifiedFile.code ===
          "string"
            ? verifiedFile.code
            : typeof verifiedFile.currentCode ===
                "string"
              ? verifiedFile.currentCode
              : liveCode;

        zipDraftsRef.current[
          verifiedPath
        ] = persistedCode;

        setEditorCode(
          persistedCode,
        );

        setEditorLanguage(
          verifiedFile.language ||
            editorLanguage,
        );

        setEditorFileName(
          verifiedFile.path ||
            verifiedPath,
        );

        setAnalysisResult(
          (current) => {
            if (
              !current ||
              current._id !==
                scanId
            ) {
              return current;
            }

            const currentFiles =
              Array.isArray(
                current
                  ?.zipMetadata
                  ?.files,
              )
                ? current
                    .zipMetadata
                    .files
                : [];

            return {
              ...current,

              securityScore:
                result.scan?.securityScore ??
                current.securityScore,

              issueCount:
                result.scan?.issueCount ??
                current.issueCount,

              issues:
                Array.isArray(
                  result.scan?.issues,
                )
                  ? result.scan.issues
                  : current.issues,

              zipMetadata: {
                ...current.zipMetadata,

                files:
                  currentFiles.map(
                    (
                      currentFile,
                    ) =>
                      currentFile.path ===
                      verifiedPath
                        ? {
                            ...currentFile,
                            ...verifiedFile,
                            code:
                              persistedCode,
                          }
                        : currentFile,
                  ),
              },
            };
          },
        );

        if (result.accepted === false) {
          setAfterScore(
            verifiedFile.securityScore ??
              100,
          );

          setSelectedIssue(
            null,
          );

          setFixesApplied(
            false,
          );

          decorationsRef.current
            ?.clear();

          setMessage(
            result.message ||
              `Fix rejected for ${verifiedPath}. The last verified source was restored.`,
          );

          if (
            typeof refreshScans ===
            "function"
          ) {
            await refreshScans();
          }

          return;
        }

        setBeforeScore(
          (current) =>
            current ??
            activeZipFile
              ?.securityScore ??
            100,
        );

        setBeforeIssues(
          (current) =>
            current ??
            issues.length,
        );

        setAfterScore(
          verifiedFile.securityScore ??
            100,
        );

        setSelectedIssue(
          null,
        );

        setFixesApplied(
          false,
        );

        setMessage(
          `Verification completed for ${verifiedPath}. Refreshing its Gemini AI review...`,
        );

        await loadZipAiReview(
          verifiedPath,
          true,
        );

        if (
          currentZipFilePathRef.current ===
          verifiedPath
        ) {
          setMessage(
            `Verification and Gemini AI review completed for ${verifiedPath}.`,
          );
        }

        if (
          typeof refreshScans ===
          "function"
        ) {
          await refreshScans();
        }

        return;
      }

      const result =
        await analyzePastedCode({
          projectId:
            selectedProjectId,

          language:
            editorLanguage,

          fileName:
            editorFileName,

          code:
            liveCode,
        });

      const nextResult =
        result.scan ||
        result;

      setAnalysisResult(
        nextResult,
      );

      setBeforeScore(
        (current) =>
          current ??
          analysisResult
            ?.securityScore ??
          100,
      );

      setBeforeIssues(
        (current) =>
          current ??
          issues.length,
      );

      setAfterScore(
        nextResult
          ?.securityScore ??
          100,
      );

      setSelectedIssue(
        null,
      );

      setFixesApplied(
        false,
      );

      setMessage(
        "Secured code verification completed.",
      );

      if (
        typeof refreshScans ===
        "function"
      ) {
        await refreshScans();
      }
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to verify secured code.",
      );
    } finally {
      setRescanning(
        false,
      );
    }
  }

  async function handleDownloadSecuredZip() {
    if (!isZipScan) {
      setMessage(
        "Secured ZIP download is only available for ZIP project scans.",
      );
      return;
    }

    const scanId =
      analysisResult?._id;

    if (!scanId) {
      setMessage(
        "ZIP scan ID is missing.",
      );
      return;
    }

    if (downloadingZip) {
      return;
    }

    setDownloadingZip(true);
    setMessage(
      "Building secured ZIP project...",
    );

    try {
      const result =
        await downloadSecuredZip(
          scanId,
        );

      setMessage(
        `Downloaded ${result?.fileName || "project-codeguard-secured.zip"}.`,
      );
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to download the secured ZIP project.",
      );
    } finally {
      setDownloadingZip(false);
    }
  }

  async function copyCode() {
    const liveCode =
      editorRef.current
        ?.getModel()
        ?.getValue() ??
      editorCode ??
      "";

    try {
      await navigator.clipboard.writeText(
        liveCode,
      );

      setCopied(
        true,
      );

      setMessage(
        "Secured code copied.",
      );

      window.setTimeout(
        () =>
          setCopied(
            false,
          ),
        1400,
      );
    } catch {
      setMessage(
        "Unable to copy code.",
      );
    }
  }

  function saveSecuredFile() {
    const liveCode =
      editorRef.current
        ?.getModel()
        ?.getValue() ??
      editorCode ??
      "";

    if (!liveCode) {
      setMessage(
        "There is no code to save.",
      );

      return;
    }

    const sourceName =
      isZipScan
        ? activeZipFilePath ||
          editorFileName
        : editorFileName;

    const fileName =
      getSecuredFileName(
        sourceName,
        editorLanguage,
      );

    const blob =
      new Blob(
        [liveCode],
        {
          type:
            getMimeType(
              editorLanguage,
            ),
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        "a",
      );

    anchor.href =
      url;

    anchor.download =
      fileName;

    document.body.appendChild(
      anchor,
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      url,
    );

    setMessage(
      `Saved ${fileName}.`,
    );
  }

  function handleEditorMount(
    editor,
  ) {
    editorRef.current =
      editor;

    applyHighlights();
  }

  function handleEditorChange(
    value,
  ) {
    const nextValue =
      value ?? "";

    setEditorCode(
      nextValue,
    );

    if (
      isZipScan &&
      activeZipFilePath
    ) {
      zipDraftsRef.current[
        activeZipFilePath
      ] = nextValue;
    }
  }

  function focusIssue(
    issue,
  ) {
    setSelectedIssue(
      issue,
    );

    const editor =
      editorRef.current;

    const line =
      Number(
        issue?.line,
      );

    if (
      !editor ||
      !Number.isInteger(
        line,
      ) ||
      line < 1
    ) {
      return;
    }

    editor.revealLineInCenter(
      line,
    );

    editor.setPosition({
      lineNumber:
        line,

      column: 1,
    });

    editor.focus();
  }

  const displayedSecurityScore =
    isZipScan
      ? activeZipFile
          ?.securityScore ??
        100
      : analysisResult
          ?.securityScore ??
        100;

  const aiReview =
    analysisResult
      ?.aiReview;

  const aiDetailedFindings =
    Array.isArray(
      aiReview
        ?.detailedFindings,
    )
      ? aiReview
          .detailedFindings
      : [];

  const aiPriorityActions =
    Array.isArray(
      aiReview
        ?.priorityActions,
    )
      ? aiReview
          .priorityActions
      : [];

  const aiQualitySuggestions =
    Array.isArray(
      aiReview
        ?.codeQualitySuggestions,
    )
      ? aiReview
          .codeQualitySuggestions
      : [];

  const aiChecklist =
    Array.isArray(
      aiReview
        ?.finalChecklist,
    )
      ? aiReview
          .finalChecklist
      : [];

  const displayedFileName =
    isZipScan
      ? activeZipFilePath ||
        "Select a project file"
      : editorFileName ||
        "source-code";

  const verificationLabel =
    isZipScan
      ? "Verify Project File"
      : "Verify Secured Code";

  const verificationBusyLabel =
    isZipScan
      ? "Verifying File..."
      : "Verifying...";

  return (
    <section className="code-editor">
      <div className="code-editor__topbar">
        <div className="code-editor__identity">
          <div className="code-editor__eyebrow">
            Secure Remediation
          </div>

          <h2 className="code-editor__title">
            Security Workspace
          </h2>

          <p className="code-editor__subtitle">
            Review deterministic findings,
            apply safe remediations,
            verify the secured source,
            and inspect Gemini security
            guidance for the active file.
          </p>
        </div>

        <div className="code-editor__score-card">
          <span className="code-editor__score-label">
            Security Score
          </span>

          <strong className="code-editor__score-value">
            {displayedSecurityScore}
          </strong>

          <span className="code-editor__score-max">
            /100
          </span>
        </div>
      </div>

      {isZipScan && (
        <div className="code-editor__zip-bar">
          <div className="code-editor__zip-info">
            <span className="code-editor__zip-label">
              ZIP Project
            </span>

            <strong>
              {analysisResult
                ?.zipMetadata
                ?.archiveName ||
                "Project archive"}
            </strong>
          </div>

          <label className="code-editor__zip-select-wrap">
            <span>
              Active source file
            </span>

            <select
              className="code-editor__zip-select"
              value={
                activeZipFilePath
              }
              onChange={
                handleZipFileChange
              }
              disabled={
                rescanning ||
                !zipFiles.length
              }
            >
              {!activeZipFilePath && (
                <option value="">
                  Select source file
                </option>
              )}

              {zipFiles.map(
                (file) => (
                  <option
                    key={
                      file.path
                    }
                    value={
                      file.path
                    }
                  >
                    {file.path}
                    {" • "}
                    {file.issueTotal ??
                      0}
                    {" "}
                    findings
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
      )}

      <div className="code-editor__toolbar">
        <div className="code-editor__file-block">
          <span className="code-editor__file-label">
            Active file
          </span>

          <strong className="code-editor__file-name">
            {displayedFileName}
          </strong>
        </div>

        <div className="code-editor__toolbar-actions">
          {!isZipScan && (
            <label className="code-editor__language-control">
              <span>
                Language
              </span>

              <select
                value={
                  editorLanguage
                }
                onChange={(
                  event,
                ) =>
                  setEditorLanguage(
                    event
                      .target
                      .value,
                  )
                }
                disabled={
                  rescanning
                }
              >
                {LANGUAGE_OPTIONS.map(
                  (
                    option,
                  ) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  ),
                )}
              </select>
            </label>
          )}

          <button
            type="button"
            className="code-editor__secondary-button"
            onClick={
              copyCode
            }
            disabled={
              !editorCode
            }
          >
            {copied
              ? "Copied"
              : "Copy Code"}
          </button>

          <button
            type="button"
            className="code-editor__secondary-button"
            onClick={
              saveSecuredFile
            }
            disabled={
              !editorCode
            }
          >
            Save Secured File
          </button>

          {isZipScan && (
            <button
              type="button"
              className="code-editor__secondary-button"
              onClick={
                handleDownloadSecuredZip
              }
              disabled={
                downloadingZip ||
                rescanning
              }
            >
              {downloadingZip
                ? "Building ZIP..."
                : "Download Secured ZIP"}
            </button>
          )}

          <button
            type="button"
            className="code-editor__verify-button"
            onClick={
              verifySecuredCode
            }
            disabled={
              rescanning ||
              !editorCode ||
              (isZipScan &&
                !activeZipFilePath)
            }
          >
            {rescanning
              ? verificationBusyLabel
              : verificationLabel}
          </button>
        </div>
      </div>

      {message && (
        <div className="code-editor__message">
          {message}
        </div>
      )}

      <div className="code-editor__workspace">
        <div className="code-editor__editor-panel">
          <div className="code-editor__panel-header">
            <div>
              <span className="code-editor__panel-kicker">
                Source
              </span>

              <h3>
                Secured Code Editor
              </h3>
            </div>

            <span className="code-editor__language-badge">
              {editorLanguage}
            </span>
          </div>

          <div className="code-editor__monaco">
            <Editor
              height="620px"
              language={
                editorLanguage
              }
              value={
                editorCode || ""
              }
              theme={
                theme ===
                "light"
                  ? "vs"
                  : "vs-dark"
              }
              onMount={
                handleEditorMount
              }
              onChange={
                handleEditorChange
              }
              options={{
                minimap: {
                  enabled:
                    false,
                },

                fontSize: 14,

                lineHeight: 23,

                scrollBeyondLastLine:
                  false,

                automaticLayout:
                  true,

                wordWrap:
                  "on",

                tabSize: 2,

                insertSpaces:
                  true,

                renderWhitespace:
                  "selection",

                padding: {
                  top: 16,
                  bottom: 16,
                },
              }}
            />
          </div>
        </div>

        <aside className="code-editor__findings-panel">
          <div className="code-editor__panel-header">
            <div>
              <span className="code-editor__panel-kicker">
                Deterministic Scan
              </span>

              <h3>
                Security Findings
              </h3>
            </div>

            <span className="code-editor__count-badge">
              {issues.length}
            </span>
          </div>

          {issues.length ===
          0 ? (
            <div className="code-editor__empty-state">
              <strong>
                No active findings
              </strong>

              <span>
                {isZipScan
                  ? "This project file currently has no deterministic findings."
                  : "The current scan has no deterministic findings."}
              </span>
            </div>
          ) : (
            <div className="code-editor__finding-list">
              {issues.map(
                (
                  issue,
                  index,
                ) => {
                  const severity =
                    getSeverity(
                      issue.severity,
                    );

                  const selected =
                    issue ===
                    selectedIssue;

                  return (
                    <button
                      type="button"
                      key={`${issue.ruleId || issue.title}-${issue.line}-${index}`}
                      className={`code-editor__finding-card ${
                        selected
                          ? "is-selected"
                          : ""
                      }`}
                      onClick={() =>
                        focusIssue(
                          issue,
                        )
                      }
                    >
                      <div className="code-editor__finding-top">
                        <span
                          className={`code-editor__severity code-editor__severity--${severity}`}
                        >
                          {severity}
                        </span>

                        <span className="code-editor__line-number">
                          Line{" "}
                          {issue.line ||
                            "—"}
                        </span>
                      </div>

                      <strong className="code-editor__finding-title">
                        {issue.title ||
                          "Security finding"}
                      </strong>

                      <span className="code-editor__finding-description">
                        {issue.description ||
                          issue.recommendation ||
                          "Review this security finding."}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          )}
        </aside>
      </div>

      <div className="code-editor__remediation-grid">
        <div className="code-editor__remediation-card">
          <div className="code-editor__panel-header">
            <div>
              <span className="code-editor__panel-kicker">
                Secure Fix
              </span>

              <h3>
                Selected Finding
              </h3>
            </div>
          </div>

          {selectedIssue ? (
            <>
              <div className="code-editor__selected-finding">
                <div className="code-editor__selected-heading">
                  <span
                    className={`code-editor__severity code-editor__severity--${getSeverity(
                      selectedIssue
                        .severity,
                    )}`}
                  >
                    {getSeverity(
                      selectedIssue
                        .severity,
                    )}
                  </span>

                  <strong>
                    {selectedIssue.title}
                  </strong>
                </div>

                <p>
                  {selectedIssue.description ||
                    "Security review required."}
                </p>

                <div className="code-editor__metadata-grid">
                  <div>
                    <span>
                      Line
                    </span>

                    <strong>
                      {selectedIssue.line ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      CWE
                    </span>

                    <strong>
                      {selectedIssue.cwe ||
                        "N/A"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      OWASP
                    </span>

                    <strong>
                      {formatOwasp(
                        selectedIssue.owasp,
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="code-editor__recommendation">
                <span>
                  Recommendation
                </span>

                <p>
                  {selectedIssue.recommendation ||
                    currentSuggestion
                      ?.explanation ||
                    "Review the surrounding application logic before changing this code."}
                </p>
              </div>

              {currentSuggestion && (
                <div className="code-editor__secure-preview">
                  <span>
                    Secure replacement
                  </span>

                  <pre>
                    <code>
                      {
                        currentSuggestion.code
                      }
                    </code>
                  </pre>

                  <p>
                    {
                      currentSuggestion.explanation
                    }
                  </p>
                </div>
              )}

              <button
                type="button"
                className="code-editor__apply-button"
                onClick={
                  applySingleFix
                }
                disabled={
                  !currentSuggestion
                    ?.autoApplicable
                }
              >
                {currentSuggestion
                  ?.autoApplicable
                  ? "Apply Secure Fix"
                  : "Manual Review Required"}
              </button>
            </>
          ) : (
            <div className="code-editor__empty-state">
              <strong>
                Select a finding
              </strong>

              <span>
                Choose a deterministic
                finding to inspect its
                remediation.
              </span>
            </div>
          )}
        </div>

        <div className="code-editor__remediation-card">
          <div className="code-editor__panel-header">
            <div>
              <span className="code-editor__panel-kicker">
                Automated Remediation
              </span>

              <h3>
                Safe Fixes
              </h3>
            </div>
          </div>

          <div className="code-editor__safe-fix-stats">
            <div>
              <strong>
                {safeCodeChanges}
              </strong>

              <span>
                source changes
              </span>
            </div>

            <div>
              <strong>
                {safeFindingsCovered}
              </strong>

              <span>
                findings covered
              </span>
            </div>
          </div>

          <p className="code-editor__safe-fix-copy">
            CodeGuard only applies
            deterministic replacements
            where the scanner can safely
            transform the affected line.
            Context-sensitive findings
            remain manual.
          </p>

          <button
            type="button"
            className="code-editor__apply-all-button"
            onClick={
              fixAllSafeIssues
            }
            disabled={
              safeCodeChanges ===
                0 &&
              !fixesApplied
            }
          >
            {fixesApplied
              ? "Safe Fixes Applied"
              : `Fix All Safe Issues (${safeCodeChanges})`}
          </button>
        </div>
      </div>

      {(beforeScore !== null ||
        afterScore !== null) && (
        <section className="code-editor__comparison">
          <div className="code-editor__panel-header">
            <div>
              <span className="code-editor__panel-kicker">
                Verification
              </span>

              <h3>
                Security Improvement
              </h3>
            </div>
          </div>

          <div className="code-editor__comparison-grid">
            <div className="code-editor__comparison-card">
              <span>
                Before Score
              </span>

              <strong>
                {beforeScore ??
                  "—"}
              </strong>
            </div>

            <div className="code-editor__comparison-card">
              <span>
                After Score
              </span>

              <strong>
                {afterScore ??
                  displayedSecurityScore}
              </strong>
            </div>

            <div className="code-editor__comparison-card">
              <span>
                Findings Before
              </span>

              <strong>
                {beforeIssues ??
                  "—"}
              </strong>
            </div>

            <div className="code-editor__comparison-card">
              <span>
                Findings Now
              </span>

              <strong>
                {issues.length}
              </strong>
            </div>
          </div>
        </section>
      )}

    </section>
  );
}