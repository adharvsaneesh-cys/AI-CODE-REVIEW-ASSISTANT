import {
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaArrowDown,
  FaArrowUp,
  FaChartLine,
  FaExclamationTriangle,
  FaShieldAlt,
} from "react-icons/fa";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AnalysisContext } from "../context/analysis-context";
import { getProjectScanHistory } from "../services/scan";

import "../styles/SecurityTrends.css";

function getIssueCounts(scan) {
  const counts =
    scan?.issueCount || {};

  if (
    counts &&
    typeof counts === "object"
  ) {
    return {
      critical:
        Number(counts.critical) || 0,

      high:
        Number(counts.high) || 0,

      medium:
        Number(counts.medium) || 0,

      low:
        Number(counts.low) || 0,

      info:
        Number(counts.info) || 0,
    };
  }

  const issues =
    Array.isArray(scan?.issues)
      ? scan.issues
      : [];

  return issues.reduce(
    (result, issue) => {
      const severity =
        String(
          issue?.severity || "",
        ).toLowerCase();

      if (
        result[severity] !==
        undefined
      ) {
        result[severity] += 1;
      }

      return result;
    },
    {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    },
  );
}

function getIssueTotal(scan) {
  const counts =
    getIssueCounts(scan);

  return (
    counts.critical +
    counts.high +
    counts.medium +
    counts.low +
    counts.info
  );
}

function formatShortDate(value) {
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

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
    },
  );
}

