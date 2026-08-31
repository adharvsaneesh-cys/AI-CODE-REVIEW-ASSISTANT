import {
  useMemo,
  useState,
} from "react";

import {
  FaBookmark,
  FaCopy,
  FaSearch,
  FaShieldAlt,
  FaTrash,
} from "react-icons/fa";

import {
  clearSavedFindings,
  getSavedFindings,
  removeSavedFinding,
} from "../services/savedFindings";

import "../styles/SavedFindings.css";

function severityClass(
  severity,
) {
  const value = String(
    severity || "medium",
  ).toLowerCase();

  if (
    [
      "critical",
      "high",
      "medium",
      "low",
      "info",
    ].includes(value)
  ) {
    return value;
  }

  return "medium";
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

export default function SavedFindings() {
  const [
    findings,
    setFindings,
  ] = useState(
    getSavedFindings,
  );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    severity,
    setSeverity,
  ] = useState("all");

  const [
    message,
    setMessage,
  ] = useState("");

  const filtered =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      return findings.filter(
        (finding) => {
          const matchesSeverity =
            severity === "all" ||
            severityClass(
              finding.severity,
            ) === severity;

          const matchesSearch =
            !query ||
            [
              finding.title,
              finding.ruleId,
              finding.description,
              finding.fileName,
              finding.language,
              finding.cwe,
              finding.owaspDisplay,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(
                    query,
                  ),
              );

          return (
            matchesSeverity &&
            matchesSearch
          );
        },
      );
    }, [
      findings,
      searchTerm,
      severity,
    ]);

  const counts =
    useMemo(() => {
      return findings.reduce(
        (result, finding) => {
          const level =
            severityClass(
              finding.severity,
            );

          result.total += 1;

          if (
            result[level] !==
            undefined
          ) {
            result[level] += 1;
          }

          return result;
        },
        {
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
      );
    }, [findings]);

  function removeFinding(
    savedId,
  ) {
    const updated =
      removeSavedFinding(
        savedId,
      );

    setFindings(updated);

    setMessage(
      "Finding removed.",
    );

    setTimeout(
      () =>
        setMessage(""),
      1600,
    );
  }

  function clearAll() {
    if (
      findings.length ===
      0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Remove all saved findings?",
      );

    if (!confirmed) {
      return;
    }

    clearSavedFindings();

    setFindings([]);

    setMessage(
      "All saved findings cleared.",
    );
  }

  async function copyFix(
    finding,
  ) {
    const fix =
      finding.recommendation ||
      "No recommended fix available.";

    try {
      await navigator.clipboard.writeText(
        fix,
      );

      setMessage(
        "Recommended fix copied.",
      );

      setTimeout(
        () =>
          setMessage(""),
        1600,
      );
    } catch {
      setMessage(
        "Unable to copy fix.",
      );
    }
  }

  return (
    <div className="saved-findings-page">
      <div className="saved-findings-header">
        <div>
          <span className="saved-findings-eyebrow">
            SECURITY WATCHLIST
          </span>

          <h1>
            Saved Findings
          </h1>

          <p>
            Keep important
            vulnerabilities in one
            place for later
            remediation and review.
          </p>
        </div>

        <div className="saved-findings-header-actions">
          <div className="saved-findings-count">
            <FaBookmark />

            <div>
              <strong>
                {counts.total}
              </strong>

              <span>
                Saved
              </span>
            </div>
          </div>

          {findings.length >
            0 && (
            <button
              type="button"
              className="clear-findings-button"
              onClick={
                clearAll
              }
            >
              <FaTrash />
              Clear All
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="saved-findings-message">
          {message}
        </div>
      )}

      <div className="saved-findings-stats">
        <div className="saved-stat critical">
          <span>
            Critical
          </span>

          <strong>
            {counts.critical}
          </strong>
        </div>

        <div className="saved-stat high">
          <span>High</span>

          <strong>
            {counts.high}
          </strong>
        </div>

        <div className="saved-stat medium">
          <span>
            Medium
          </span>

          <strong>
            {counts.medium}
          </strong>
        </div>

        <div className="saved-stat low">
          <span>
            Low / Info
          </span>

          <strong>
            {counts.low +
              counts.info}
          </strong>
        </div>
      </div>

      <div className="saved-findings-toolbar">
        <div className="saved-findings-search">
          <FaSearch />

          <input
            type="text"
            placeholder="Search title, file, CWE, OWASP..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
          />
        </div>

        <select
          value={severity}
          onChange={(event) =>
            setSeverity(
              event.target.value,
            )
          }
        >
          <option value="all">
            All severities
          </option>

          <option value="critical">
            Critical
          </option>

          <option value="high">
            High
          </option>

          <option value="medium">
            Medium
          </option>

          <option value="low">
            Low
          </option>

          <option value="info">
            Info
          </option>
        </select>
      </div>

      {findings.length ===
      0 ? (
        <div className="saved-findings-empty">
          <FaBookmark />

          <h2>
            No saved findings
          </h2>

          <p>
            Save important
            vulnerabilities from
            Security Analytics and
            they will appear here.
          </p>
        </div>
      ) : filtered.length ===
        0 ? (
        <div className="saved-findings-empty">
          <FaSearch />

          <h2>
            No matching findings
          </h2>

          <p>
            Try changing your search
            or severity filter.
          </p>
        </div>
      ) : (
        <div className="saved-findings-list">
          {filtered.map(
            (finding) => {
              const level =
                severityClass(
                  finding.severity,
                );

              return (
                <article
                  key={
                    finding.savedId
                  }
                  className="saved-finding-card"
                >
                  <div
                    className={`saved-finding-indicator ${level}`}
                  />

                  <div className="saved-finding-content">
                    <div className="saved-finding-top">
                      <div>
                        <span className="saved-file-name">
                          {finding.fileName ||
                            "Unknown file"}

                          {finding.line
                            ? ` • Line ${finding.line}`
                            : ""}
                        </span>

                        <h2>
                          {finding.title ||
                            "Security finding"}
                        </h2>
                      </div>

                      <span
                        className={`saved-severity ${level}`}
                      >
                        {level.toUpperCase()}
                      </span>
                    </div>

                    {finding.description && (
                      <p className="saved-finding-description">
                        {
                          finding.description
                        }
                      </p>
                    )}

                    <div className="saved-finding-metadata">
                      {finding.cwe && (
                        <span>
                          {
                            finding.cwe
                          }
                        </span>
                      )}

                      {finding.owaspDisplay && (
                        <span>
                          {
                            finding.owaspDisplay
                          }
                        </span>
                      )}

                      {finding.language && (
                        <span>
                          {
                            finding.language
                          }
                        </span>
                      )}
                    </div>

                    {finding.recommendation && (
                      <div className="saved-finding-fix">
                        <strong>
                          Recommended Fix
                        </strong>

                        <p>
                          {
                            finding.recommendation
                          }
                        </p>
                      </div>
                    )}

                    <div className="saved-finding-footer">
                      <span>
                        Saved{" "}
                        {formatDate(
                          finding.savedAt,
                        )}
                      </span>

                      <div>
                        <button
                          type="button"
                          className="copy-saved-fix"
                          onClick={() =>
                            copyFix(
                              finding,
                            )
                          }
                        >
                          <FaCopy />
                          Copy Fix
                        </button>

                        <button
                          type="button"
                          className="remove-saved-finding"
                          onClick={() =>
                            removeFinding(
                              finding.savedId,
                            )
                          }
                        >
                          <FaTrash />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}