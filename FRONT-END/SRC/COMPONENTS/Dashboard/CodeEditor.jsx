import Editor from "@monaco-editor/react";

import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { AnalysisContext } from "../../context/analysis-context";
import { analyzePastedCode } from "../../services/scan";

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
    selectedIssue,
    setSelectedIssue,
  ] = useState(null);

  const [
    rescanning,
    setRescanning,
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
    useMemo(
      () =>
        Array.isArray(
          analysisResult?.issues,
        )
          ? analysisResult.issues
          : [],
      [analysisResult],
    );

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
  ]);

  function rememberBaseline() {
    if (
      beforeScore !== null
    ) {
      return;
    }

    setBeforeScore(
      analysisResult
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

    /*
     * For Python we combine all
     * required imports into one
     * physical line.
     *
     * This is important for the
     * 25,000-line stress file,
     * because adding new lines
     * would push it above the
     * scanner limit.
     */
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

        /*
         * First try to replace an
         * existing blank line near
         * the top of the source.
         *
         * Line count remains exactly
         * the same.
         */
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

        /*
         * Otherwise merge with an
         * existing Python import.
         */
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

  function applySingleFix() {
    if (
      !selectedIssue
    ) {
      return;
    }

    rememberBaseline();

    let lines =
      String(
        editorCode || "",
      ).split(
        /\r?\n/,
      );

    const index =
      Number(
        selectedIssue.line,
      ) - 1;

    if (
      index < 0 ||
      index >=
        lines.length
    ) {
      setMessage(
        "The selected finding no longer matches the editor. Run Verify Secured Code to refresh the findings.",
      );

      return;
    }

    const freshSuggestion =
      buildSecureSuggestion({
        issue:
          selectedIssue,

        language:
          editorLanguage,

        currentLine:
          lines[index],
      });

    if (
      !freshSuggestion
        ?.autoApplicable
    ) {
      setMessage(
        "This finding is already fixed or requires manual review. Run Verify Secured Code to refresh the findings.",
      );

      return;
    }

    if (
      !freshSuggestion.code ||
      freshSuggestion.code ===
        lines[index]
    ) {
      setMessage(
        "This secure replacement is already present. Run Verify Secured Code to refresh the findings.",
      );

      return;
    }

    lines[index] =
      freshSuggestion.code;

    lines =
      addImports(
        lines,

        freshSuggestion
          .imports || [],
      );

    const updatedCode =
      lines.join("\n");

    setEditorCode(
      updatedCode,
    );

    const editor =
      editorRef.current;

    if (editor) {
      const model =
        editor.getModel();

      if (
        model &&
        model.getValue() !==
          updatedCode
      ) {
        model.setValue(
          updatedCode,
        );
      }
    }

    decorationsRef.current
      ?.clear();

    setMessage(
      "Secure fix applied. Click Verify Secured Code to refresh the security findings.",
    );
  }

  function fixAllSafeIssues() {
  if (
    safeFixGroups.length ===
    0
  ) {
    setMessage(
      fixesApplied
        ? "Safe fixes have already been applied. Click Verify Secured Code to refresh the findings."
        : "No deterministic fixes are available. Remaining findings require manual review.",
    );

    return;
  }

  rememberBaseline();

  /*
   * Always read the LIVE Monaco
   * document rather than possibly
   * stale React state.
   */
  const liveCode =
    editorRef.current
      ?.getModel()
      ?.getValue() ??
    editorCode ??
    "";

  let lines =
    String(
      liveCode,
    ).split(
      /\r?\n/,
    );

  const imports =
    new Set();

  let codeChanges =
    0;

  let findingsCovered =
    0;

  safeFixGroups.forEach(
    (group) => {
      const index =
        Number(
          group.line,
        ) - 1;

      if (
        index < 0 ||
        index >=
          lines.length
      ) {
        return;
      }

      let currentLine =
        lines[index];

      if (
        !currentLine
          ?.trim()
      ) {
        return;
      }

      const orderedFixes =
        [
          ...group.fixes,
        ].sort(
          (
            first,
            second,
          ) =>
            getAutoFixPriority(
              second.issue
                .ruleId,
            ) -
            getAutoFixPriority(
              first.issue
                .ruleId,
            ),
        );

      let changed =
        false;

      /*
       * Apply compatible fixes
       * sequentially to the SAME
       * physical line.
       */
      for (
        const entry
        of orderedFixes
      ) {
        const suggestion =
          buildSecureSuggestion({
            issue:
              entry.issue,

            language:
              editorLanguage,

            currentLine,
          });

        if (
          !suggestion
            ?.autoApplicable
        ) {
          continue;
        }

        if (
          !suggestion.code ||
          suggestion.code ===
            currentLine
        ) {
          continue;
        }

        currentLine =
          suggestion.code;

        (
          suggestion.imports ||
          []
        ).forEach(
          (item) =>
            imports.add(
              item,
            ),
        );

        changed =
          true;

        findingsCovered +=
          1;
      }

      if (changed) {
        lines[index] =
          currentLine;

        codeChanges +=
          1;
      }
    },
  );

  if (
    codeChanges ===
    0
  ) {
    setFixesApplied(
      true,
    );

    setMessage(
      "The deterministic secure replacements are already present. Click Verify Secured Code.",
    );

    return;
  }

  lines =
    addImports(
      lines,
      [
        ...imports,
      ],
    );

  const updatedCode =
    lines.join(
      "\n",
    );

  /*
   * Update Monaco immediately.
   */
  const editor =
    editorRef.current;

  const model =
    editor?.getModel();

  if (
    model &&
    model.getValue() !==
      updatedCode
  ) {
    model.setValue(
      updatedCode,
    );
  }

  /*
   * Update Context state too.
   */
  setEditorCode(
    updatedCode,
  );

  setFixesApplied(
    true,
  );

  decorationsRef.current
    ?.clear();

  setMessage(
    `${codeChanges} source ${
      codeChanges === 1
        ? "change"
        : "changes"
    } applied, covering ${findingsCovered} ${
      findingsCovered === 1
        ? "finding"
        : "findings"
    }. Now click Verify Secured Code.`,
  );
}

 async function rescanCode() {
  if (
    !selectedProjectId
  ) {
    setMessage(
      "Select a project before verification.",
    );

    return;
  }

  /*
   * CRITICAL FIX:
   *
   * Get the current content directly
   * from Monaco.
   *
   * Do not rely only on editorCode
   * because React state updates are
   * asynchronous.
   */
  const codeToVerify =
    editorRef.current
      ?.getModel()
      ?.getValue() ??
    editorCode ??
    "";

  if (
    !codeToVerify.trim()
  ) {
    setMessage(
      "The editor is empty.",
    );

    return;
  }

  const normalizedCode =
    codeToVerify.replace(
      /\r\n/g,
      "\n",
    );

  const verificationLines =
    normalizedCode.split(
      "\n",
    );

  while (
    verificationLines.length >
      1 &&
    verificationLines[
      verificationLines.length -
        1
    ] === ""
  ) {
    verificationLines.pop();
  }

  const lineCount =
    verificationLines.length;

  const byteSize =
    new Blob([
      normalizedCode,
    ]).size;

  if (
    lineCount >
    25100
  ) {
    setMessage(
      `Verification blocked: secured source contains ${lineCount.toLocaleString()} lines. Backend remediation limit is 25,100 lines.`,
    );

    return;
  }

  if (
    byteSize >
    5 * 1024 * 1024
  ) {
    setMessage(
      "Verification blocked: secured source exceeds 5 MB.",
    );

    return;
  }

  if (
    ![
      "python",
      "javascript",
      "typescript",
      "java",
      "c",
      "cpp",
      "go",
      "php",
      "ruby",
      "rust",
    ].includes(
      editorLanguage,
    )
  ) {
    setMessage(
      `Verification blocked: "${editorLanguage}" is not a supported scanner language.`,
    );

    return;
  }

  try {
    setRescanning(
      true,
    );

    setMessage(
      `Verifying ${lineCount.toLocaleString()} lines...`,
    );

    const fileName =
      getSecuredFileName(
        editorFileName,
        editorLanguage,
      );

    /*
     * Synchronize Context first.
     */
    setEditorCode(
      normalizedCode,
    );

    const result =
      await analyzePastedCode({
        projectId:
          selectedProjectId,

        language:
          editorLanguage,

        fileName,

        code:
          normalizedCode,
      });

    if (
      !result?.scan
    ) {
      throw new Error(
        "The backend did not return a verified scan.",
      );
    }

    setAnalysisResult(
      result.scan,
    );

    setEditorFileName(
      fileName,
    );

    setAfterScore(
      result.scan
        .securityScore ??
        100,
    );

    refreshScans();

    setSelectedIssue(
      null,
    );

    /*
     * IMPORTANT:
     *
     * Verification completed.
     * New scan findings now decide
     * whether Fix All becomes
     * available again.
     */
    setFixesApplied(
      false,
    );

    const remaining =
      Array.isArray(
        result.scan
          ?.issues,
      )
        ? result.scan
            .issues.length
        : 0;

    setMessage(
      remaining === 0
        ? "Verification completed. No remaining security findings."
        : `Verification completed. ${remaining} ${
            remaining === 1
              ? "finding remains"
              : "findings remain"
          }.`,
    );
  } catch (error) {
    console.error(
      "SECURED RESCAN ERROR:",
      error,
    );

    /*
     * Do NOT reset fixesApplied.
     *
     * Code changes are still in the
     * editor even if API verification
     * failed.
     */
    setMessage(
      error.message ||
        "Unable to verify the secured code.",
    );
  } finally {
    setRescanning(
      false,
    );
  }
}
  function saveSecuredFile() {
    if (
      !editorCode.trim()
    ) {
      return;
    }

    const fileName =
      getSecuredFileName(
        editorFileName,
        editorLanguage,
      );

    const blob =
      new Blob(
        [editorCode],
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

    const link =
      document.createElement(
        "a",
      );

    link.href =
      url;

    link.download =
      fileName;

    document.body.appendChild(
      link,
    );

    link.click();

    document.body.removeChild(
      link,
    );

    setTimeout(
      () =>
        URL.revokeObjectURL(
          url,
        ),
      100,
    );
  }

  async function copySecureCode() {
    if (
      !currentSuggestion
        ?.code
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        currentSuggestion.code,
      );

      setCopied(
        true,
      );

      setTimeout(
        () =>
          setCopied(
            false,
          ),
        1200,
      );
    } catch {
      setMessage(
        "Unable to copy secure code.",
      );
    }
  }

  function jumpToIssue(
    issue,
  ) {
    setSelectedIssue(
      issue,
    );

    const editor =
      editorRef.current;

    const line =
      Number(
        issue.line,
      );

    if (
      editor &&
      Number.isInteger(
        line,
      )
    ) {
      editor.revealLineInCenter(
        line,
      );

      editor.setPosition({
        lineNumber:
          line,

        column:
          1,
      });

      editor.focus();
    }
  }

  function handleLanguageChange(
    event,
  ) {
    const language =
      event.target.value;

    setEditorLanguage(
      language,
    );

    const extension =
      extensionByLanguage[
        language
      ] || "txt";

    const base =
      String(
        editorFileName ||
          "source-code",
      )
        .replace(
          /\.[^.]+$/,
          "",
        )
        .replace(
          /-codeguard-secured$/i,
          "",
        );

    setEditorFileName(
      `${base}.${extension}`,
    );
  }

  const currentIssues =
    issues.length;

  const fixed =
    beforeIssues ===
    null
      ? 0
      : Math.max(
          0,

          beforeIssues -
            currentIssues,
        );

  const improvement =
    beforeScore !==
      null &&
    afterScore !==
      null
      ? afterScore -
        beforeScore
      : null;

  const isLight =
    theme ===
    "light";

  return (
    <div
      className={`editor-card ${
        isLight
          ? "editor-light"
          : "editor-dark"
      }`}
    >
      <div className="editor-header">
        <div className="editor-title-group">
          <h2>
            Code Editor
          </h2>

          <p>
            {editorFileName ||
              "Paste or write code"}
          </p>
        </div>

        <div className="editor-header-actions">
          {issues.length >
            0 && (
            <span className="editor-issue-count">
              {
                issues.length
              }{" "}
              {issues.length ===
              1
                ? "finding"
                : "findings"}
            </span>
          )}

          <button
  type="button"
  className={`fix-all-button ${
    fixesApplied
      ? "fixes-applied"
      : ""
  }`}
  onClick={
    fixAllSafeIssues
  }
  disabled={
    safeCodeChanges ===
      0 ||
    fixesApplied
  }
>
  <span>
    {fixesApplied
      ? "✓"
      : "✨"}
  </span>

  <div>
    <strong>
      {fixesApplied
        ? "Safe Fixes Applied"
        : "Fix All Safe Issues"}
    </strong>

    <small>
      {fixesApplied
        ? "Verify the secured code now"
        : safeCodeChanges ===
            0
          ? "No deterministic changes available"
          : `${safeCodeChanges} safe ${
              safeCodeChanges ===
              1
                ? "change"
                : "changes"
            } • covers ${safeFindingsCovered} ${
              safeFindingsCovered ===
              1
                ? "finding"
                : "findings"
            }`}
    </small>
  </div>
</button>

          <select
            value={
              editorLanguage
            }
            onChange={
              handleLanguageChange
            }
          >
            {LANGUAGE_OPTIONS.map(
              (item) => (
                <option
                  key={
                    item.value
                  }
                  value={
                    item.value
                  }
                >
                  {
                    item.label
                  }
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div className="editor-security-hint">
        <span className="editor-hint-dot" />

        {issues.length >
        0
          ? "Vulnerable lines are highlighted. Use the remediation workspace below to review and fix them."
          : "No active findings are loaded for the current code."}
      </div>

      <div className="monaco-editor-shell">
        <Editor
          height="100%"
          theme={
            isLight
              ? "vs"
              : "vs-dark"
          }
          language={
            editorLanguage
          }
          value={
            editorCode
          }
          onMount={(
            editor,
          ) => {
            editorRef.current =
              editor;

            applyHighlights();
          }}
          onChange={(
            value,
          ) =>
            setEditorCode(
              value || "",
            )
          }
          options={{
            automaticLayout:
              true,

            minimap: {
              enabled:
                false,
            },

            fontSize:
              14,

            lineHeight:
              22,

            lineNumbers:
              "on",

            glyphMargin:
              true,

            wordWrap:
              "on",

            smoothScrolling:
              true,

            scrollBeyondLastLine:
              false,

            padding: {
              top:
                14,

              bottom:
                14,
            },
          }}
        />
      </div>

      {(issues.length >
        0 ||
        beforeScore !==
          null) && (
        <section className="remediation-workspace">
          <div className="remediation-main-header">
            <div>
              <span className="remediation-eyebrow">
                SECURITY REMEDIATION
              </span>

              <h3>
                Improve this code safely
              </h3>

              <p>
                Automatic fixes are only applied where CodeGuard can make a deterministic replacement.
              </p>
            </div>

            <span className="remediation-status">
              {currentIssues ===
              0
                ? "✓ Verified clean"
                : `${currentIssues} remaining`}
            </span>
          </div>

          <div className="remediation-actions">
            <button
              type="button"
              className="fix-all-button"
              onClick={
                fixAllSafeIssues
              }
              disabled={
                safeCodeChanges ===
                0
              }
            >
              <span>
                ✨
              </span>

              <div>
                <strong>
                  Fix All Safe Issues
                </strong>

                <small>
                  {
                    safeCodeChanges
                  }{" "}
                  {safeCodeChanges ===
                  1
                    ? "safe code change"
                    : "safe code changes"}

                  {safeFindingsCovered >
                    safeCodeChanges && (
                    <>
                      {" "}
                      • covers{" "}
                      {
                        safeFindingsCovered
                      }{" "}
                      findings
                    </>
                  )}
                </small>
              </div>
            </button>

            <button
              type="button"
              className="rescan-button"
              onClick={
                rescanCode
              }
              disabled={
                rescanning
              }
            >
              <span>
                {rescanning
                  ? "⏳"
                  : "🔍"}
              </span>

              <div>
                <strong>
                  {rescanning
                    ? "Scanning..."
                    : "Verify Secured Code"}
                </strong>

                <small>
                  Run a fresh security analysis
                </small>
              </div>
            </button>
          </div>

          {message && (
            <div className="remediation-message">
              <span>
                ℹ
              </span>

              {message}
            </div>
          )}

          {beforeScore !==
            null && (
            <div className="improvement-section">
              <div className="section-title-row">
                <div>
                  <span className="section-eyebrow">
                    RESULTS
                  </span>

                  <h4>
                    Security Improvement
                  </h4>
                </div>

                {improvement !==
                  null && (
                  <span
                    className={`improvement-badge ${
                      improvement >=
                      0
                        ? "positive"
                        : "negative"
                    }`}
                  >
                    {improvement >=
                    0
                      ? "+"
                      : ""}

                    {
                      improvement
                    }{" "}
                    points
                  </span>
                )}
              </div>

              <div className="security-score-comparison">
                <div className="comparison-stat">
                  <span>
                    Original Score
                  </span>

                  <strong>
                    {
                      beforeScore
                    }
                  </strong>
                </div>

                <div className="comparison-arrow">
                  →
                </div>

                <div className="comparison-stat after">
                  <span>
                    Verified Score
                  </span>

                  <strong>
                    {afterScore ??
                      "—"}
                  </strong>
                </div>

                <div className="comparison-stat">
                  <span>
                    Fixed
                  </span>

                  <strong>
                    {
                      fixed
                    }
                  </strong>
                </div>

                <div className="comparison-stat">
                  <span>
                    Remaining
                  </span>

                  <strong>
                    {
                      currentIssues
                    }
                  </strong>
                </div>
              </div>
            </div>
          )}

          {issues.length >
            0 && (
            <div className="remaining-findings-section">
              <div className="section-title-row">
                <div>
                  <span className="section-eyebrow">
                    FINDINGS
                  </span>

                  <h4>
                    Remaining Security Findings
                  </h4>
                </div>

                <span className="manual-count">
                  {
                    issues.filter(
                      (
                        issue,
                      ) => {
                        const entry =
                          suggestions.find(
                            (
                              item,
                            ) =>
                              item.issue ===
                              issue,
                          );

                        return !entry
                          ?.suggestion
                          .autoApplicable;
                      },
                    ).length
                  }{" "}
                  need manual review
                </span>
              </div>

              <div className="findings-list">
                {issues.map(
                  (
                    issue,
                    index,
                  ) => {
                    const severity =
                      getSeverity(
                        issue.severity,
                      );

                    const suggestion =
                      suggestions.find(
                        (
                          item,
                        ) =>
                          item.issue ===
                          issue,
                      )
                        ?.suggestion;

                    return (
                      <button
                        type="button"
                        className={`finding-select-card ${
                          selectedIssue ===
                          issue
                            ? "selected"
                            : ""
                        }`}
                        key={`${issue.ruleId}-${issue.line}-${index}`}
                        onClick={() =>
                          jumpToIssue(
                            issue,
                          )
                        }
                      >
                        <span
                          className={`finding-indicator ${severity}`}
                        />

                        <div className="finding-card-content">
                          <strong>
                            {
                              issue.title
                            }
                          </strong>

                          <span>
                            Line{" "}
                            {
                              issue.line
                            }
                            {" • "}
                            {severity.toUpperCase()}
                          </span>
                        </div>

                        <span
                          className={
                            suggestion
                              ?.autoApplicable
                              ? "fix-type automatic"
                              : "fix-type manual"
                          }
                        >
                          {suggestion
                            ?.autoApplicable
                            ? "Auto fix"
                            : "Manual review"}
                        </span>

                        <span className="finding-chevron">
                          ›
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          )}

          {selectedIssue &&
            currentSuggestion && (
            <div className="selected-finding-section">
              <div className="selected-finding-header">
                <div>
                  <span className="section-eyebrow">
                    SELECTED FINDING
                  </span>

                  <h4>
                    {
                      selectedIssue.title
                    }
                  </h4>

                  <p>
                    Line{" "}
                    {
                      selectedIssue.line
                    }
                    {" • "}
                    {formatOwasp(
                      selectedIssue.owasp,
                    )}
                    {" • "}
                    {selectedIssue.cwe ||
                      "No CWE"}
                  </p>
                </div>

                <span
                  className={`selected-severity ${getSeverity(
                    selectedIssue.severity,
                  )}`}
                >
                  {getSeverity(
                    selectedIssue.severity,
                  ).toUpperCase()}
                </span>
              </div>

              <div className="finding-explanation">
                <strong>
                  Why this matters
                </strong>

                <p>
                  {
                    currentSuggestion.explanation
                  }
                </p>
              </div>

              <div className="secure-code-block">
                <div className="secure-code-header">
                  <div>
                    <span>
                      ✓
                    </span>

                    Suggested secure replacement
                  </div>

                  <button
                    type="button"
                    onClick={
                      copySecureCode
                    }
                  >
                    {copied
                      ? "✓ Copied"
                      : "Copy"}
                  </button>
                </div>

                <pre>
                  <code>
                    {
                      currentSuggestion.code
                    }
                  </code>
                </pre>
              </div>

              <div className="selected-finding-actions">
                {currentSuggestion.autoApplicable ? (
                  <button
                    type="button"
                    className="single-fix-button"
                    onClick={
                      applySingleFix
                    }
                  >
                    ✨ Apply Secure Fix
                  </button>
                ) : (
                  <div className="manual-review-notice">
                    <span>
                      ⚠
                    </span>

                    <div>
                      <strong>
                        Manual review required
                      </strong>

                      <p>
                        This issue depends on surrounding application logic, so CodeGuard will not modify it automatically.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}