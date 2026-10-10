import {
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FaCloudUploadAlt,
  FaFileCode,
} from "react-icons/fa";
import {
  AnalysisContext,
} from "../../context/analysis-context";
import {
  analyzePastedCode,
  analyzeZipProject,
} from "../../services/scan";
import {
  getProjects,
  createProject,
} from "../../services/projects";
import {
  getSettings,
} from "../../services/settings";
import {
  addNotification,
} from "../../services/notifications";
import "./Upload.css";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_CODE_LINES = 25100;
const MAX_ZIP_SIZE = 1024 * 1024 * 1024;

const languageByExtension = {
  py: "python",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  java: "java",
  c: "c",
  cpp: "cpp",
  cc: "cpp",
  h: "c",
  hpp: "cpp",
  go: "go",
  php: "php",
  rb: "ruby",
  rs: "rust",
};

const extensionByLanguage = {
  python: "py",
  javascript: "js",
  typescript: "ts",
  java: "java",
  c: "c",
  cpp: "cpp",
  go: "go",
  php: "php",
  ruby: "rb",
  rust: "rs",
};

function countLines(code = "") {
  const text = String(code || "");

  if (!text) {
    return 0;
  }

  const lines = text.split(/\r?\n/);

  if (
    lines.length > 1 &&
    lines[lines.length - 1] === ""
  ) {
    return lines.length - 1;
  }

  return lines.length;
}

function detectLanguage(fileName) {
  return languageByExtension[
    fileName.split(".").pop()?.toLowerCase()
  ];
}

