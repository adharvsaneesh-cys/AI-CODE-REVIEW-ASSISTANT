const SEVERITY_WEIGHTS = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 1,
};

const SEVERITY_ORDER = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

const LANGUAGE_ALIASES = {
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  javascript: "javascript",
  ts: "typescript",
  tsx: "typescript",
  typescript: "typescript",
  py: "python",
  python: "python",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  hxx: "cpp",
};

function normalizeLanguage(language) {
  const value = String(language || "")
    .trim()
    .toLowerCase()
    .replace(/^\./, "");

  return LANGUAGE_ALIASES[value] || value || "unknown";
}

function maskNonCode(source) {
  let text = String(source || "");

  text = text.replace(
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/gs,
    (match) => " ".repeat(match.length),
  );

  text = text.replace(
    /\/\*[\s\S]*?\*\//g,
    (match) => " ".repeat(match.length),
  );

  text = text.replace(
    /(^|[^:])\/\/.*$/gm,
    (match, prefix) =>
      prefix + " ".repeat(match.length - prefix.length),
  );

  text = text.replace(
    /(^|\s)#(?!include\b).*$/gm,
    (match, prefix) =>
      prefix + " ".repeat(match.length - prefix.length),
  );

  return text;
}

function maskJavaScriptRegexLiterals(source) {
  let text = String(source || "");

  text = text.replace(
    /\/(?![/*])(?:\\.|[^/\\\r\n])+\/[dgimsuvy]*/g,
    (match) => " ".repeat(match.length),
  );

  return text;
}

function getLineNumber(source, index) {
  return String(source || "")
    .slice(0, index)
    .split("\n").length;
}

function getColumnNumber(source, index) {
  const lastNewLine = String(source || "").lastIndexOf(
    "\n",
    index - 1,
  );

  return index - lastNewLine;
}

function severityAllowed(severity, minimumSeverity) {
  return (
    SEVERITY_ORDER[severity] >=
    SEVERITY_ORDER[minimumSeverity || "info"]
  );
}

function addMatches(
  regex,
  source,
  rule,
  issues,
  originalSource = source,
) {
  regex.lastIndex = 0;

  let match;

  while ((match = regex.exec(source)) !== null) {
    const index = match.index;

    issues.push({
      ruleId: rule.ruleId || rule.title,
      title: rule.title,
      description: rule.description,
      severity: rule.severity,
      recommendation: rule.recommendation,
      cwe: rule.cwe || null,
      owasp: rule.owasp || null,
      category: rule.category || "Security",
      line: getLineNumber(originalSource, index),
      column: getColumnNumber(originalSource, index),
    });

    if (match[0] === "") {
      regex.lastIndex += 1;
    }
  }
}

function createRule(rule) {
  return rule;
}

function scanHardcodedSecrets(source, issues) {
  const passwordRegex =
    /\b(?:password|passwd|pwd)\s*[:=]\s*["'`]([^"'`]{3,})["'`]/gi;

  addMatches(
    passwordRegex,
    source,
    createRule({
      ruleId: "hardcoded-password",
      title: "Hardcoded password",
      description:
        "A hardcoded password was detected in source code.",
      severity: "high",
      recommendation:
        "Remove hardcoded passwords and store secrets in a secure secret manager or environment variable.",
      cwe: "CWE-798",
      owasp:
        "A07:2021-Identification-and-Authentication-Failures",
      category: "Secrets",
    }),
    issues,
    source,
  );

  const apiKeyRegex =
    /\b(?:api[-_]?key|apikey|access[-_]?key)\s*[:=]\s*["'`](?!process\.env|os\.environ)[^"'`]{8,}["'`]/gi;

  addMatches(
    apiKeyRegex,
    source,
    createRule({
      ruleId: "hardcoded-api-key",
      title: "Hardcoded API key",
      description:
        "A possible hardcoded API key was detected.",
      severity: "high",
      recommendation:
        "Store API keys outside source code using environment variables or a secret manager.",
      cwe: "CWE-798",
      owasp:
        "A07:2021-Identification-and-Authentication-Failures",
      category: "Secrets",
    }),
    issues,
    source,
  );

  const privateKeyRegex =
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/gi;

  addMatches(
    privateKeyRegex,
    source,
    createRule({
      ruleId: "private-key",
      title: "Private key exposed",
      description:
        "A private cryptographic key appears to be embedded in the source.",
      severity: "critical",
      recommendation:
        "Remove the private key immediately and rotate it.",
      cwe: "CWE-321",
      owasp: "A02:2021-Cryptographic-Failures",
      category: "Secrets",
    }),
    issues,
    source,
  );

  const weakJwtRegex =
    /\b(?:jwt[-_]?secret|jwtSecret|token[-_]?secret)\s*[:=]\s*["'`](?:secret|password|123456|jwtsecret|changeme|test)["'`]/gi;

  addMatches(
    weakJwtRegex,
    source,
    createRule({
      ruleId: "weak-jwt-secret",
      title: "Weak JWT secret",
      description:
        "A weak or predictable JWT signing secret was detected.",
      severity: "high",
      recommendation:
        "Use a long, random secret stored outside the source code.",
      cwe: "CWE-326",
      owasp: "A02:2021-Cryptographic-Failures",
      category: "Cryptography",
    }),
    issues,
    source,
  );
}

function scanEnvironmentExposure(
  source,
  maskedSource,
  issues,
) {
  const jsExposure =
    /\b(?:return|res\.(?:json|send)|response\.(?:json|send))\s*\(?\s*(?:\{\s*\.\.\.\s*)?process\.env\b/gi;

  addMatches(
    jsExposure,
    maskedSource,
    createRule({
      ruleId: "environment-exposure",
      title: "Potential exposure of environment variables",
      description:
        "The application appears to expose the complete process environment.",
      severity: "high",
      recommendation:
        "Never return the complete process.env object to clients. Expose only specific non-sensitive configuration values.",
      cwe: "CWE-200",
      owasp: "A01:2021-Broken-Access-Control",
      category: "Information Disclosure",
    }),
    issues,
    source,
  );

  const pythonExposure =
    /\b(?:return|jsonify|json\.dumps)\s*\(?\s*(?:os\.environ|dict\s*\(\s*os\.environ\s*\))/gi;

  addMatches(
    pythonExposure,
    maskedSource,
    createRule({
      ruleId: "environment-exposure",
      title: "Potential exposure of environment variables",
      description:
        "The application appears to expose the complete environment.",
      severity: "high",
      recommendation:
        "Never expose the complete environment to users. Return only explicitly required configuration.",
      cwe: "CWE-200",
      owasp: "A01:2021-Broken-Access-Control",
      category: "Information Disclosure",
    }),
    issues,
    source,
  );
}

function scanEval(source, maskedSource, issues) {
  const safeMaskedSource =
    maskJavaScriptRegexLiterals(maskedSource);

  const evalPatterns = [
    {
      regex: /\beval\s*\(/gi,
      title: "Dangerous eval usage",
      description:
        "Dynamic eval execution can execute attacker-controlled code and lead to arbitrary code execution.",
      severity: "critical",
      recommendation:
        "Avoid eval(). Use explicit parsing, validation, or safer programmatic alternatives.",
      cwe: "CWE-95",
      owasp: "A03:2021-Injection",
      ruleId: "dangerous-eval",
      category: "Code Execution",
    },
    {
      regex: /\bnew\s+Function\s*\(/gi,
      title: "Dangerous dynamic function creation",
      description:
        "Dynamic function creation can execute attacker-controlled code.",
      severity: "critical",
      recommendation:
        "Avoid dynamic Function construction and use explicit functions instead.",
      cwe: "CWE-95",
      owasp: "A03:2021-Injection",
      ruleId: "dynamic-function",
      category: "Code Execution",
    },
    {
      regex: /(?<!new\s)\bFunction\s*\(/gi,
      title: "Dangerous dynamic function creation",
      description:
        "Dynamic Function construction can execute attacker-controlled code.",
      severity: "critical",
      recommendation:
        "Avoid Function() and use explicit functions instead.",
      cwe: "CWE-95",
      owasp: "A03:2021-Injection",
      ruleId: "dynamic-function",
      category: "Code Execution",
    },
  ];

  for (const rule of evalPatterns) {
    addMatches(
      rule.regex,
      safeMaskedSource,
      rule,
      issues,
      source,
    );
  }
}

function scanCommandExecution(
  source,
  maskedSource,
  language,
  issues,
) {
  if (language === "python") {
    addMatches(
      /\bos\.system\s*\(/gi,
      maskedSource,
      createRule({
        ruleId: "python-os-system",
        title: "Unsafe shell command execution",
        description:
          "os.system() executes commands through the system shell.",
        severity: "high",
        recommendation:
          "Use subprocess with a fixed argument list and avoid shell=True.",
        cwe: "CWE-78",
        owasp: "A03:2021-Injection",
        category: "Command Injection",
      }),
      issues,
      source,
    );

    addMatches(
      /\bos\.popen\s*\(/gi,
      maskedSource,
      createRule({
        ruleId: "python-os-popen",
        title: "Unsafe shell command execution",
        description:
          "os.popen() executes commands through a shell.",
        severity: "high",
        recommendation:
          "Use subprocess with a fixed argument list and avoid shell execution.",
        cwe: "CWE-78",
        owasp: "A03:2021-Injection",
        category: "Command Injection",
      }),
      issues,
      source,
    );

    addMatches(
      /\bsubprocess\.(?:run|Popen|call|check_call|check_output)\s*\([\s\S]{0,500}?\bshell\s*=\s*True\b/gi,
      maskedSource,
      createRule({
        ruleId: "python-shell-true",
        title: "Unsafe subprocess shell execution",
        description:
          "subprocess is configured to execute commands through the shell.",
        severity: "high",
        recommendation:
          "Avoid shell=True and pass commands as a fixed argument list.",
        cwe: "CWE-78",
        owasp: "A03:2021-Injection",
        category: "Command Injection",
      }),
      issues,
      source,
    );
  }

  if (
    language === "javascript" ||
    language === "typescript"
  ) {
    addMatches(
      /\b(?:child_process\.)?(?:exec|execSync)\s*\(/gi,
      maskedSource,
      createRule({
        ruleId: "node-command-execution",
        title: "Potential unsafe command execution",
        description:
          "A Node.js command execution API was detected.",
        severity: "high",
        recommendation:
          "Avoid passing untrusted user input to shell commands. Prefer fixed argument lists and strict input validation.",
        cwe: "CWE-78",
        owasp: "A03:2021-Injection",
        category: "Command Injection",
      }),
      issues,
      source,
    );
  }
}

function scanCAndCpp(
  source,
  maskedSource,
  language,
  issues,
) {
  if (language !== "c" && language !== "cpp") {
    return;
  }

  addMatches(
    /\bgets\s*\(/gi,
    maskedSource,
    createRule({
      ruleId: "c-unsafe-gets",
      title: "Unsafe gets() usage",
      description:
        "gets() reads input without checking the destination buffer size and can cause a stack-based buffer overflow.",
      severity: "critical",
      recommendation:
        "Never use gets(). Replace it with fgets() and enforce an explicit maximum input length.",
      cwe: "CWE-242",
      owasp: "A03:2021-Injection",
      category: "Buffer Overflow",
    }),
    issues,
    source,
  );

  addMatches(
    /\bstrcpy\s*\(/gi,
    maskedSource,
    createRule({
      ruleId: "c-unsafe-strcpy",
      title: "Unsafe strcpy() usage",
      description:
        "strcpy() performs no destination-size validation and can overflow a fixed-size character buffer.",
      severity: "high",
      recommendation:
        "Use a size-aware alternative such as snprintf() or carefully bounded copying with explicit length validation.",
      cwe: "CWE-120",
      owasp: "A03:2021-Injection",
      category: "Buffer Overflow",
    }),
    issues,
    source,
  );

  addMatches(
    /\bstrcat\s*\(/gi,
    maskedSource,
    createRule({
      ruleId: "c-unsafe-strcat",
      title: "Unsafe strcat() usage",
      description:
        "strcat() does not verify that the destination buffer has enough remaining capacity.",
      severity: "high",
      recommendation:
        "Use bounded concatenation or std::string with explicit size validation.",
      cwe: "CWE-120",
      owasp: "A03:2021-Injection",
      category: "Buffer Overflow",
    }),
    issues,
    source,
  );

  addMatches(
    /\b(?:sprintf|vsprintf)\s*\(/gi,
    maskedSource,
    createRule({
      ruleId: "c-unsafe-sprintf",
      title: "Unsafe sprintf() usage",
      description:
        "sprintf() and vsprintf() do not enforce destination buffer limits and can cause buffer overflows.",
      severity: "critical",
      recommendation:
        "Replace sprintf() with snprintf() and provide the destination buffer size.",
      cwe: "CWE-120",
      owasp: "A03:2021-Injection",
      category: "Buffer Overflow",
    }),
    issues,
    source,
  );

  addMatches(
    /\bscanf\s*\(\s*"[^"]*%s/gi,
    maskedSource,
    createRule({
      ruleId: "c-unsafe-scanf",
      title: "Unbounded scanf() string input",
      description:
        "scanf() with an unrestricted %s conversion can write beyond the bounds of a fixed-size character array.",
      severity: "high",
      recommendation:
        "Specify a maximum field width or use fgets() with explicit length validation.",
      cwe: "CWE-120",
      owasp: "A03:2021-Injection",
      category: "Buffer Overflow",
    }),
    issues,
    source,
  );

  addMatches(
    /\bcin\s*>>\s*[A-Za-z_][A-Za-z0-9_]*\b/gi,
    maskedSource,
    createRule({
      ruleId: "cpp-unbounded-cin",
      title: "Potentially unbounded C++ input",
      description:
        "Formatted extraction into a raw character array can overflow the destination when input length is not explicitly constrained.",
      severity: "high",
      recommendation:
        "Prefer std::string with suitable validation or enforce an explicit input width before extracting into a character array.",
      cwe: "CWE-120",
      owasp: "A03:2021-Injection",
      category: "Buffer Overflow",
    }),
    issues,
    source,
  );

  addMatches(
    /\bsystem\s*\(\s*(?!["'])[^)]*\)/gi,
    maskedSource,
    createRule({
      ruleId: "c-command-injection",
      title: "Potential OS command injection",
      description:
        "system() is being called with a dynamically constructed or variable command. If attacker-controlled input reaches the command, arbitrary operating-system commands may be executed.",
      severity: "critical",
      recommendation:
        "Avoid system() for dynamic commands. Use safer process APIs with fixed arguments and validate all external input.",
      cwe: "CWE-78",
      owasp: "A03:2021-Injection",
      category: "Command Injection",
    }),
    issues,
    source,
  );

  addMatches(
    /\bsystem\s*\(\s*["'][^"']*["']\s*\)/gi,
    maskedSource,
    createRule({
      ruleId: "c-system-call",
      title: "Use of system()",
      description:
        "The system() API invokes a shell and can become dangerous if command construction is later changed to include untrusted input.",
      severity: "medium",
      recommendation:
        "Prefer a safer process API with explicit arguments instead of system().",
      cwe: "CWE-78",
      owasp: "A03:2021-Injection",
      category: "Command Execution",
    }),
    issues,
    source,
  );

  addMatches(
    /\bpopen\s*\(/gi,
    maskedSource,
    createRule({
      ruleId: "c-popen",
      title: "Potential unsafe popen() usage",
      description:
        "popen() executes a command through a shell and can lead to command injection when the command contains untrusted input.",
      severity: "high",
      recommendation:
        "Avoid constructing shell commands from external input and prefer safer process APIs.",
      cwe: "CWE-78",
      owasp: "A03:2021-Injection",
      category: "Command Injection",
    }),
    issues,
    source,
  );

  addMatches(
    /\bprintf\s*\(\s*[A-Za-z_][A-Za-z0-9_]*(?:\s*\)|\s*,)/gi,
    maskedSource,
    createRule({
      ruleId: "c-format-string",
      title: "Potential format string vulnerability",
      description:
        "A variable is being used directly as a printf-style format string.",
      severity: "high",
      recommendation:
        'Use a fixed format string such as printf("%s", value) instead of passing untrusted data as the format string.',
      cwe: "CWE-134",
      owasp: "A03:2021-Injection",
      category: "Format String",
    }),
    issues,
    source,
  );
}

function scanPathTraversal(
  source,
  maskedSource,
  issues,
) {
  addMatches(
    /(?:\.\.\/|\.\.\\|path\.join\s*\([^)]*(?:req\.|request\.|params|query|body|userInput|user_input))/gi,
    maskedSource,
    createRule({
      ruleId: "path-traversal",
      title: "Potential path traversal",
      description:
        "User-controlled or traversal-style path data may allow access to unintended files.",
      severity: "high",
      recommendation:
        "Validate paths, reject traversal sequences, resolve against an allowed base directory, and verify the final path remains inside it.",
      cwe: "CWE-22",
      owasp: "A01:2021-Broken-Access-Control",
      category: "Path Traversal",
    }),
    issues,
    source,
  );
}

function scanInsecureRandom(
  source,
  maskedSource,
  issues,
) {
  addMatches(
    /(?:Math\.random\s*\(\)|random\.random\s*\(\)|new\s+Random\s*\(\s*\))(?=[\s\S]{0,120}(?:password|passwd|pwd|token|secret|session|nonce|otp|verification|reset|auth|key))/gi,
    maskedSource,
    createRule({
      ruleId: "insecure-random",
      title: "Insecure random number generation",
      description:
        "A non-cryptographic random generator appears to be used for a security-sensitive value.",
      severity: "medium",
      recommendation:
        "Use a cryptographically secure random generator for passwords, tokens, sessions, keys, OTPs, and other security-sensitive values.",
      cwe: "CWE-338",
      owasp: "A02:2021-Cryptographic-Failures",
      category: "Cryptography",
    }),
    issues,
    source,
  );
}

function scanSqlInjection(
  source,
  maskedSource,
  issues,
) {
  addMatches(
    /(?:SELECT|INSERT|UPDATE|DELETE)\s+[\s\S]{0,200}(?:\+|\$\{|\`|\+\s*[A-Za-z_$][\w$]*)/gi,
    maskedSource,
    createRule({
      ruleId: "sql-injection",
      title: "Potential SQL injection",
      description:
        "SQL appears to be dynamically constructed instead of safely parameterized.",
      severity: "high",
      recommendation:
        "Use parameterized queries or prepared statements instead of concatenating untrusted input into SQL.",
      cwe: "CWE-89",
      owasp: "A03:2021-Injection",
      category: "SQL Injection",
    }),
    issues,
    source,
  );
}

function scanWeakCrypto(
  source,
  maskedSource,
  issues,
) {
  addMatches(
    /\b(?:md5|sha1)\s*\(/gi,
    maskedSource,
    createRule({
      ruleId: "weak-cryptography",
      title: "Weak cryptographic algorithm",
      description:
        "A weak cryptographic algorithm was detected.",
      severity: "medium",
      recommendation:
        "Use modern cryptographic algorithms such as SHA-256 or stronger where appropriate.",
      cwe: "CWE-327",
      owasp: "A02:2021-Cryptographic-Failures",
      category: "Cryptography",
    }),
    issues,
    source,
  );
}

function deduplicateIssues(issues) {
  const seen = new Set();

  return issues.filter((issue) => {
    const key = [
      issue.ruleId,
      issue.line,
      issue.column,
      issue.title,
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function calculateSecurityScore(issues) {
  const penalty = issues.reduce(
    (total, issue) =>
      total + (SEVERITY_WEIGHTS[issue.severity] || 0),
    0,
  );

  return Math.max(0, 100 - penalty);
}

function calculateIssueCount(issues) {
  return Array.isArray(issues) ? issues.length : 0;
}

function analyzeCodeLocally(
  source,
  options = {},
) {
  const originalSource = String(source || "");
  const filePath = String(options.filePath || "");

  const language = normalizeLanguage(
    options.language ||
      filePath
        .split(/[\\/]/)
        .pop()
        .split(".")
        .pop(),
  );

  const profile = String(
    options.profile || "balanced",
  ).toLowerCase();

  const minimumSeverity = String(
    options.minimumSeverity || "info",
  ).toLowerCase();

  const maskedSource =
    maskNonCode(originalSource);

  const issues = [];

  scanHardcodedSecrets(
    originalSource,
    issues,
  );

  scanEnvironmentExposure(
    originalSource,
    maskedSource,
    issues,
  );

  scanEval(
    originalSource,
    maskedSource,
    issues,
  );

  scanCommandExecution(
    originalSource,
    maskedSource,
    language,
    issues,
  );

  scanCAndCpp(
    originalSource,
    maskedSource,
    language,
    issues,
  );

  scanPathTraversal(
    originalSource,
    maskedSource,
    issues,
  );

  scanInsecureRandom(
    originalSource,
    maskedSource,
    issues,
  );

  scanSqlInjection(
    originalSource,
    maskedSource,
    issues,
  );

  scanWeakCrypto(
    originalSource,
    maskedSource,
    issues,
  );

  let filteredIssues =
    deduplicateIssues(issues).filter(
      (issue) =>
        severityAllowed(
          issue.severity,
          minimumSeverity,
        ),
    );

  if (profile === "quick") {
    filteredIssues =
      filteredIssues.filter(
        (issue) =>
          issue.severity === "critical" ||
          issue.severity === "high",
      );
  }

  const securityScore =
    calculateSecurityScore(
      filteredIssues,
    );

  return {
    securityScore,
    score: securityScore,
    issueCount: filteredIssues.length,
    issues: filteredIssues,
    language,
    summary: {
      critical: filteredIssues.filter(
        (issue) =>
          issue.severity === "critical",
      ).length,
      high: filteredIssues.filter(
        (issue) =>
          issue.severity === "high",
      ).length,
      medium: filteredIssues.filter(
        (issue) =>
          issue.severity === "medium",
      ).length,
      low: filteredIssues.filter(
        (issue) =>
          issue.severity === "low",
      ).length,
      info: filteredIssues.filter(
        (issue) =>
          issue.severity === "info",
      ).length,
    },
  };
}

function analyzeCodeLocallyWithSqlGuard(
  source,
  options = {},
) {
  return analyzeCodeLocally(
    source,
    options,
  );
}

module.exports = {
  analyzeCodeLocally,
  analyzeCodeLocallyWithSqlGuard,
  calculateSecurityScore,
  calculateIssueCount,
  normalizeLanguage,
  maskNonCode,
};