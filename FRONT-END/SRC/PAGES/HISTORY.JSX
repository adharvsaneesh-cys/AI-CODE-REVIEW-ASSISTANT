import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { AnalysisContext } from "../context/analysis-context";
import { getProjectScanHistory } from "../services/scan";

import "./History.css";

export default function History() {
  const navigate = useNavigate();

  const {
    selectedProjectId,
    setAnalysisResult,
    scanRefreshKey,
  } = useContext(AnalysisContext);

  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] =
    useState("all");

  useEffect(() => {
    if (!selectedProjectId) {
      setScans([]);
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      try {
        setLoading(true);
        setError("");

        const result =
          await getProjectScanHistory(
            selectedProjectId,
          );

        if (cancelled) return;

        const scanList = Array.isArray(result)
          ? result
          : result?.scans || [];

        setScans(scanList);
      } catch (historyError) {
        if (!cancelled) {
          console.error(
            "HISTORY ERROR:",
            historyError,
          );

          setError(
            historyError.message ||
              "Unable to load scan history.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, scanRefreshKey]);

  const languages = useMemo(() => {
    const values = scans
      .map((scan) => scan.language)
      .filter(Boolean);

    return [...new Set(values)];
  }, [scans]);

  const filteredScans = useMemo(() => {
    return scans.filter((scan) => {
      const fileName = String(
        scan.fileName || "",
      ).toLowerCase();

      const language = String(
        scan.language || "",
      ).toLowerCase();

      const searchValue =
        search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        fileName.includes(searchValue) ||
        language.includes(searchValue);

      const matchesLanguage =
        languageFilter === "all" ||
        language ===
          languageFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesLanguage
      );
    });
  }, [
    scans,
    search,
    languageFilter,
  ]);

  function getIssueTotal(scan) {
    if (Array.isArray(scan?.issues)) {
      return scan.issues.length;
    }

    const counts =
      scan?.issueCount || {};

    return (
      (counts.critical || 0) +
      (counts.high || 0) +
      (counts.medium || 0) +
      (counts.low || 0) +
      (counts.info || 0)
    );
  }

  function scoreClass(score) {
    if (score >= 80) return "good";
    if (score >= 60) return "medium";

    return "danger";
  }

  function formatDate(value) {
    if (!value) return "Unknown date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleString();
  }

  function openScan(scan) {
    setAnalysisResult(scan);
    navigate("/dashboard");
  }

  return (
    <div className="history-page">
      <div className="history-heading">
        <div>
          <h1>Scan History</h1>

          <p>
            Review previously completed
            security scans.
          </p>
        </div>

        <div className="history-count">
          {scans.length}{" "}
          {scans.length === 1
            ? "scan"
            : "scans"}
        </div>
      </div>

      <div className="history-controls">
        <input
          type="text"
          placeholder="Search by file or language..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        <select
          value={languageFilter}
          onChange={(event) =>
            setLanguageFilter(
              event.target.value,
            )
          }
        >
          <option value="all">
            All languages
          </option>

          {languages.map((language) => (
            <option
              key={language}
              value={language}
            >
              {language}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="history-state">
          Loading scan history...
        </div>
      )}

      {!loading && error && (
        <div className="history-state history-error">
          {error}
        </div>
      )}

      {!loading &&
        !error &&
        filteredScans.length === 0 && (
          <div className="history-state">
            No matching scans found.
          </div>
        )}

      {!loading &&
        !error &&
        filteredScans.length > 0 && (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Language</th>
                  <th>Issues</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredScans.map(
                  (scan) => {
                    const score =
                      scan.securityScore ??
                      100;

                    const issueTotal =
                      getIssueTotal(scan);

                    return (
                      <tr key={scan._id}>
                        <td>
                          <strong>
                            {scan.fileName ||
                              "Unknown file"}
                          </strong>
                        </td>

                        <td>
                          <span className="language-badge">
                            {scan.language ||
                              "Unknown"}
                          </span>
                        </td>

                        <td>
                          {issueTotal}
                        </td>

                        <td>
                          <span
                            className={`history-score ${scoreClass(
                              score,
                            )}`}
                          >
                            {score}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`history-status ${
                              scan.status ||
                              "completed"
                            }`}
                          >
                            {scan.status ||
                              "completed"}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            scan.completedAt ||
                              scan.createdAt,
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="view-scan-button"
                            onClick={() =>
                              openScan(scan)
                            }
                          >
                            View Scan
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}