function detectLanguageFromCode(code = "") {
  const source = String(code || "").trim();

  if (!source) {
    return null;
  }

  const scores = {
    python: 0,
    javascript: 0,
    typescript: 0,
    java: 0,
    c: 0,
    cpp: 0,
    go: 0,
    php: 0,
    ruby: 0,
    rust: 0,
  };

  const add = (language, regex, weight = 1) => {
    if (regex.test(source)) {
      scores[language] += weight;
    }
  };

  add("python", /^\s*(def|class)\s+\w+/m, 4);
  add("python", /^\s*(from\s+\w+\s+import|import\s+\w+)/m, 2);
  add("python", /^\s*(if|for|while|try|with)\b.*:\s*$/m, 2);
  add("python", /\bprint\s*\(/, 1);
  add("python", /\bNone\b|\bTrue\b|\bFalse\b/, 1);

  add(
    "javascript",
    /\b(const|let|var)\s+[A-Za-z_$][\w$]*/,
    3
  );
  add(
    "javascript",
    /\b(require\s*\(|module\.exports|process\.env)\b/,
    4
  );
  add(
    "javascript",
    /\bconsole\.(log|error|warn)\s*\(/,
    3
  );
  add("javascript", /=>/, 2);
  add(
    "javascript",
    /\bfunction\s+\w+\s*\(/,
    2
  );

  add(
    "typescript",
    /\b(interface|type|enum|namespace)\s+\w+/,
    5
  );
  add(
    "typescript",
    /\b(const|let|var)\s+\w+\s*:\s*(string|number|boolean|unknown|any)\b/,
    4
  );

  add("java", /\bpublic\s+class\s+\w+/, 5);
  add(
    "java",
    /\bSystem\.out\.println\s*\(/,
    4
  );
  add(
    "java",
    /\bpublic\s+static\s+void\s+main\s*\(/,
    5
  );
  add("java", /^\s*import\s+java\./m, 3);

  add("cpp", /#include\s*<iostream>/, 5);
  add("cpp", /\bstd::/, 4);
  add("cpp", /\bcout\s*<</, 4);
  add(
    "cpp",
    /\busing\s+namespace\s+std\b/,
    3
  );

  add("c", /#include\s*<stdio\.h>/, 5);
  add("c", /\bprintf\s*\(/, 3);
  add("c", /\bscanf\s*\(/, 3);

  add("go", /^\s*package\s+\w+/m, 5);
  add(
    "go",
    /^\s*func\s+\w+\s*\(/m,
    4
  );
  add(
    "go",
    /\bfmt\.(Print|Println|Printf)\s*\(/,
    3
  );

  add("php", /<\?php/, 6);
  add("php", /\$\w+\s*=/, 3);

  add("ruby", /^\s*def\s+\w+/m, 4);
  add("ruby", /\bputs\s+/, 2);
  add("ruby", /^\s*require\s+["']/m, 3);

  add(
    "rust",
    /^\s*fn\s+\w+\s*\(/m,
    4
  );
  add(
    "rust",
    /\bprintln!\s*\(/,
    4
  );
  add(
    "rust",
    /^\s*use\s+[\w:]+/m,
    3
  );

  const [bestLanguage, bestScore] =
    Object.entries(scores).sort(
      (a, b) => b[1] - a[1]
    )[0];

  return bestScore >= 2
    ? bestLanguage
    : null;
}

function createPasteFileName(language) {
  const extension =
    extensionByLanguage[language] || "txt";

  return `pasted-code.${extension}`;
}

export default function UploadCard() {
  const {
    setAnalysisResult,
    selectedProjectId,
    setSelectedProjectId,
    refreshScans,
    editorCode,
    setEditorCode,
    editorLanguage,
    setEditorLanguage,
    editorFileName,
    setEditorFileName,
  } = useContext(AnalysisContext);

  const fileInput = useRef(null);
  const zipInput = useRef(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [selectedZip, setSelectedZip] =
    useState(null);

  const [uploadMode, setUploadMode] =
    useState("source");

  const [projects, setProjects] =
    useState([]);

  const [projectId, setProjectId] =
    useState("");

  const [projectsLoading, setProjectsLoading] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [geminiReviewMode, setGeminiReviewMode] =
    useState("findings");

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        setProjectsLoading(true);
        setError("");

        let projectList = await getProjects();

        if (cancelled) {
          return;
        }

        if (projectList.length === 0) {
          const newProject =
            await createProject({
              name:
                "CodeGuard Universal Scanner",
              description:
                "Default project for source-code security analysis",
              primaryLanguage:
                "Multi-language",
              sourceType: "paste",
            });

          projectList = [newProject];
        }

        if (cancelled) {
          return;
        }

        setProjects(projectList);

        const settings = getSettings();

        const storedProjectId =
          settings.rememberLastProject
            ? localStorage.getItem(
                "selectedProjectId"
              )
            : null;

        const storedExists =
          projectList.some(
            (project) =>
              project._id === storedProjectId
          );

        const selectedExists =
          projectList.some(
            (project) =>
              project._id === selectedProjectId
          );

        const preferredId =
          storedExists
            ? storedProjectId
            : selectedExists
              ? selectedProjectId
              : projectList[0]?._id || "";

        setProjectId(preferredId);
        setSelectedProjectId(preferredId);

        if (
          settings.rememberLastProject &&
          preferredId
        ) {
          localStorage.setItem(
            "selectedProjectId",
            preferredId
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError.message ||
              "Unable to load projects."
          );
        }
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  async function runAnalysis({
    code,
    language,
    fileName,
  }) {
    setError("");
    setSuccess("");

    if (!projectId) {
      setError(
        "No project selected. Create or select a project first."
      );
      return;
    }

    if (!code || !code.trim()) {
      setError(
        "The Code Editor is empty. Upload a file or paste code first."
      );
      return;
    }

    const lineCount = countLines(code);

    if (lineCount > MAX_CODE_LINES) {
      setError(
        `CodeGuard supports a maximum of ${MAX_CODE_LINES.toLocaleString()} lines per scan. This source contains ${lineCount.toLocaleString()} lines.`
      );
      return;
    }

    const byteSize = new Blob([code]).size;

    if (byteSize > MAX_FILE_SIZE) {
      setError(
        "Source code exceeds the 5 MB scanning limit."
      );
      return;
    }

    const settings = getSettings();

    try {
      setLoading(true);

      setSuccess(
        `Scanning ${lineCount.toLocaleString()} lines...`
      );

      const result =
        await analyzePastedCode({
          projectId,
          language,
          fileName,
          code,
        });

      if (!result?.scan) {
        throw new Error(
          "The server did not return a completed scan."
        );
      }

      setAnalysisResult(result.scan);
      refreshScans();

      setSuccess(
        `Analysis completed successfully. ${lineCount.toLocaleString()} lines scanned using the ${settings.scanProfile} profile.`
      );

      if (settings.scanNotifications) {
        addNotification({
          type: "success",
          title: "Scan completed",
          message: `${fileName}: ${lineCount.toLocaleString()} lines analysed. Security score ${
            result.scan.securityScore ?? 100
          }/100.`,
        });
      }

      const criticalCount =
        result.scan?.issueCount?.critical || 0;

      if (
        settings.criticalNotifications &&
        criticalCount > 0
      ) {
        addNotification({
          type: "critical",
          title:
            "Critical vulnerability detected",
          message: `${criticalCount} critical ${
            criticalCount === 1
              ? "finding"
              : "findings"
          } detected in ${fileName}.`,
        });
      }
    } catch (analysisError) {
      console.error(
        "ANALYSIS ERROR:",
        analysisError
      );

      const message =
        analysisError.message ||
        "Code analysis failed. Check backend logs.";

      setError(message);
      setSuccess("");

      if (
        settings.failedScanNotifications
      ) {
        addNotification({
          type: "error",
          title: "Scan failed",
          message,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");

    if (!file) {
      return;
    }

    const language = detectLanguage(file.name);

    if (!language) {
      setSelectedFile(null);
      setError(
        "Unsupported source-code file type."
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setError(
        "File must be 5 MB or smaller."
      );
      return;
    }

    try {
      const code = await file.text();

      if (!code.trim()) {
        setSelectedFile(null);
        setError(
          "The selected file is empty."
        );
        return;
      }

      const lineCount = countLines(code);

      if (lineCount > MAX_CODE_LINES) {
        setSelectedFile(null);

        setError(
          `Maximum supported source size is ${MAX_CODE_LINES.toLocaleString()} lines. ${file.name} contains ${lineCount.toLocaleString()} lines.`
        );

        if (fileInput.current) {
          fileInput.current.value = "";
        }

        return;
      }

      setSelectedFile(file);
      setEditorCode(code);
      setEditorLanguage(language);
      setEditorFileName(file.name);

      const settings = getSettings();

      if (settings.autoScan && projectId) {
        setSuccess(
          `${lineCount.toLocaleString()} lines loaded. Automatic analysis started...`
        );

        await runAnalysis({
          code,
          language,
          fileName: file.name,
        });
      } else {
        setSuccess(
          `${lineCount.toLocaleString()} lines loaded into the Code Editor. You can edit the source before analysis.`
        );
      }
    } catch (readError) {
      console.error(
        "FILE READ ERROR:",
        readError
      );

      setSelectedFile(null);

      setError(
        "Unable to read the selected file."
      );
    }
  }

  async function handleZip(event) {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");

    if (!file) {
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".zip")
    ) {
      setSelectedZip(null);

      setError(
        "Only .zip project archives are supported."
      );

      return;
    }

    if (file.size > MAX_ZIP_SIZE) {
      setSelectedZip(null);

      setError(
        "ZIP project must be 1 GB or smaller."
      );

      return;
    }

    setSelectedZip(file);

    setSuccess(
      `${file.name} is ready for multi-language project analysis.`
    );
  }

  function clearFile() {
    setSelectedFile(null);
    setError("");
    setSuccess(
      "Source file selection cleared."
    );

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  function clearZip() {
    setSelectedZip(null);
    setError("");
    setSuccess(
      "ZIP project selection cleared."
    );

    if (zipInput.current) {
      zipInput.current.value = "";
    }
  }

  async function analyzeZip() {
    setError("");
    setSuccess("");

    if (!projectId) {
      setError(
        "No project selected. Create or select a project first."
      );
      return;
    }

    if (!selectedZip) {
      setError(
        "Choose a ZIP project before starting analysis."
      );
      return;
    }

    const settings = getSettings();

    try {
      setLoading(true);

      setSuccess(
        `Scanning ${selectedZip.name}...`
      );

      const result =
        await analyzeZipProject({
          projectId,
          file: selectedZip,
          geminiReviewMode,
        });

      if (!result?.scan) {
        throw new Error(
          "The server did not return a completed ZIP scan."
        );
      }

      const metadata =
        result.zipMetadata ||
        result.scan?.zipMetadata ||
        {};

      const zipFiles =
        Array.isArray(metadata.files)
          ? metadata.files
          : [];

      const activeFile =
        [...zipFiles].sort(
          (a, b) =>
            (b.issueTotal || 0) -
            (a.issueTotal || 0)
        )[0] || null;

      const zipAnalysisResult = {
        ...result.scan,
        zipMetadata: {
          ...(result.scan?.zipMetadata || {}),
          ...metadata,
          files: zipFiles,
        },
      };

      setAnalysisResult(
        zipAnalysisResult
      );

      if (activeFile) {
        setEditorCode(
          activeFile.code || ""
        );

        setEditorLanguage(
          activeFile.language ||
            "javascript"
        );

        setEditorFileName(
          activeFile.path ||
            activeFile.fileName ||
            "zip-source"
        );
      }

      refreshScans();

      const supportedFiles =
        metadata.supportedFiles ||
        zipFiles.length ||
        0;

      const languages =
        Array.isArray(metadata.languages)
          ? metadata.languages
          : [];

      setSuccess(
        `Project analysis completed. ${supportedFiles.toLocaleString()} supported files scanned${
          languages.length
            ? ` across ${languages.join(", ")}`
            : ""
        }.`
      );

      if (
        settings.scanNotifications
      ) {
        addNotification({
          type: "success",
          title:
            "Project scan completed",
          message: `${selectedZip.name}: ${supportedFiles.toLocaleString()} files analysed. Security score ${
            result.scan.securityScore ??
            100
          }/100.`,
        });
      }

      const criticalCount =
        result.scan?.issueCount?.critical ||
        0;

      if (
        settings.criticalNotifications &&
        criticalCount > 0
      ) {
        addNotification({
          type: "critical",
          title:
            "Critical vulnerability detected",
          message: `${criticalCount} critical ${
            criticalCount === 1
              ? "finding"
              : "findings"
          } detected in ${selectedZip.name}.`,
        });
      }
    } catch (analysisError) {
      console.error(
        "ZIP ANALYSIS ERROR:",
        analysisError
      );

      const message =
        analysisError.message ||
        "ZIP project analysis failed. Check backend logs.";

      setError(message);
      setSuccess("");

      if (
        settings.failedScanNotifications
      ) {
        addNotification({
          type: "error",
          title:
            "Project scan failed",
          message,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function analyzeCode() {
    let language = editorLanguage;

    let fileName =
      editorFileName ||
      createPasteFileName(language);

    if (!selectedFile) {
      const detectedLanguage =
        detectLanguageFromCode(
          editorCode
        );

      if (detectedLanguage) {
        language = detectedLanguage;

        fileName =
          createPasteFileName(
            detectedLanguage
          );

        setEditorLanguage(
          detectedLanguage
        );

        setEditorFileName(
          fileName
        );
      }
    }

    await runAnalysis({
      code: editorCode,
      language,
      fileName,
    });
  }

  function changeProject(
    newProjectId
  ) {
    setProjectId(newProjectId);
    setSelectedProjectId(
      newProjectId
    );

    const settings = getSettings();

    if (
      settings.rememberLastProject
    ) {
      localStorage.setItem(
        "selectedProjectId",
        newProjectId
      );
    } else {
      localStorage.removeItem(
        "selectedProjectId"
      );
    }
  }

  const currentLineCount =
    countLines(editorCode);

  return (
    <div className="upload-card">
      <h2>
        <FaCloudUploadAlt />
        Upload / Scan Source Code
      </h2>

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          gap: "12px",
          marginBottom: "12px",
          fontSize: "11px",
          color: "#94a3b8",
        }}
      >
        <span>
          Maximum: 25,100 lines
        </span>

        <span>
          Maximum: 5 MB
        </span>
      </div>

      <div className="upload-project-field">
        <label htmlFor="scanProject">
          Select project
        </label>

        <select
          id="scanProject"
          value={projectId}
          onChange={(event) =>
            changeProject(
              event.target.value
            )
          }
          disabled={
            projectsLoading ||
            loading
          }
        >
          {projectsLoading && (
            <option value="">
              Loading projects...
            </option>
          )}

          {!projectsLoading &&
            projects.length === 0 && (
              <option value="">
                No projects available
              </option>
            )}

          {projects.map((project) => (
            <option
              key={project._id}
              value={project._id}
            >
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setUploadMode("source");
            setError("");
            setSuccess("");
          }}
          disabled={loading}
          style={{
            padding: "10px 12px",
            borderRadius: "8px",
            border:
              uploadMode === "source"
                ? "1px solid #3b82f6"
                : "1px solid #64748b",
            background:
              uploadMode === "source"
                ? "rgba(59,130,246,.12)"
                : "transparent",
            color: "inherit",
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          Source File
        </button>

        <button
          type="button"
          onClick={() => {
            setUploadMode("zip");
            setError("");
            setSuccess("");
          }}
          disabled={loading}
          style={{
            padding: "10px 12px",
            borderRadius: "8px",
            border:
              uploadMode === "zip"
                ? "1px solid #3b82f6"
                : "1px solid #64748b",
            background:
              uploadMode === "zip"
                ? "rgba(59,130,246,.12)"
                : "transparent",
            color: "inherit",
            cursor: loading
              ? "not-allowed"
              : "pointer",
          }}
        >
          Project ZIP
        </button>
      </div>

      {uploadMode === "source" && (
        <>
          <div
            className="drop-zone"
            onClick={() =>
              !loading &&
              fileInput.current?.click()
            }
            onKeyDown={(event) => {
              if (
                !loading &&
                (event.key === "Enter" ||
                  event.key === " ")
              ) {
                fileInput.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <FaFileCode className="upload-icon" />

            <h3>
              {selectedFile
                ? selectedFile.name
                : "Choose Source File"}
            </h3>

            <p>
              {selectedFile
                ? `${Math.ceil(
                    selectedFile.size /
                      1024
                  ).toLocaleString()} KB • ${currentLineCount.toLocaleString()} lines`
                : "Optional — paste code directly into the editor or upload up to 25,100 lines"}
            </p>
          </div>

          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".py,.js,.jsx,.ts,.tsx,.java,.c,.cpp,.cc,.h,.hpp,.go,.php,.rb,.rs"
            onChange={handleFile}
          />

          {selectedFile && (
            <button
              type="button"
              onClick={clearFile}
              disabled={loading}
              style={{
                marginTop: "10px",
                padding: "9px 14px",
                borderRadius: "8px",
                border:
                  "1px solid #64748b",
                background:
                  "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              Clear Uploaded File
            </button>
          )}
        </>
      )}

      {uploadMode === "zip" && (
        <>
          <div
            className="drop-zone"
            onClick={() =>
              !loading &&
              zipInput.current?.click()
            }
            onKeyDown={(event) => {
              if (
                !loading &&
                (event.key === "Enter" ||
                  event.key === " ")
              ) {
                zipInput.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <FaCloudUploadAlt className="upload-icon" />

            <h3>
              {selectedZip
                ? selectedZip.name
                : "Choose Project ZIP"}
            </h3>

            <p>
              {selectedZip
                ? `${(
                    selectedZip.size /
                    1024 /
                    1024
                  ).toFixed(2)} MB`
                : "Upload Python, JavaScript, TypeScript, Java, C or C++ projects"}
            </p>
          </div>

          <input
            ref={zipInput}
            type="file"
            hidden
            accept=".zip,application/zip"
            onChange={handleZip}
          />

          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              borderRadius: "8px",
              border:
                "1px solid rgba(148,163,184,.25)",
              background:
                "rgba(15,23,42,.35)",
            }}
          >
            <div
              style={{
                fontWeight: "600",
                marginBottom: "9px",
                fontSize: "13px",
              }}
            >
              Gemini AI Review
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "7px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="geminiReviewMode"
                value="findings"
                checked={
                  geminiReviewMode ===
                  "findings"
                }
                onChange={(event) =>
                  setGeminiReviewMode(
                    event.target.value
                  )
                }
                disabled={loading}
              />
              Files containing security findings
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "7px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="geminiReviewMode"
                value="sensitive"
                checked={
                  geminiReviewMode ===
                  "sensitive"
                }
                onChange={(event) =>
                  setGeminiReviewMode(
                    event.target.value
                  )
                }
                disabled={loading}
              />
              Security-sensitive files
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "7px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="geminiReviewMode"
                value="remaining"
                checked={
                  geminiReviewMode ===
                  "remaining"
                }
                onChange={(event) =>
                  setGeminiReviewMode(
                    event.target.value
                  )
                }
                disabled={loading}
              />
              Remaining source files
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="geminiReviewMode"
                value="off"
                checked={
                  geminiReviewMode === "off"
                }
                onChange={(event) =>
                  setGeminiReviewMode(
                    event.target.value
                  )
                }
                disabled={loading}
              />
              Off
            </label>
          </div>

          <div
            style={{
              marginTop: "8px",
              fontSize: "11px",
              color: "#94a3b8",
            }}
          >
            ZIP limit: 1 GB
          </div>

          {selectedZip && (
            <button
              type="button"
              onClick={clearZip}
              disabled={loading}
              style={{
                marginTop: "10px",
                padding: "9px 14px",
                borderRadius: "8px",
                border:
                  "1px solid #64748b",
                background:
                  "transparent",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              Clear Project ZIP
            </button>
          )}
        </>
      )}

      {uploadMode === "source" &&
        editorCode && (
          <div
            style={{
              marginTop: "10px",
              padding: "8px 10px",
              borderRadius: "8px",
              background:
                currentLineCount >
                MAX_CODE_LINES
                  ? "rgba(239,68,68,.08)"
                  : "rgba(59,130,246,.07)",
              color:
                currentLineCount >
                MAX_CODE_LINES
                  ? "#fca5a5"
                  : "#93c5fd",
              fontSize: "10px",
            }}
          >
            Code Editor:{" "}
            {currentLineCount.toLocaleString()}
            {" / "}
            {MAX_CODE_LINES.toLocaleString()}
            {" lines"}
          </div>
        )}

      {error && (
        <div
          className="upload-error"
          role="alert"
        >
          {error}
        </div>
      )}

      {success && (
        <div className="upload-success">
          {success}
        </div>
      )}

      <button
        type="button"
        className={`analyze-btn ${
          loading ? "loading" : ""
        }`}
        onClick={
          uploadMode === "zip"
            ? analyzeZip
            : analyzeCode
        }
        disabled={
          loading ||
          projectsLoading ||
          (uploadMode === "source" &&
            currentLineCount >
              MAX_CODE_LINES) ||
          (uploadMode === "zip" &&
            !selectedZip)
        }
      >
        {loading
          ? uploadMode === "zip"
            ? "Analysing Project ZIP..."
            : `Analysing ${currentLineCount.toLocaleString()} lines...`
          : uploadMode === "zip"
            ? "🚀 Analyse Project ZIP"
            : "🚀 Analyse Code"}
      </button>
    </div>
  );
}