import { useContext } from "react";
import { AnalysisContext } from "../../context/analysis-context";
import "./AISuggestions.css";

function formatOwasp(owasp) {
  if (!owasp) {
    return "Not applicable";
  }

  if (typeof owasp === "string") {
    return owasp;
  }

  const id =
    owasp.id || "Not applicable";

  const category =
    owasp.category || "Not applicable";

  if (
    id === "Not applicable" &&
    category === "Not applicable"
  ) {
    return "Not applicable";
  }

  return `${id} - ${category}`;
}
export default function AISuggestions() {
  const { analysisResult } =
    useContext(AnalysisContext);

  const aiReview =
    analysisResult?.aiReview;

  if (!analysisResult) {
    return (
      <div className="ai-review-card">
        <div className="ai-review-title">
          🤖 Personalised AI Review
        </div>

        <div className="ai-empty-state">
          Analyse source code to receive personalised
          security recommendations.
        </div>
      </div>
    );
  }

  if (!aiReview?.available) {
    return (
      <div className="ai-review-card">
        <div className="ai-review-title">
          🤖 AI Suggestions
        </div>

        <div className="ai-unavailable">
          <strong>
            AI review temporarily unavailable
          </strong>

          <p>
            Static analysis completed successfully.
            You can try the AI review again shortly.
          </p>
        </div>
      </div>
    );
  }

  const priorityActions =
    Array.isArray(aiReview.priorityActions)
      ? aiReview.priorityActions
      : [];

  const detailedFindings =
    Array.isArray(aiReview.detailedFindings)
      ? aiReview.detailedFindings
      : [];

  const qualitySuggestions =
    Array.isArray(aiReview.codeQualitySuggestions)
      ? aiReview.codeQualitySuggestions
      : [];

  const checklist =
    Array.isArray(aiReview.finalChecklist)
      ? aiReview.finalChecklist
      : [];

  return (
    <div className="ai-review-card">

      <div className="ai-review-header">
        <div>
          <h2>
  🤖 Personalised AI Review

          </h2>

          <p>
            AI-assisted analysis of the latest scan
          </p>
        </div>

        <span
          className={`ai-risk-badge ${
            aiReview.riskLevel || "unknown"
          }`}
        >
          {String(
            aiReview.riskLevel || "unknown",
          ).toUpperCase()}
        </span>
      </div>

      <section className="ai-section ai-summary">
        <h3>Executive Summary</h3>

        <p>
          {aiReview.summary}
        </p>
      </section>

      {priorityActions.length > 0 && (
        <section className="ai-section">
          <h3>Priority Actions</h3>

          <div className="priority-list">
            {priorityActions.map(
              (action, index) => (
                <div
                  key={index}
                  className="priority-item"
                >
                  <span>
                    {index + 1}
                  </span>

                  <p>
                    {action}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {detailedFindings.length > 0 && (
        <section className="ai-section">
          <h3>Detailed Findings</h3>

          <div className="ai-findings">
            {detailedFindings.map(
              (finding, index) => (
                <div
                  className="ai-finding-card"
                  key={index}
                >
                  <div className="ai-finding-header">

                    <div>
                      <h4>
                        {finding.title ||
                          `Finding ${index + 1}`}
                      </h4>

                      {finding.line && (
                        <span className="ai-line">
                          Line {finding.line}
                        </span>
                      )}
                    </div>

                    <span
                      className={`ai-severity ${
                        finding.severity ||
                        "info"
                      }`}
                    >
                      {String(
                        finding.severity ||
                          "info",
                      ).toUpperCase()}
                    </span>
                  </div>

                  {finding.explanation && (
                    <div className="ai-finding-block">
                      <strong>
                        Why this matters
                      </strong>

                      <p>
                        {
                          finding.explanation
                        }
                      </p>
                    </div>
                  )}

                  {finding.recommendation && (
                    <div className="ai-finding-block fix-block">
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

                  {finding.secureExample && (
                    <div className="ai-code-block">
                      <div>
                        Secure Example
                      </div>

                      <pre>
                        <code>
                          {
                            finding.secureExample
                          }
                        </code>
                      </pre>
                    </div>
                  )}

                  <div className="ai-reference-row">
{typeof finding.owasp === "object"
  ? `${finding.owasp?.id || "Not applicable"} - ${
      finding.owasp?.category || "Not applicable"
    }`
  : finding.owasp || "Not applicable"}

                    {finding.cwe &&
                      finding.cwe !==
                        "Not applicable" && (
                        <span>
                          {
                            finding.cwe
                          }
                        </span>
                      )}

                  </div>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {qualitySuggestions.length > 0 && (
        <section className="ai-section">
          <h3>
            Code Quality Improvements
          </h3>

          <ul className="ai-quality-list">
            {qualitySuggestions.map(
              (suggestion, index) => (
                <li key={index}>
                  {suggestion}
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      {checklist.length > 0 && (
        <section className="ai-section">
          <h3>
            Security Checklist
          </h3>

          <div className="ai-checklist">
            {checklist.map(
              (item, index) => (
                <div key={index}>
                  <span>✓</span>
                  {item}
                </div>
              ),
            )}
          </div>
        </section>
      )}

    </div>
  );
}