function formatFullDate(value) {
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

export default function SecurityTrends() {
  const {
    selectedProjectId,
    scanRefreshKey,
  } = useContext(
    AnalysisContext,
  );

  const [
    scans,
    setScans,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (
      !selectedProjectId
    ) {
      setScans([]);

      return;
    }

    let cancelled =
      false;

    async function loadTrends() {
      try {
        setLoading(true);
        setError("");

        const result =
          await getProjectScanHistory(
            selectedProjectId,
          );

        if (cancelled) {
          return;
        }

        const list =
          Array.isArray(result)
            ? result
            : result?.scans ||
              [];

        setScans(list);
      } catch (loadError) {
        if (!cancelled) {
          console.error(
            "SECURITY TRENDS ERROR:",
            loadError,
          );

          setError(
            loadError.message ||
              "Unable to load security trends.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTrends();

    return () => {
      cancelled = true;
    };
  }, [
    selectedProjectId,
    scanRefreshKey,
  ]);

  const orderedScans =
    useMemo(() => {
      return [...scans].sort(
        (a, b) =>
          new Date(
            a.completedAt ||
              a.createdAt ||
              0,
          ) -
          new Date(
            b.completedAt ||
              b.createdAt ||
              0,
          ),
      );
    }, [scans]);

  const trendData =
    useMemo(() => {
      return orderedScans.map(
        (scan, index) => {
          const counts =
            getIssueCounts(
              scan,
            );

          return {
            index:
              index + 1,

            date:
              formatShortDate(
                scan.completedAt ||
                  scan.createdAt,
              ),

            file:
              scan.fileName ||
              "Unknown",

            score:
              Number(
                scan.securityScore,
              ) || 0,

            issues:
              getIssueTotal(
                scan,
              ),

            critical:
              counts.critical,

            high:
              counts.high,

            medium:
              counts.medium,

            low:
              counts.low +
              counts.info,
          };
        },
      );
    }, [orderedScans]);

  const dailyIssueTrendData =
    useMemo(() => {
      const byDay =
        new Map();

      trendData.forEach(
        (point) => {
          const scan =
            orderedScans[
              point.index - 1
            ];

          const rawDate =
            scan?.completedAt ||
            scan?.createdAt;

          const date =
            rawDate
              ? new Date(rawDate)
              : null;

          const key =
            date &&
            !Number.isNaN(
              date.getTime(),
            )
              ? `${date.getFullYear()}-${String(
                  date.getMonth() + 1,
                ).padStart(
                  2,
                  "0",
                )}-${String(
                  date.getDate(),
                ).padStart(
                  2,
                  "0",
                )}`
              : `scan-${point.index}`;

          /*
           * Keep only the latest scan
           * from each calendar day.
           *
           * This prevents dozens of
           * same-day scans from making
           * the vulnerability chart
           * unreadable while still
           * showing the project's
           * end-of-day security state.
           */
          byDay.set(
            key,
            {
              ...point,

              date:
                rawDate
                  ? formatShortDate(
                      rawDate,
                    )
                  : point.date,

              fullDate:
                rawDate
                  ? formatFullDate(
                      rawDate,
                    )
                  : point.date,
            },
          );
        },
      );

      return [
        ...byDay.values(),
      ];
    }, [
      trendData,
      orderedScans,
    ]);

  const stats =
    useMemo(() => {
      if (
        orderedScans.length ===
        0
      ) {
        return {
          averageScore: 0,
          bestScore: 0,
          worstScore: 0,
          latestScore: 0,
          previousScore: 0,
          scoreChange: 0,
          latestIssues: 0,
          previousIssues: 0,
          issueChange: 0,
        };
      }

      const scores =
        orderedScans.map(
          (scan) =>
            Number(
              scan.securityScore,
            ) || 0,
        );

      const averageScore =
        Math.round(
          scores.reduce(
            (sum, score) =>
              sum + score,
            0,
          ) / scores.length,
        );

      const latest =
        orderedScans[
          orderedScans.length -
            1
        ];

      const previous =
        orderedScans[
          orderedScans.length -
            2
        ];

      const latestScore =
        Number(
          latest
            ?.securityScore,
        ) || 0;

      const previousScore =
        previous
          ? Number(
              previous
                .securityScore,
            ) || 0
          : latestScore;

      const latestIssues =
        getIssueTotal(
          latest,
        );

      const previousIssues =
        previous
          ? getIssueTotal(
              previous,
            )
          : latestIssues;

      return {
        averageScore,

        bestScore:
          Math.max(
            ...scores,
          ),

        worstScore:
          Math.min(
            ...scores,
          ),

        latestScore,

        previousScore,

        scoreChange:
          latestScore -
          previousScore,

        latestIssues,

        previousIssues,

        issueChange:
          latestIssues -
          previousIssues,
      };
    }, [orderedScans]);

  const commonFindings =
    useMemo(() => {
      const ruleMap =
        new Map();

      orderedScans.forEach(
        (scan) => {
          const issues =
            Array.isArray(
              scan?.issues,
            )
              ? scan.issues
              : [];

          issues.forEach(
            (issue) => {
              const key =
                issue.ruleId ||
                issue.title ||
                "unknown";

              const existing =
                ruleMap.get(
                  key,
                ) || {
                  title:
                    issue.title ||
                    key,

                  severity:
                    issue.severity ||
                    "medium",

                  count: 0,
                };

              existing.count +=
                1;

              ruleMap.set(
                key,
                existing,
              );
            },
          );
        },
      );

      return [
        ...ruleMap.values(),
      ]
        .sort(
          (a, b) =>
            b.count -
            a.count,
        )
        .slice(0, 5);
    }, [orderedScans]);

  const latestScan =
    orderedScans.length > 0
      ? orderedScans[
          orderedScans.length -
            1
        ]
      : null;

  return (
    <div className="security-trends-page">
      <div className="security-trends-header">
        <div>
          <span className="security-trends-eyebrow">
            SECURITY PERFORMANCE
          </span>

          <h1>
            Security Trends
          </h1>

          <p>
            Track how your project
            security score and
            vulnerability levels
            change across scans.
          </p>
        </div>

        <div className="trends-project-status">
          <FaChartLine />

          <div>
            <strong>
              {
                orderedScans.length
              }
            </strong>

            <span>
              Scans analysed
            </span>
          </div>
        </div>
      </div>

      {!selectedProjectId && (
        <div className="trends-state-card">
          <FaShieldAlt />

          <h2>
            No project selected
          </h2>

          <p>
            Select a project before
            viewing security trends.
          </p>
        </div>
      )}

      {selectedProjectId &&
        loading && (
          <div className="trends-state-card">
            <div className="trends-loader" />

            <h2>
              Loading trends
            </h2>

            <p>
              Analysing your scan
              history...
            </p>
          </div>
        )}

      {selectedProjectId &&
        !loading &&
        error && (
          <div className="trends-state-card trends-error">
            <FaExclamationTriangle />

            <h2>
              Unable to load trends
            </h2>

            <p>
              {error}
            </p>
          </div>
        )}

      {selectedProjectId &&
        !loading &&
        !error &&
        orderedScans.length ===
          0 && (
          <div className="trends-state-card">
            <FaChartLine />

            <h2>
              No trend data yet
            </h2>

            <p>
              Run at least one scan
              for this project to
              start building its
              security history.
            </p>
          </div>
        )}

      {selectedProjectId &&
        !loading &&
        !error &&
        orderedScans.length >
          0 && (
          <>
            <div className="trends-stats-grid">
              <div className="trend-stat-card latest-score">
                <span>
                  Latest Score
                </span>

                <strong>
                  {
                    stats.latestScore
                  }
                </strong>

                <small
                  className={
                    stats.scoreChange >=
                    0
                      ? "positive"
                      : "negative"
                  }
                >
                  {stats.scoreChange >=
                  0 ? (
                    <FaArrowUp />
                  ) : (
                    <FaArrowDown />
                  )}

                  {Math.abs(
                    stats.scoreChange,
                  )}{" "}
                  points
                </small>
              </div>

              <div className="trend-stat-card">
                <span>
                  Average Score
                </span>

                <strong>
                  {
                    stats.averageScore
                  }
                </strong>

                <small>
                  Across all scans
                </small>
              </div>

              <div className="trend-stat-card">
                <span>
                  Best Score
                </span>

                <strong className="trend-good">
                  {
                    stats.bestScore
                  }
                </strong>

                <small>
                  Highest recorded
                </small>
              </div>

              <div className="trend-stat-card">
                <span>
                  Current Issues
                </span>

                <strong>
                  {
                    stats.latestIssues
                  }
                </strong>

                <small
                  className={
                    stats.issueChange <=
                    0
                      ? "positive"
                      : "negative"
                  }
                >
                  {stats.issueChange <=
                  0 ? (
                    <FaArrowDown />
                  ) : (
                    <FaArrowUp />
                  )}

                  {Math.abs(
                    stats.issueChange,
                  )}{" "}
                  issues
                </small>
              </div>
            </div>

            <div className="trends-section-card">
              <div className="trends-section-heading">
                <div>
                  <span>
                    SCORE HISTORY
                  </span>

                  <h2>
                    Security Score
                    Trend
                  </h2>
                </div>

                <p>
                  Higher scores mean
                  stronger security.
                </p>
              </div>

              <div className="trends-chart">
                <ResponsiveContainer
                  width="100%"
                  height={310}
                >
                  <AreaChart
                    data={
                      trendData
                    }
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.15}
                    />

                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <YAxis
                      domain={[
                        0,
                        100,
                      ]}
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <Tooltip />

                    <Area
                      type="monotone"
                      dataKey="score"
                      name="Security Score"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.18}
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="trends-section-card">
              <div className="trends-section-heading">
                <div>
                  <span>
                    VULNERABILITY HISTORY
                  </span>

                  <h2>
                    Issues Over Time
                  </h2>
                </div>

                <p>
                  Latest security state
                  per day for a cleaner,
                  easier-to-read trend.
                </p>
              </div>

              <div className="trends-chart">
                <ResponsiveContainer
                  width="100%"
                  height={310}
                >
                  <LineChart
                    data={
                      dailyIssueTrendData
                    }
                    margin={{
                      top: 8,
                      right: 18,
                      left: 0,
                      bottom: 4,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.15}
                    />

                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                      }}
                      interval="preserveStartEnd"
                      minTickGap={38}
                      tickMargin={10}
                    />

                    <YAxis
                      allowDecimals={
                        false
                      }
                      tick={{
                        fontSize: 10,
                      }}
                    />

                    <Tooltip
                      labelFormatter={(
                        _label,
                        payload,
                      ) =>
                        payload?.[0]
                          ?.payload
                          ?.fullDate ||
                        _label
                      }
                    />

                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="line"
                      wrapperStyle={{
                        paddingBottom:
                          "14px",
                      }}
                    />

                    <Line
                      type="monotone"
                      dataKey="critical"
                      name="Critical"
                      stroke="#dc2626"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{
                        r: 5,
                      }}
                      connectNulls
                    />

                    <Line
                      type="monotone"
                      dataKey="high"
                      name="High"
                      stroke="#f97316"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{
                        r: 5,
                      }}
                      connectNulls
                    />

                    <Line
                      type="monotone"
                      dataKey="medium"
                      name="Medium"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{
                        r: 5,
                      }}
                      connectNulls
                    />

                    <Line
                      type="monotone"
                      dataKey="low"
                      name="Low / Info"
                      stroke="#22c55e"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{
                        r: 5,
                      }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="trends-bottom-grid">
              <div className="trends-section-card">
                <div className="trends-section-heading">
                  <div>
                    <span>
                      RECURRING RISKS
                    </span>

                    <h2>
                      Most Frequent
                      Findings
                    </h2>
                  </div>
                </div>

                {commonFindings.length ===
                0 ? (
                  <div className="trend-mini-empty">
                    No recurring
                    findings available.
                  </div>
                ) : (
                  <div className="frequent-findings-list">
                    {commonFindings.map(
                      (
                        finding,
                        index,
                      ) => (
                        <div
                          className="frequent-finding-row"
                          key={`${finding.title}-${index}`}
                        >
                          <div>
                            <strong>
                              {
                                finding.title
                              }
                            </strong>

                            <span>
                              {String(
                                finding.severity,
                              ).toUpperCase()}
                            </span>
                          </div>

                          <strong className="finding-frequency">
                            {
                              finding.count
                            }
                            ×
                          </strong>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div className="trends-section-card">
                <div className="trends-section-heading">
                  <div>
                    <span>
                      LATEST SCAN
                    </span>

                    <h2>
                      Current Security
                      Snapshot
                    </h2>
                  </div>
                </div>

                {latestScan && (
                  <div className="latest-trend-snapshot">
                    <div>
                      <span>
                        File
                      </span>

                      <strong>
                        {latestScan.fileName ||
                          "Unknown"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Language
                      </span>

                      <strong>
                        {latestScan.language ||
                          "Unknown"}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Score
                      </span>

                      <strong>
                        {latestScan.securityScore ??
                          100}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Issues
                      </span>

                      <strong>
                        {getIssueTotal(
                          latestScan,
                        )}
                      </strong>
                    </div>

                    <div className="snapshot-full">
                      <span>
                        Completed
                      </span>

                      <strong>
                        {formatFullDate(
                          latestScan.completedAt ||
                            latestScan.createdAt,
                        )}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
    </div>
  );
}