import {
  useMemo,
  useState,
} from "react";

import {
  FaCheckCircle,
  FaFilter,
  FaSearch,
  FaShieldAlt,
} from "react-icons/fa";

import "../styles/SecurityRules.css";

const RULES = [
  {
    id: "hardcoded-password",
    title: "Hardcoded Password",
    description:
      "Detects passwords embedded directly inside source code.",
    severity: "high",
    confidence: "high",
    owasp: "A07:2025",
    category:
      "Authentication Failures",
    cwe: "CWE-798",
    languages: [
      "Python",
      "JavaScript",
      "TypeScript",
      "Java",
    ],
  },

  {
    id: "hardcoded-api-key",
    title: "Hardcoded API Key",
    description:
      "Detects API keys, access tokens, client secrets and related credentials stored directly in source code.",
    severity: "high",
    confidence: "high",
    owasp: "A02:2025",
    category:
      "Security Misconfiguration",
    cwe: "CWE-798",
    languages: [
      "Python",
      "JavaScript",
      "TypeScript",
    ],
  },

  {
    id: "private-key",
    title: "Embedded Private Key",
    description:
      "Detects private cryptographic keys committed directly into source code.",
    severity: "critical",
    confidence: "high",
    owasp: "A02:2025",
    category:
      "Security Misconfiguration",
    cwe: "CWE-321",
    languages: ["All"],
  },

  {
    id: "eval-usage",
    title: "Unsafe eval() Usage",
    description:
      "Detects use of eval(), which may execute untrusted input as code.",
    severity: "critical",
    confidence: "high",
    owasp: "A05:2025",
    category: "Injection",
    cwe: "CWE-95",
    languages: [
      "Python",
      "JavaScript",
    ],
  },

  {
    id: "exec-usage",
    title: "Unsafe exec() Usage",
    description:
      "Detects dynamic code execution using exec().",
    severity: "critical",
    confidence: "high",
    owasp: "A05:2025",
    category: "Injection",
    cwe: "CWE-94",
    languages: ["Python"],
  },

  {
    id: "shell-command",
    title: "Unsafe Shell Execution",
    description:
      "Detects potentially unsafe OS or shell command execution.",
    severity: "critical",
    confidence: "high",
    owasp: "A05:2025",
    category: "Injection",
    cwe: "CWE-78",
    languages: [
      "Python",
      "JavaScript",
    ],
  },

  {
    id: "sql-injection",
    title: "Possible SQL Injection",
    description:
      "Detects SQL query construction using unsafe string concatenation or interpolation.",
    severity: "critical",
    confidence: "high",
    owasp: "A05:2025",
    category: "Injection",
    cwe: "CWE-89",
    languages: [
      "Python",
      "JavaScript",
      "Java",
    ],
  },

  {
    id: "xss-innerhtml",
    title: "Potential Cross-Site Scripting",
    description:
      "Detects direct HTML injection methods such as innerHTML or dangerouslySetInnerHTML.",
    severity: "high",
    confidence: "medium",
    owasp: "A05:2025",
    category: "Injection",
    cwe: "CWE-79",
    languages: [
      "JavaScript",
      "TypeScript",
    ],
  },

  {
    id: "path-traversal",
    title: "Potential Path Traversal",
    description:
      "Detects file path construction using untrusted or request-controlled input.",
    severity: "high",
    confidence: "medium",
    owasp: "A01:2025",
    category:
      "Broken Access Control",
    cwe: "CWE-22",
    languages: [
      "Python",
      "JavaScript",
    ],
  },

  {
    id: "unsafe-pickle",
    title: "Unsafe Pickle Deserialization",
    description:
      "Detects deserialization of potentially untrusted pickle data.",
    severity: "high",
    confidence: "high",
    owasp: "A08:2025",
    category:
      "Software or Data Integrity Failures",
    cwe: "CWE-502",
    languages: ["Python"],
  },

  {
    id: "unsafe-yaml",
    title: "Unsafe YAML Deserialization",
    description:
      "Detects potentially unsafe YAML loading without a safe loader.",
    severity: "high",
    confidence: "medium",
    owasp: "A08:2025",
    category:
      "Software or Data Integrity Failures",
    cwe: "CWE-502",
    languages: ["Python"],
  },

  {
    id: "weak-hash",
    title: "Weak Hashing Algorithm",
    description:
      "Detects insecure or deprecated hashing algorithms such as MD5 and SHA-1.",
    severity: "medium",
    confidence: "high",
    owasp: "A04:2025",
    category:
      "Cryptographic Failures",
    cwe: "CWE-328",
    languages: [
      "Python",
      "JavaScript",
    ],
  },

  {
    id: "insecure-random",
    title: "Insecure Random Generation",
    description:
      "Detects non-cryptographic random number generators used in potentially security-sensitive code.",
    severity: "medium",
    confidence: "medium",
    owasp: "A04:2025",
    category:
      "Cryptographic Failures",
    cwe: "CWE-330",
    languages: [
      "Python",
      "JavaScript",
    ],
  },

  {
    id: "insecure-http",
    title: "Insecure HTTP Connection",
    description:
      "Detects external HTTP URLs where encrypted HTTPS communication should be preferred.",
    severity: "medium",
    confidence: "medium",
    owasp: "A04:2025",
    category:
      "Cryptographic Failures",
    cwe: "CWE-319",
    languages: ["All"],
  },

  {
    id: "tls-verification-disabled",
    title: "TLS Verification Disabled",
    description:
      "Detects disabled TLS certificate validation.",
    severity: "high",
    confidence: "high",
    owasp: "A04:2025",
    category:
      "Cryptographic Failures",
    cwe: "CWE-295",
    languages: [
      "Python",
      "JavaScript",
    ],
  },

  {
    id: "cors-wildcard",
    title: "Overly Permissive CORS",
    description:
      "Detects wildcard cross-origin configuration that may expose APIs to untrusted origins.",
    severity: "medium",
    confidence: "medium",
    owasp: "A02:2025",
    category:
      "Security Misconfiguration",
    cwe: "CWE-942",
    languages: ["JavaScript"],
  },

  {
    id: "jwt-none",
    title: "Insecure JWT Configuration",
    description:
      "Detects insecure JWT algorithms or disabled signature verification.",
    severity: "critical",
    confidence: "high",
    owasp: "A07:2025",
    category:
      "Authentication Failures",
    cwe: "CWE-347",
    languages: [
      "Python",
      "JavaScript",
    ],
  },

  {
    id: "weak-jwt-secret",
    title: "Hardcoded JWT Secret",
    description:
      "Detects JWT signing secrets embedded directly inside source code.",
    severity: "high",
    confidence: "high",
    owasp: "A07:2025",
    category:
      "Authentication Failures",
    cwe: "CWE-798",
    languages: [
      "Python",
      "JavaScript",
    ],
  },

  {
    id: "prototype-pollution",
    title: "Prototype Pollution",
    description:
      "Detects potentially dangerous modification of JavaScript object prototypes.",
    severity: "high",
    confidence: "medium",
    owasp: "A08:2025",
    category:
      "Software or Data Integrity Failures",
    cwe: "CWE-1321",
    languages: [
      "JavaScript",
      "TypeScript",
    ],
  },

  {
    id: "open-redirect",
    title: "Unvalidated Redirect",
    description:
      "Detects redirects controlled directly by request or user input.",
    severity: "medium",
    confidence: "medium",
    owasp: "A01:2025",
    category:
      "Broken Access Control",
    cwe: "CWE-601",
    languages: [
      "JavaScript",
      "Python",
    ],
  },

  {
    id: "debug-mode",
    title: "Debug Mode Enabled",
    description:
      "Detects debug configuration that should not be enabled in production.",
    severity: "medium",
    confidence: "high",
    owasp: "A02:2025",
    category:
      "Security Misconfiguration",
    cwe: "CWE-489",
    languages: [
      "Python",
      "JavaScript",
    ],
  },

  {
    id: "debug-output",
    title: "Debug Output",
    description:
      "Detects temporary console or print output that may disclose sensitive information.",
    severity: "info",
    confidence: "medium",
    owasp: "A09:2025",
    category:
      "Security Logging and Alerting Failures",
    cwe: "CWE-532",
    languages: [
      "Python",
      "JavaScript",
    ],
  },
];

