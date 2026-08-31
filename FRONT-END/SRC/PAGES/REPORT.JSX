import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import {
  useContext,
} from "react";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import {
  AnalysisContext,
} from "../context/analysis-context";

import { getSettings } from "../services/settings";

import "./Reports.css";

const PDF_THEMES = {
  dark: {
    background: [
      8,
      15,
      28,
    ],

    card: [
      17,
      24,
      39,
    ],

    border: [
      38,
      51,
      74,
    ],

    text: [
      248,
      250,
      252,
    ],

    muted: [
      148,
      163,
      184,
    ],

    blue: [
      96,
      165,
      250,
    ],

    green: [
      74,
      222,
      128,
    ],

    red: [
      248,
      113,
      113,
    ],

    yellow: [
      250,
      204,
      21,
    ],

    chartBackground:
      "#111827",
  },

  light: {
    background: [
      244,
      247,
      251,
    ],

    card: [
      255,
      255,
      255,
    ],

    border: [
      203,
      213,
      225,
    ],

    text: [
      15,
      23,
      42,
    ],

    muted: [
      71,
      85,
      105,
    ],

    blue: [
      37,
      99,
      235,
    ],

    green: [
      4,
      120,
      87,
    ],

    red: [
      220,
      38,
      38,
    ],

    yellow: [
      202,
      138,
      4,
    ],

    chartBackground:
      "#ffffff",
  },
};

function getCurrentTheme() {
  const documentTheme =
    document.documentElement.getAttribute(
      "data-theme",
    );

  if (
    documentTheme === "light" ||
    documentTheme === "dark"
  ) {
    return documentTheme;
  }

  const savedTheme =
    localStorage.getItem(
      "dashboardTheme",
    );

  return savedTheme ===
    "light"
    ? "light"
    : "dark";
}

function formatOwasp(
  owasp,
) {
  if (!owasp) {
    return "Not applicable";
  }

  if (
    typeof owasp ===
    "string"
  ) {
    return owasp;
  }

  const id =
    owasp.id ||
    "Not applicable";

  const category =
    owasp.category ||
    "Not applicable";

  if (
    id ===
      "Not applicable" &&
    category ===
      "Not applicable"
  ) {
    return "Not applicable";
  }

  return `${id} - ${category}`;
}

function normaliseConfidence(
  value,
) {
  const confidence =
    String(
      value || "medium",
    ).toLowerCase();

  if (
    [
      "high",
      "medium",
      "low",
    ].includes(confidence)
  ) {
    return confidence;
  }

  return "medium";
}

