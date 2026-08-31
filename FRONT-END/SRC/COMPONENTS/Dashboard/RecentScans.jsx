import {
  useContext,
  useEffect,
  useState,
} from "react";

import { AnalysisContext } from "../../context/analysis-context";
import { getProjectScanHistory } from "../../services/scan";

export default function RecentScans() {
  const {
    selectedProjectId,
    scanRefreshKey,
  } = useContext(AnalysisContext);

  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedProjectId) {
      setScans([]);
      return;
    }

    let cancelled = false;

    async function loadScanHistory() {
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

        setScans(scanList.slice(0, 5));
      } catch (err) {
        if (!cancelled) {
          console.error(
            "SCAN HISTORY ERROR:",
            err,
          );

          setError(
            err.message ||
              "Unable to load scan history.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadScanHistory();

    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, scanRefreshKey]);

  function scoreColor(score) {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  }

  function formatDate(value) {
    if (!value) return "Unknown date";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleString();
  }

  return (
    <div
      className="dashboard-card"
      style={{ minHeight: "220px" }}
    >
      <h2>Recent Scans</h2>

      {loading && (
        <p
          style={{
            color: "#94a3b8",
            marginTop: "20px",
            textAlign: "center",
          }}
        >
          Loading scan history...
        </p>
      )}

      {!loading && error && (
        <p
          style={{
            color: "#ef4444",
            marginTop: "20px",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      {!loading &&
        !error &&
        scans.length === 0 && (
          <p
            style={{
              color: "#94a3b8",
              marginTop: "20px",
              textAlign: "center",
            }}
          >
            No recent scans available.
          </p>
        )}

      {!loading &&
        !error &&
        scans.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginTop: "18px",
            }}
          >
            {scans.map((scan, index) => {
              const fileName =
                scan.fileName ||
                scan.filename ||
                "Unknown file";

              const language =
                scan.language || "Unknown";

              const securityScore =
                scan.securityScore ?? 100;

              const issues =
                Array.isArray(scan.issues)
                  ? scan.issues
                  : [];

              const totalIssues =
                scan.issueCount?.total ??
                scan.totalIssues ??
                issues.length;

              const scanDate =
                scan.createdAt ||
                scan.scannedAt ||
                scan.updatedAt;

              return (
               <div
  key={
    scan._id ||
    `${fileName}-${index}`
  }
  className="recent-scan-item"
>
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          color: "#f8fafc",
                        }}
                      >
                        {fileName}
                      </h3>

                      <p
                        style={{
                          color: "#94a3b8",
                          marginTop: "6px",
                          marginBottom: 0,
                          textTransform:
                            "lowercase",
                        }}
                      >
                        {language}
                      </p>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "24px",
                          color: scoreColor(
                            securityScore,
                          ),
                        }}
                      >
                        {securityScore}
                      </strong>

                      <p
                        style={{
                          color: "#94a3b8",
                          marginTop: "4px",
                          marginBottom: 0,
                        }}
                      >
                        Security score
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                      gap: "15px",
                      marginTop: "14px",
                      paddingTop: "12px",
                      borderTop:
                        "1px solid rgba(148,163,184,0.12)",
                      color: "#cbd5e1",
                    }}
                  >
                    <span>
                      {totalIssues}{" "}
                      {totalIssues === 1
                        ? "issue"
                        : "issues"}
                    </span>

                    <span>
                      {formatDate(scanDate)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}