const SEVERITIES = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export default function SecurityRules() {
  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    severityFilter,
    setSeverityFilter,
  ] = useState("all");

  const filteredRules =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      return RULES.filter((rule) => {
        const matchesSeverity =
          severityFilter === "all" ||
          rule.severity ===
            severityFilter;

        const matchesSearch =
          !query ||
          [
            rule.title,
            rule.description,
            rule.id,
            rule.owasp,
            rule.category,
            rule.cwe,
            ...rule.languages,
          ].some((value) =>
            String(value)
              .toLowerCase()
              .includes(query),
          );

        return (
          matchesSeverity &&
          matchesSearch
        );
      });
    }, [
      searchTerm,
      severityFilter,
    ]);

  const counts =
    useMemo(() => {
      return RULES.reduce(
        (result, rule) => {
          result.total += 1;

          if (
            result[
              rule.severity
            ] !== undefined
          ) {
            result[
              rule.severity
            ] += 1;
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
    }, []);

  return (
    <div className="rules-page">
      <div className="rules-page-header">
        <div>
          <span className="rules-eyebrow">
            CODEGUARD DETECTION ENGINE
          </span>

          <h1>
            Security Rules
          </h1>

          <p>
            Explore the security checks
            currently available in the
            CodeGuard static-analysis
            engine.
          </p>
        </div>

        <div className="rules-status">
          <FaCheckCircle />

          <div>
            <strong>
              {counts.total}
            </strong>

            <span>
              Rules Active
            </span>
          </div>
        </div>
      </div>

      <div className="rules-summary-grid">
        <div className="rules-summary-card critical">
          <span>
            Critical
          </span>

          <strong>
            {counts.critical}
          </strong>
        </div>

        <div className="rules-summary-card high">
          <span>
            High
          </span>

          <strong>
            {counts.high}
          </strong>
        </div>

        <div className="rules-summary-card medium">
          <span>
            Medium
          </span>

          <strong>
            {counts.medium}
          </strong>
        </div>

        <div className="rules-summary-card info">
          <span>
            Informational
          </span>

          <strong>
            {counts.info}
          </strong>
        </div>
      </div>

      <div className="rules-toolbar">
        <div className="rules-search">
          <FaSearch />

          <input
            type="text"
            placeholder="Search rule, CWE, OWASP or language..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
          />
        </div>

        <div className="rules-filter">
          <FaFilter />

          <select
            value={
              severityFilter
            }
            onChange={(event) =>
              setSeverityFilter(
                event.target.value,
              )
            }
          >
            {SEVERITIES.map(
              (severity) => (
                <option
                  value={
                    severity
                  }
                  key={
                    severity
                  }
                >
                  {severity ===
                  "all"
                    ? "All severities"
                    : severity
                        .charAt(0)
                        .toUpperCase() +
                      severity.slice(
                        1,
                      )}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div className="rules-results-header">
        <span>
          {filteredRules.length}{" "}
          {filteredRules.length === 1
            ? "rule"
            : "rules"}{" "}
          shown
        </span>
      </div>

      {filteredRules.length ===
      0 ? (
        <div className="rules-empty">
          <FaShieldAlt />

          <h2>
            No matching rules
          </h2>

          <p>
            Try another search term or
            severity filter.
          </p>
        </div>
      ) : (
        <div className="rules-list">
          {filteredRules.map(
            (rule) => (
              <article
                className="security-rule-card"
                key={rule.id}
              >
                <div
                  className={`rule-severity-bar ${rule.severity}`}
                />

                <div className="rule-card-main">
                  <div className="rule-card-header">
                    <div>
                      <span className="rule-id">
                        {rule.id}
                      </span>

                      <h2>
                        {rule.title}
                      </h2>
                    </div>

                    <div className="rule-card-badges">
                      <span
                        className={`rule-severity ${rule.severity}`}
                      >
                        {rule.severity.toUpperCase()}
                      </span>

                      <span className="rule-active-badge">
                        <FaCheckCircle />
                        Active
                      </span>
                    </div>
                  </div>

                  <p className="rule-description">
                    {rule.description}
                  </p>

                  <div className="rule-metadata-grid">
                    <div>
                      <span>
                        OWASP
                      </span>

                      <strong>
                        {rule.owasp}
                      </strong>

                      <small>
                        {
                          rule.category
                        }
                      </small>
                    </div>

                    <div>
                      <span>
                        CWE
                      </span>

                      <strong>
                        {rule.cwe}
                      </strong>

                      <small>
                        Weakness
                        classification
                      </small>
                    </div>

                    <div>
                      <span>
                        Confidence
                      </span>

                      <strong>
                        {rule.confidence.toUpperCase()}
                      </strong>

                      <small>
                        Detection
                        confidence
                      </small>
                    </div>
                  </div>

                  <div className="rule-language-row">
                    <span>
                      Languages
                    </span>

                    <div>
                      {rule.languages.map(
                        (language) => (
                          <span
                            className="rule-language-tag"
                            key={
                              language
                            }
                          >
                            {language}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </div>
  );
}