function normaliseSeverity(
  value,
) {
  const severity =
    String(
      value || "low",
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

  return "low";
}

export default function Report() {
  const {
    analysisResult,
  } = useContext(
    AnalysisContext,
  );

  const reportSettings =
    getSettings();

  const issues =
    Array.isArray(
      analysisResult?.issues,
    )
      ? analysisResult.issues
      : [];

  const securityScore =
    analysisResult
      ?.securityScore ?? 100;

  const totalIssues =
    issues.length;

  const aiReview =
    analysisResult
      ?.aiReview || null;

  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  issues.forEach((issue) => {
    const severity =
      normaliseSeverity(
        issue?.severity,
      );

    if (
      severity ===
      "critical"
    ) {
      severityCounts.critical +=
        1;
    } else if (
      severity === "high"
    ) {
      severityCounts.high +=
        1;
    } else if (
      severity === "medium"
    ) {
      severityCounts.medium +=
        1;
    } else {
      severityCounts.low +=
        1;
    }
  });

  const chartData = [
    {
      name: "Critical",
      value:
        severityCounts.critical,
      color: "#dc2626",
    },

    {
      name: "High",
      value:
        severityCounts.high,
      color: "#f97316",
    },

    {
      name: "Medium",
      value:
        severityCounts.medium,
      color: "#eab308",
    },

    {
      name: "Low",
      value:
        severityCounts.low,
      color: "#22c55e",
    },
  ].filter(
    (item) =>
      item.value > 0,
  );

  const riskLevel =
    aiReview?.riskLevel ||
    (securityScore >= 85
      ? "low"
      : securityScore >=
          60
        ? "medium"
        : "high");

  async function downloadPDF() {
    try {
      const currentTheme =
        reportSettings.pdfTheme === "match"
          ? getCurrentTheme()
          : reportSettings.pdfTheme;

      const palette =
        PDF_THEMES[
          currentTheme === "light"
            ? "light"
            : "dark"
        ];

      const {
        background,
        card,
        border,
        text,
        muted,
        blue,
        green,
        red,
        yellow,
        chartBackground,
      } = palette;

      const pdf =
        new jsPDF(
          "p",
          "mm",
          "a4",
        );

      const pageWidth =
        pdf.internal
          .pageSize
          .getWidth();

      const pageHeight =
        pdf.internal
          .pageSize
          .getHeight();

      const margin = 14;

      const contentWidth =
        pageWidth -
        margin * 2;

      let y = 16;

      function paintPage() {
        pdf.setFillColor(
          ...background,
        );

        pdf.rect(
          0,
          0,
          pageWidth,
          pageHeight,
          "F",
        );
      }

      function newPage() {
        pdf.addPage();

        paintPage();

        y = 16;
      }

      function ensureSpace(
        height,
      ) {
        if (
          y + height >
          pageHeight - 18
        ) {
          newPage();
        }
      }

      function addTitle(
        title,
        size = 15,
        bottom = 8,
      ) {
        ensureSpace(12);

        pdf.setFont(
          "helvetica",
          "bold",
        );

        pdf.setFontSize(
          size,
        );

        pdf.setTextColor(
          ...text,
        );

        pdf.text(
          String(title),
          margin,
          y,
        );

        y += bottom;
      }

      function addParagraph(
        value,
        options = {},
      ) {
        if (!value) {
          return;
        }

        const color =
          options.color ||
          muted;

        const size =
          options.size ||
          8.5;

        const bottom =
          options.bottom ??
          5;

        pdf.setFont(
          "helvetica",
          "normal",
        );

        pdf.setFontSize(
          size,
        );

        pdf.setTextColor(
          ...color,
        );

        const lines =
          pdf.splitTextToSize(
            String(value),
            contentWidth,
          );

        const height =
          lines.length *
          4.3;

        ensureSpace(
          height + bottom,
        );

        pdf.text(
          lines,
          margin,
          y,
        );

        y +=
          height + bottom;
      }

      function addStatCard(
        label,
        value,
        x,
        width,
      ) {
        pdf.setFillColor(
          ...card,
        );

        pdf.setDrawColor(
          ...border,
        );

        pdf.roundedRect(
          x,
          y,
          width,
          22,
          3,
          3,
          "FD",
        );

        pdf.setFont(
          "helvetica",
          "normal",
        );

        pdf.setFontSize(7);

        pdf.setTextColor(
          ...muted,
        );

        pdf.text(
          label,
          x + 4,
          y + 7,
        );

        pdf.setFont(
          "helvetica",
          "bold",
        );

        pdf.setFontSize(11);

        pdf.setTextColor(
          ...text,
        );

        const lines =
          pdf.splitTextToSize(
            String(value),
            width - 8,
          );

        pdf.text(
          lines,
          x + 4,
          y + 15,
        );
      }

      function severityColor(
        severity,
      ) {
        if (
          severity ===
            "critical" ||
          severity === "high"
        ) {
          return red;
        }

        if (
          severity ===
          "medium"
        ) {
          return yellow;
        }

        return green;
      }

      paintPage();

      pdf.setFont(
        "helvetica",
        "bold",
      );

      pdf.setFontSize(22);

      pdf.setTextColor(
        ...text,
      );

      pdf.text(
        "CodeGuard AI",
        margin,
        y,
      );

      y += 10;

      pdf.setFontSize(17);

      pdf.text(
        "Security Analysis Report",
        margin,
        y,
      );

      y += 7;

      pdf.setFont(
        "helvetica",
        "normal",
      );

      pdf.setFontSize(8.5);

      pdf.setTextColor(
        ...muted,
      );

      pdf.text(
        "OWASP-aligned source-code security assessment",
        margin,
        y,
      );

      y += 9;

      pdf.setDrawColor(
        ...border,
      );

      pdf.line(
        margin,
        y,
        pageWidth -
          margin,
        y,
      );

      y += 10;

      const gap = 4;

      const width =
        (contentWidth -
          gap) /
        2;

      if (
        reportSettings.includeSecurityScore
      ) {
        addStatCard(
          "Security Score",
          `${securityScore}/100`,
          margin,
          width,
        );
      }

      addStatCard(
        "Total Issues",
        totalIssues,
        reportSettings.includeSecurityScore
          ? margin + width + gap
          : margin,
        width,
      );

      y += 27;

      addStatCard(
        "Language",
        analysisResult
          ?.language ||
          "Unknown",
        margin,
        width,
      );

      addStatCard(
        "File",
        analysisResult
          ?.fileName ||
          "Unknown file",
        margin +
          width +
          gap,
        width,
      );

      y += 31;

      addTitle(
        "Severity Summary",
        14,
      );

      const severityItems = [
        [
          "Critical",
          severityCounts.critical,
        ],

        [
          "High",
          severityCounts.high,
        ],

        [
          "Medium",
          severityCounts.medium,
        ],

        [
          "Low",
          severityCounts.low,
        ],
      ];

      const severityGap = 3;

      const severityWidth =
        (contentWidth -
          severityGap * 3) /
        4;

      severityItems.forEach(
        (
          [
            label,
            value,
          ],
          index,
        ) => {
          const x =
            margin +
            index *
              (severityWidth +
                severityGap);

          pdf.setFillColor(
            ...card,
          );

          pdf.setDrawColor(
            ...border,
          );

          pdf.roundedRect(
            x,
            y,
            severityWidth,
            22,
            3,
            3,
            "FD",
          );

          pdf.setFont(
            "helvetica",
            "bold",
          );

          pdf.setFontSize(12);

          pdf.setTextColor(
            ...text,
          );

          pdf.text(
            String(value),
            x +
              severityWidth /
                2,
            y + 9,
            {
              align:
                "center",
            },
          );

          pdf.setFont(
            "helvetica",
            "normal",
          );

          pdf.setFontSize(7);

          pdf.setTextColor(
            ...muted,
          );

          pdf.text(
            label,
            x +
              severityWidth /
                2,
            y + 16,
            {
              align:
                "center",
            },
          );
        },
      );

      y += 30;

      addTitle(
        "Security Analytics",
        14,
      );

      const chartElement =
        document.querySelector(
          ".report-chart-container .recharts-responsive-container",
        );

      if (chartElement) {
        try {
          ensureSpace(96);

          const canvas =
            await html2canvas(
              chartElement,
              {
                scale: 2,

                backgroundColor:
                  chartBackground,

                logging: false,

                useCORS: true,
              },
            );

          const image =
            canvas.toDataURL(
              "image/png",
            );

          const chartWidth =
            116;

          const chartHeight =
            Math.min(
              86,
              (canvas.height *
                chartWidth) /
                canvas.width,
            );

          pdf.addImage(
            image,
            "PNG",
            (pageWidth -
              chartWidth) /
              2,
            y,
            chartWidth,
            chartHeight,
          );

          y +=
            chartHeight + 8;
        } catch (error) {
          console.error(
            "Chart capture failed:",
            error,
          );
        }
      }

      if (
        reportSettings.includeIssueDetails
      ) {
        addTitle(
          "Detected Vulnerabilities",
          14,
        );

        if (
          issues.length === 0
        ) {
          addParagraph(
            "No security vulnerabilities were detected.",
            {
              color: green,
            },
          );
        }

        issues.forEach(
          (issue, index) => {
            const severity =
              normaliseSeverity(
                issue.severity,
              );

            const confidence =
              normaliseConfidence(
                issue.confidence,
              );

            const title =
              issue.title ||
              `Finding ${
                index + 1
              }`;

            const description =
              issue.description ||
              "";

            const recommendation =
              issue.recommendation ||
              "";

            const owasp =
              formatOwasp(
                issue.owasp,
              );

            const cwe =
              issue.cwe ||
              "Not applicable";

            const descriptionLines =
              pdf.splitTextToSize(
                description,
                contentWidth -
                  10,
              );

            const metaLines =
              pdf.splitTextToSize(
                `OWASP: ${owasp} | CWE: ${cwe} | Confidence: ${confidence.toUpperCase()}`,
                contentWidth -
                  10,
              );

            const fixLines =
              pdf.splitTextToSize(
                recommendation,
                contentWidth -
                  10,
              );

            const height =
              Math.max(
                40,
                29 +
                  descriptionLines.length *
                    4 +
                  metaLines.length *
                    4 +
                  fixLines.length *
                    4,
              );

            ensureSpace(
              height + 5,
            );

            const cardY = y;

            pdf.setFillColor(
              ...card,
            );

            pdf.setDrawColor(
              ...border,
            );

            pdf.roundedRect(
              margin,
              cardY,
              contentWidth,
              height,
              3,
              3,
              "FD",
            );

            pdf.setFont(
              "helvetica",
              "bold",
            );

            pdf.setFontSize(10);

            pdf.setTextColor(
              ...text,
            );

            pdf.text(
              pdf.splitTextToSize(
                title,
                contentWidth -
                  40,
              ),
              margin + 5,
              cardY + 7,
            );

            pdf.setFontSize(7);

            pdf.setTextColor(
              ...severityColor(
                severity,
              ),
            );

            pdf.text(
              severity.toUpperCase(),
              pageWidth -
                margin -
                5,
              cardY + 7,
              {
                align: "right",
              },
            );

            let contentY =
              cardY + 14;

            if (issue.line) {
              pdf.setTextColor(
                ...blue,
              );

              pdf.text(
                `Line ${issue.line}`,
                margin + 5,
                contentY,
              );

              contentY += 5;
            }

            pdf.setFont(
              "helvetica",
              "normal",
            );

            pdf.setTextColor(
              ...muted,
            );

            pdf.text(
              descriptionLines,
              margin + 5,
              contentY,
            );

            contentY +=
              descriptionLines.length *
                4 +
              4;

            pdf.setFont(
              "helvetica",
              "bold",
            );

            pdf.setTextColor(
              ...blue,
            );

            pdf.text(
              metaLines,
              margin + 5,
              contentY,
            );

            contentY +=
              metaLines.length *
                4 +
              4;

            if (
              recommendation
            ) {
              pdf.setFont(
                "helvetica",
                "normal",
              );

              pdf.setTextColor(
                ...green,
              );

              pdf.text(
                fixLines,
                margin + 5,
                contentY,
              );
            }

            y += height + 5;
          },
        );

      }

      if (
        reportSettings.includeSuggestions &&
        aiReview?.available
      ) {
        ensureSpace(25);

        addTitle(
          "AI Security Review",
          14,
        );

        addTitle(
          "Executive Summary",
          11,
          6,
        );

        addParagraph(
          aiReview.summary,
        );

        if (
          Array.isArray(
            aiReview
              .priorityActions,
          ) &&
          aiReview
            .priorityActions
            .length
        ) {
          addTitle(
            "Priority Actions",
            11,
            6,
          );

          aiReview.priorityActions.forEach(
            (
              action,
              index,
            ) => {
              addParagraph(
                `${
                  index + 1
                }. ${action}`,
                {
                  bottom: 2,
                },
              );
            },
          );
        }

        if (
          Array.isArray(
            aiReview
              .detailedFindings,
          )
        ) {
          addTitle(
            "Detailed AI Findings",
            11,
            6,
          );

          aiReview.detailedFindings.forEach(
            (
              finding,
              index,
            ) => {
              const title =
                finding.title ||
                `AI Finding ${
                  index + 1
                }`;

              const explanation =
                finding.explanation ||
                "";

              const recommendation =
                finding.recommendation ||
                "";

              const owasp =
                formatOwasp(
                  finding.owasp,
                );

              const cwe =
                finding.cwe ||
                "Not applicable";

              const lines =
                pdf.splitTextToSize(
                  explanation,
                  contentWidth -
                    10,
                );

              const fix =
                pdf.splitTextToSize(
                  recommendation,
                  contentWidth -
                    10,
                );

              const height =
                Math.max(
                  35,
                  24 +
                    lines.length *
                      4 +
                    fix.length *
                      4,
                );

              ensureSpace(
                height + 5,
              );

              const cardY = y;

              pdf.setFillColor(
                ...card,
              );

              pdf.setDrawColor(
                ...border,
              );

              pdf.roundedRect(
                margin,
                cardY,
                contentWidth,
                height,
                3,
                3,
                "FD",
              );

              pdf.setFont(
                "helvetica",
                "bold",
              );

              pdf.setFontSize(9);

              pdf.setTextColor(
                ...text,
              );

              pdf.text(
                title,
                margin + 5,
                cardY + 7,
              );

              pdf.setFont(
                "helvetica",
                "normal",
              );

              pdf.setFontSize(7);

              pdf.setTextColor(
                ...muted,
              );

              pdf.text(
                lines,
                margin + 5,
                cardY + 14,
              );

              let contentY =
                cardY +
                14 +
                lines.length *
                  4 +
                3;

              pdf.setTextColor(
                ...blue,
              );

              pdf.text(
                `OWASP: ${owasp} | CWE: ${cwe}`,
                margin + 5,
                contentY,
              );

              contentY += 5;

              if (
                recommendation
              ) {
                pdf.setTextColor(
                  ...green,
                );

                pdf.text(
                  fix,
                  margin + 5,
                  contentY,
                );
              }

              y +=
                height + 5;
            },
          );
        }

        if (
          Array.isArray(
            aiReview
              .codeQualitySuggestions,
          ) &&
          aiReview
            .codeQualitySuggestions
            .length
        ) {
          addTitle(
            "Code Quality Improvements",
            11,
            6,
          );

          aiReview.codeQualitySuggestions.forEach(
            (
              item,
              index,
            ) => {
              addParagraph(
                `${
                  index + 1
                }. ${item}`,
                {
                  bottom: 2,
                },
              );
            },
          );
        }

        if (
          Array.isArray(
            aiReview
              .finalChecklist,
          ) &&
          aiReview
            .finalChecklist
            .length
        ) {
          addTitle(
            "Security Checklist",
            11,
            6,
          );

          aiReview.finalChecklist.forEach(
            (item) => {
              addParagraph(
                `• ${item}`,
                {
                  color: green,
                  bottom: 2,
                },
              );
            },
          );
        }
      }

      const pages =
        pdf.getNumberOfPages();

      for (
        let page = 1;
        page <= pages;
        page += 1
      ) {
        pdf.setPage(page);

        pdf.setFont(
          "helvetica",
          "normal",
        );

        pdf.setFontSize(7);

        pdf.setTextColor(
          ...muted,
        );

        pdf.text(
          `CodeGuard AI Security Report | Page ${page} of ${pages}`,
          pageWidth / 2,
          pageHeight - 7,
          {
            align: "center",
          },
        );
      }

      const fileName =
        analysisResult?.fileName
          ? analysisResult.fileName.replace(
              /\.[^/.]+$/,
              "",
            )
          : "security-report";

      pdf.save(
        `${fileName}-security-report.pdf`,
      );
    } catch (error) {
      console.error(
        "PDF GENERATION ERROR:",
        error,
      );
    }
  }

  if (!analysisResult) {
    return (
      <div className="reports-page">
        <div className="reports-empty">
          <h2>
            No report available
          </h2>

          <p>
            Complete a security
            scan first, then
            return to Reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <div className="reports-toolbar">
        <button
          type="button"
          className="download-report-btn"
          onClick={
            downloadPDF
          }
        >
          📄 Download PDF Report
        </button>
      </div>

      <div className="report-capture-area">
        <div className="reports-header">
          <div>
            <h1>
              Security Report
            </h1>

            <p>
              Detailed analysis
              of the selected
              source-code scan.
            </p>
          </div>

          <div
            className={`report-risk ${riskLevel}`}
          >
            {String(
              riskLevel,
            ).toUpperCase()}
          </div>
        </div>

        <div className="report-overview-grid">
          {reportSettings.includeSecurityScore && (
            <div className="report-stat-card">
              <span>
                Security Score
              </span>

              <strong>
                {securityScore}
              </strong>
            </div>
          )}

          <div className="report-stat-card">
            <span>
              Total Issues
            </span>

            <strong>
              {totalIssues}
            </strong>
          </div>

          <div className="report-stat-card">
            <span>
              Language
            </span>

            <strong>
              {analysisResult
                ?.language ||
                "Unknown"}
            </strong>
          </div>

          <div className="report-stat-card">
            <span>
              File
            </span>

            <strong>
              {analysisResult
                ?.fileName ||
                "Unknown file"}
            </strong>
          </div>
        </div>

        <div className="report-summary-grid">
          <section className="report-section">
            <h2>
              Severity Summary
            </h2>

            <div className="severity-report-grid">
              <div className="severity-card critical">
                <strong>
                  {
                    severityCounts.critical
                  }
                </strong>

                <span>
                  Critical
                </span>
              </div>

              <div className="severity-card high">
                <strong>
                  {
                    severityCounts.high
                  }
                </strong>

                <span>
                  High
                </span>
              </div>

              <div className="severity-card medium">
                <strong>
                  {
                    severityCounts.medium
                  }
                </strong>

                <span>
                  Medium
                </span>
              </div>

              <div className="severity-card low">
                <strong>
                  {
                    severityCounts.low
                  }
                </strong>

                <span>
                  Low
                </span>
              </div>
            </div>
          </section>

          <section className="report-section">
            <h2>
              Security Analytics
            </h2>

            {chartData.length ===
            0 ? (
              <div className="report-safe-state">
                No vulnerabilities
                detected.
              </div>
            ) : (
              <div
                className="report-chart-container"
                style={{
                  width: "100%",
                  maxWidth: "460px",
                  margin: "0 auto",
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height={340}
                >
                  <PieChart>
                    <Pie
                      data={
                        chartData
                      }
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="44%"
                      innerRadius={
                        78
                      }
                      outerRadius={
                        122
                      }
                      paddingAngle={
                        4
                      }
                      stroke="transparent"
                    >
                      {chartData.map(
                        (
                          entry,
                        ) => (
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

                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{
                        paddingTop: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>

        {reportSettings.includeIssueDetails && (
          <>
                    <section className="report-section report-vulnerabilities-section">
                      <h2>
                        Detected Vulnerabilities
                      </h2>

                      {issues.length ===
                      0 ? (
                        <div className="report-safe-state">
                          No vulnerabilities
                          were detected in this
                          scan.
                        </div>
                      ) : (
                        <div className="report-findings">
                          {issues.map(
                            (
                              issue,
                              index,
                            ) => (
                              <div
                                className="report-finding-card"
                                key={
                                  issue._id ||
                                  `${issue.ruleId}-${issue.line}-${index}`
                                }
                              >
                                <div className="report-finding-header">
                                  <div>
                                    <h3>
                                      {issue.title ||
                                        `Finding ${
                                          index +
                                          1
                                        }`}
                                    </h3>

                                    {issue.line && (
                                      <span>
                                        Line{" "}
                                        {
                                          issue.line
                                        }
                                      </span>
                                    )}
                                  </div>

                                  <span
                                    className={`report-severity ${normaliseSeverity(
                                      issue.severity,
                                    )}`}
                                  >
                                    {normaliseSeverity(
                                      issue.severity,
                                    ).toUpperCase()}
                                  </span>
                                </div>

                                {issue.description && (
                                  <p>
                                    {
                                      issue.description
                                    }
                                  </p>
                                )}

                                <div className="report-reference-row">
                                  <span>
                                    {formatOwasp(
                                      issue.owasp,
                                    )}
                                  </span>

                                  <span>
                                    {issue.cwe ||
                                      "Not applicable"}
                                  </span>

                                  <span>
                                    {normaliseConfidence(
                                      issue.confidence,
                                    ).toUpperCase()}{" "}
                                    CONFIDENCE
                                  </span>
                                </div>

                                {issue.recommendation && (
                                  <div className="report-fix">
                                    <strong>
                                      Recommended Fix
                                    </strong>

                                    <p>
                                      {
                                        issue.recommendation
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </section>

          </>
        )}

        {reportSettings.includeSuggestions &&
          aiReview?.available && (
          <section className="report-section report-ai-section">
            <h2>
              AI Security Review
            </h2>

            <div className="report-ai-summary">
              <h3>
                Executive Summary
              </h3>

              <p>
                {
                  aiReview.summary
                }
              </p>
            </div>

            {Array.isArray(
              aiReview
                .priorityActions,
            ) &&
              aiReview
                .priorityActions
                .length > 0 && (
                <div className="report-ai-block">
                  <h3>
                    Priority Actions
                  </h3>

                  <ol>
                    {aiReview.priorityActions.map(
                      (
                        action,
                        index,
                      ) => (
                        <li
                          key={
                            index
                          }
                        >
                          {action}
                        </li>
                      ),
                    )}
                  </ol>
                </div>
              )}

            {Array.isArray(
              aiReview
                .detailedFindings,
            ) &&
              aiReview
                .detailedFindings
                .length > 0 && (
                <div className="report-ai-block">
                  <h3>
                    Detailed AI Findings
                  </h3>

                  {aiReview.detailedFindings.map(
                    (
                      finding,
                      index,
                    ) => (
                      <div
                        className="report-ai-finding"
                        key={
                          index
                        }
                      >
                        <div className="report-ai-finding-top">
                          <strong>
                            {finding.title ||
                              `Finding ${
                                index +
                                1
                              }`}
                          </strong>

                          <span
                            className={`report-severity ${normaliseSeverity(
                              finding.severity,
                            )}`}
                          >
                            {normaliseSeverity(
                              finding.severity,
                            ).toUpperCase()}
                          </span>
                        </div>

                        {finding.line && (
                          <p className="report-ai-line">
                            Line{" "}
                            {
                              finding.line
                            }
                          </p>
                        )}

                        {finding.explanation && (
                          <p>
                            {
                              finding.explanation
                            }
                          </p>
                        )}

                        <div className="report-reference-row">
                          <span>
                            {formatOwasp(
                              finding.owasp,
                            )}
                          </span>

                          <span>
                            {finding.cwe ||
                              "Not applicable"}
                          </span>
                        </div>

                        {finding.recommendation && (
                          <p className="report-ai-fix">
                            <strong>
                              Fix:
                            </strong>{" "}
                            {
                              finding.recommendation
                            }
                          </p>
                        )}

                        {finding.secureExample && (
                          <div className="report-secure-example">
                            <strong>
                              Secure Example
                            </strong>

                            <pre>
                              <code>
                                {
                                  finding.secureExample
                                }
                              </code>
                            </pre>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}

            {Array.isArray(
              aiReview
                .codeQualitySuggestions,
            ) &&
              aiReview
                .codeQualitySuggestions
                .length > 0 && (
                <div className="report-ai-block">
                  <h3>
                    Code Quality Improvements
                  </h3>

                  <ul>
                    {aiReview.codeQualitySuggestions.map(
                      (
                        item,
                        index,
                      ) => (
                        <li
                          key={
                            index
                          }
                        >
                          {item}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}

            {Array.isArray(
              aiReview
                .finalChecklist,
            ) &&
              aiReview
                .finalChecklist
                .length > 0 && (
                <div className="report-ai-block">
                  <h3>
                    Security Checklist
                  </h3>

                  <div className="report-checklist">
                    {aiReview.finalChecklist.map(
                      (
                        item,
                        index,
                      ) => (
                        <div
                          key={
                            index
                          }
                          className="report-checklist-item"
                        >
                          <span>
                            ✓
                          </span>

                          <p>
                            {item}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
          </section>
        )}
      </div>
    </div>
  );
}