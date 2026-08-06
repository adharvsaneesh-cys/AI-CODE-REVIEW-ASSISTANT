const securityRules = [
  {
    ruleId: "hardcoded-password",
    title: "Possible hardcoded password",
    severity: "high",
    patterns: [
      /password\s*=\s*["'][^"']+["']/i,
      /passwd\s*=\s*["'][^"']+["']/i,
    ],
    recommendation:
      "Store passwords in environment variables or a secrets manager.",
  },

  {
    ruleId: "hardcoded-api-key",
    title: "Possible hardcoded API key",
    severity: "high",
    patterns: [
      /api[_-]?key\s*=\s*["'][^"']+["']/i,
      /secret[_-]?key\s*=\s*["'][^"']+["']/i,
    ],
    recommendation:
      "Remove secrets from source code and rotate the exposed credential.",
  },

  {
    ruleId: "eval-usage",
    title: "Unsafe eval usage",
    severity: "critical",
    patterns: [/\beval\s*\(/i],
    recommendation:
      "Avoid eval. Use explicit parsing or safe alternatives.",
  },

  {
    ruleId: "sql-concatenation",
    title: "Possible SQL injection",
    severity: "critical",
    patterns: [
      /SELECT.+\+/i,
      /INSERT.+\+/i,
      /UPDATE.+\+/i,
      /DELETE.+\+/i,
    ],
    recommendation:
      "Use parameterized queries or prepared statements.",
  },

  {
    ruleId: "debug-output",
    title: "Debug output detected",
    severity: "info",
    patterns: [
      /console\.log\s*\(/i,
      /\bprint\s*\(/i,
    ],
    recommendation:
      "Remove unnecessary debug output before production.",
  },
];

const analyzeCodeLocally = (code) => {
  const lines = code.split(/\r?\n/);
  const issues = [];

  lines.forEach((lineText, index) => {
    securityRules.forEach((rule) => {
      const matched = rule.patterns.some((pattern) =>
        pattern.test(lineText),
      );

      if (matched) {
        issues.push({
          ruleId: rule.ruleId,
          title: rule.title,
          description: `Potential issue detected: ${lineText.trim()}`,
          severity: rule.severity,
          line: index + 1,
          recommendation: rule.recommendation,
        });
      }
    });
  });

  const issueCount = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  issues.forEach((issue) => {
    issueCount[issue.severity] += 1;
  });

  const penalty =
    issueCount.critical * 25 +
    issueCount.high * 15 +
    issueCount.medium * 8 +
    issueCount.low * 3;

  const securityScore = Math.max(0, 100 - penalty);

  return {
    issues,
    issueCount,
    securityScore,
  };
};

module.exports = {
  analyzeCodeLocally,
};