import "./IssueSummary.css";

export default function IssueSummary({
  critical = 0,
  high = 0,
  medium = 0,
  low = 0,
  selectedSeverity,
  onSeveritySelect,
}) {
  const handleClick = (severity) => {
    const nextSeverity =
      selectedSeverity === severity
        ? null
        : severity;

    onSeveritySelect(nextSeverity);

    setTimeout(() => {
      const analyticsSection =
        document.getElementById(
          "security-analytics-section",
        );

      if (analyticsSection) {
        analyticsSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  return (
    <div className="issue-summary-card">
      <h2>🛡 Issue Summary</h2>

      <div className="issue-summary-grid">
        <button
          type="button"
          className={`issue-box critical ${
            selectedSeverity === "critical"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            handleClick("critical")
          }
        >
          <strong>{critical}</strong>
          <span>Critical</span>
        </button>

        <button
          type="button"
          className={`issue-box high ${
            selectedSeverity === "high"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            handleClick("high")
          }
        >
          <strong>{high}</strong>
          <span>High</span>
        </button>

        <button
          type="button"
          className={`issue-box medium ${
            selectedSeverity === "medium"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            handleClick("medium")
          }
        >
          <strong>{medium}</strong>
          <span>Medium</span>
        </button>

        <button
          type="button"
          className={`issue-box low ${
            selectedSeverity === "low"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            handleClick("low")
          }
        >
          <strong>{low}</strong>
          <span>Low</span>
        </button>
      </div>
    </div>
  );
}