import {
  useContext,
  useEffect,
  useState,
} from "react";

import {
  FaBookmark,
  FaCheck,
} from "react-icons/fa";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { AnalysisContext } from "../../context/analysis-context";

import {
  getSavedFindings,
  saveFinding,
} from "../../services/savedFindings";

import "./AnalyticsChart.css";

const COLOURS = {
  Critical: "#dc2626",
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#22c55e",
};

function mapSeverity(value) {
  const severity = String(
    value || "",
  ).toLowerCase();

  if (severity === "critical") {
    return "Critical";
  }

  if (severity === "high") {
    return "High";
  }

  if (severity === "medium") {
    return "Medium";
  }

  if (
    severity === "low" ||
    severity === "info"
  ) {
    return "Low";
  }

  return "Medium";
}

function formatOwasp(owasp) {
  if (!owasp) {
    return "Not applicable";
  }

  if (typeof owasp === "string") {
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

export default function AnalyticsChart({
  selectedSeverity,
}) {
  const {
    analysisResult,
  } = useContext(
    AnalysisContext,
  );

  const [
    savedIds,
    setSavedIds,
  ] = useState(
    new Set(),
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const issues =
    Array.isArray(
      analysisResult?.issues,
    )
      ? analysisResult.issues
      : [];

  useEffect(() => {
    const saved =
      getSavedFindings();

    setSavedIds(
      new Set(
        saved.map(
          (finding) =>
            finding.savedId,
        ),
      ),
    );
  }, [analysisResult]);

  const counts = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };

  issues.forEach((issue) => {
    const mapped =
      mapSeverity(
        issue?.severity,
      );

    counts[mapped] += 1;
  });

  const data = [
    {
      name: "Critical",
      value:
        counts.Critical,
      color:
        COLOURS.Critical,
    },

    {
      name: "High",
      value:
        counts.High,
      color:
        COLOURS.High,
    },

    {
      name: "Medium",
      value:
        counts.Medium,
      color:
        COLOURS.Medium,
    },

    {
      name: "Low",
      value:
        counts.Low,
      color:
        COLOURS.Low,
    },
  ];

  const totalIssues =
    issues.length;

  const securityScore =
    analysisResult
      ?.securityScore ??
    100;

  const filteredIssues =
    selectedSeverity
      ? issues.filter(
          (issue) => {
            const mapped =
              mapSeverity(
                issue
                  ?.severity,
              ).toLowerCase();

            return (
              mapped ===
              selectedSeverity.toLowerCase()
            );
          },
        )
      : issues;

  const selectedLabel =
    selectedSeverity
      ? selectedSeverity
          .charAt(0)
          .toUpperCase() +
        selectedSeverity.slice(
          1,
        )
      : null;

  function createFindingId(
    issue,
  ) {
    return `${issue.ruleId || "finding"}-${analysisResult?.fileName || "file"}-${issue.line || 0}`;
  }

  function handleSaveFinding(
    issue,
  ) {
    const savedId =
      createFindingId(
        issue,
      );

    const result =
      saveFinding({
        ...issue,

        savedId,

        fileName:
          analysisResult
            ?.fileName ||
          "Unknown file",

        language:
          analysisResult
            ?.language ||
          "Unknown",

        securityScore:
          analysisResult
            ?.securityScore ??
          null,

        scanId:
          analysisResult
            ?._id ||
          null,

        owaspDisplay:
          formatOwasp(
            issue.owasp,
          ),
      });

    if (result.duplicate) {
      setMessage(
        "Finding already saved.",
      );
    } else {
      setSavedIds(
        (current) => {
          const updated =
            new Set(
              current,
            );

          updated.add(
            savedId,
          );

          return updated;
        },
      );

      setMessage(
        "Finding saved successfully.",
      );
    }

    setTimeout(
      () =>
        setMessage(""),
      1800,
    );
  }

  return (
    <div className="analytics-card">
      <div className="analytics-header">
        <div>
          <h2>
            Security Analytics
          </h2>

          <p>
            Severity distribution
            for the latest scan
          </p>
        </div>

        <span className="analytics-total">
          {totalIssues}{" "}
          {totalIssues === 1
            ? "issue"
            : "issues"}
        </span>
      </div>

      {message && (
        <div className="analytics-save-message">
          {message}
        </div>
      )}

      {!analysisResult ? (
        <div className="chart-empty-state">
          <strong>
            No scan completed
          </strong>

          <span>
            Upload source code
            and start an analysis.
          </span>
        </div>
      ) : totalIssues === 0 ? (
        <div className="chart-empty-state chart-safe-state">
          <div className="safe-ring">
            {securityScore}
          </div>

          <strong>
            No vulnerabilities detected
          </strong>

          <span>
            No security findings were
            returned by the latest scan.
          </span>
        </div>
      ) : (
        <>
          <div className="chart-wrapper">
            <ResponsiveContainer
              width="100%"
              height={260}
            >
              <PieChart>
                <Pie
                  data={data.filter(
                    (item) =>
                      item.value > 0,
                  )}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  stroke="transparent"
                >
                  {data
                    .filter(
                      (item) =>
                        item.value > 0,
                    )
                    .map(
                      (entry) => (
                        <Cell
                          key={
                            entry.name
                          }
                          fill={
                            entry.color
                          }
                        />
                      ),
                    )}
                </Pie>

                <Tooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="finding-list">
            <div className="finding-list-header">
              <h3>
                {selectedLabel
                  ? `${selectedLabel} Risk Findings`
                  : "Detected Risks"}
              </h3>

              <span>
                {
                  filteredIssues.length
                }{" "}
                {filteredIssues.length === 1
                  ? "finding"
                  : "findings"}
              </span>
            </div>

            {filteredIssues.length === 0 ? (
              <p className="no-findings">
                No{" "}
                {selectedLabel ||
                  "matching"}{" "}
                vulnerabilities were
                detected.
              </p>
            ) : (
              filteredIssues.map(
                (
                  issue,
                  index,
                ) => {
                  const savedId =
                    createFindingId(
                      issue,
                    );

                  const saved =
                    savedIds.has(
                      savedId,
                    );

                  return (
                    <div
                      className="finding-item detected-risk-card"
                      key={
                        issue._id ||
                        `${issue.ruleId}-${issue.line}-${index}`
                      }
                    >
                      <div className="finding-title-row">
                        <strong>
                          {issue.title ||
                            "Security finding"}
                        </strong>

                        <span
                          className={`finding-severity ${mapSeverity(
                            issue.severity,
                          ).toLowerCase()}`}
                        >
                          {mapSeverity(
                            issue.severity,
                          )}
                        </span>
                      </div>

                      {issue.line && (
                        <p className="finding-line">
                          Line{" "}
                          {issue.line}
                        </p>
                      )}

                      {issue.description && (
                        <p>
                          {
                            issue.description
                          }
                        </p>
                      )}

                      {(issue.owasp ||
                        issue.cwe) && (
                        <div className="analytics-finding-meta">
                          {issue.owasp && (
                            <span>
                              {formatOwasp(
                                issue.owasp,
                              )}
                            </span>
                          )}

                          {issue.cwe && (
                            <span>
                              {
                                issue.cwe
                              }
                            </span>
                          )}
                        </div>
                      )}

                      {issue.recommendation && (
                        <p className="finding-fix">
                          <strong>
                            Fix:
                          </strong>{" "}
                          {
                            issue.recommendation
                          }
                        </p>
                      )}

                      <div className="finding-save-row">
                        <button
                          type="button"
                          className={`save-finding-button ${
                            saved
                              ? "saved"
                              : ""
                          }`}
                          onClick={() =>
                            handleSaveFinding(
                              issue,
                            )
                          }
                          disabled={
                            saved
                          }
                        >
                          {saved ? (
                            <>
                              <FaCheck />
                              Saved
                            </>
                          ) : (
                            <>
                              <FaBookmark />
                              Save Finding
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                },
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}