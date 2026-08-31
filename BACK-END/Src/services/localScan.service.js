const securityRules = [
  {
    ruleId: "hardcoded-password",
    title: "Possible hardcoded password",
    severity: "high",
    confidence: "high",
    owasp: {
      id: "A07:2025",
      category: "Authentication Failures",
    },
    cwe: "CWE-798",
    patterns: [
      /\bpassword\s*=\s*["'][^"']+["']/i,
      /\bpasswd\s*=\s*["'][^"']+["']/i,
      /\bpwd\s*=\s*["'][^"']+["']/i,
      /\b[a-z0-9_]*(password|passwd|pwd)[a-z0-9_]*\s*=\s*["'][^"']{3,}["']/i,
      /\b(db|database|admin|root|user|login|final|default)[_-]?(password|passwd|pwd)\s*=\s*["'][^"']+["']/i,
    ],
    recommendation:
      "Store passwords in environment variables or a dedicated secrets manager.",
  },

  {
    ruleId: "hardcoded-api-key",
    title: "Possible hardcoded API key or token",
    severity: "high",
    confidence: "high",
    owasp: {
      id: "A02:2025",
      category: "Security Misconfiguration",
    },
    cwe: "CWE-798",
    patterns: [
      /\bapi[_-]?key\s*=\s*["'][^"']{8,}["']/i,
      /\bsecret[_-]?key\s*=\s*["'][^"']{8,}["']/i,
      /\baccess[_-]?token\s*=\s*["'][^"']{8,}["']/i,
      /\bclient[_-]?secret\s*=\s*["'][^"']{8,}["']/i,
      /\bauth[_-]?token\s*=\s*["'][^"']{8,}["']/i,
      /\brefresh[_-]?token\s*=\s*["'][^"']{8,}["']/i,
      /\b(jwt[_-]?secret|jwt[_-]?key)\s*=\s*["'][^"']{6,}["']/i,
      /\b(secret|token|apikey|api_key|access_token|refresh_token)\s*=\s*["'][A-Za-z0-9_\-]{8,}["']/i,
    ],
    recommendation:
      "Remove secrets from source code, store them securely, and rotate exposed credentials.",
  },

  {
    ruleId: "private-key",
    title: "Possible private key embedded in source",
    severity: "critical",
    confidence: "high",
    owasp: {
      id: "A02:2025",
      category: "Security Misconfiguration",
    },
    cwe: "CWE-321",
    patterns: [
      /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    ],
    recommendation:
      "Remove private keys from source code and use a secure key-management system.",
  },

  {
    ruleId: "eval-usage",
    title: "Unsafe eval usage",
    severity: "critical",
    confidence: "high",
    owasp: {
      id: "A05:2025",
      category: "Injection",
    },
    cwe: "CWE-95",
    patterns: [
      /\beval\s*\(/i,
    ],
    recommendation:
      "Avoid eval(). Use explicit parsing or safe alternatives such as ast.literal_eval where appropriate.",
  },

  {
    ruleId: "exec-usage",
    title: "Unsafe exec usage",
    severity: "critical",
    confidence: "high",
    owasp: {
      id: "A05:2025",
      category: "Injection",
    },
    cwe: "CWE-94",
    patterns: [
      /\bexec\s*\(/i,
    ],
    recommendation:
      "Avoid executing dynamically constructed code. Use explicit functions and validated input.",
  },

  {
    ruleId: "shell-command",
    title: "Potential unsafe shell execution",
    severity: "critical",
    confidence: "high",
    owasp: {
      id: "A05:2025",
      category: "Injection",
    },
    cwe: "CWE-78",
    patterns: [
      /\bos\.system\s*\(/i,
      /\bos\.popen\s*\(/i,
      /\bsubprocess\.(run|call|Popen|check_output|check_call)\s*\([^)]*shell\s*=\s*True/i,
      /\bsubprocess\.(run|call|Popen|check_output|check_call)\s*\([^)]*(request|input|params|query|command|cmd)/i,
      /\bchild_process\.exec\s*\(/i,
      /\bexecSync\s*\(/i,
    ],
    recommendation:
      "Avoid shell execution with untrusted data. Use argument arrays, allowlists, and safe process APIs.",
  },

  {
    ruleId: "sql-injection",
    title: "Possible SQL injection",
    severity: "critical",
    confidence: "high",
    owasp: {
      id: "A05:2025",
      category: "Injection",
    },
    cwe: "CWE-89",
    patterns: [
      /\b(SELECT|INSERT|UPDATE|DELETE)\b.*\+\s*\w+/i,
      /\b(SELECT|INSERT|UPDATE|DELETE)\b.*\$\{[^}]+\}/i,
      /execute\s*\(\s*f["']/i,
      /execute\s*\([^)]*%\s*\w+/i,
      /query\s*\(\s*`[^`]*\$\{/i,
      /query\s*\([^)]*\+\s*\w+/i,
      /\b(SELECT|INSERT|UPDATE|DELETE)\b.*%\s*\w+/i,
      /\b(sql|query)\s*=\s*f["'][^"']*\b(SELECT|INSERT|UPDATE|DELETE)\b/i,
    ],
    recommendation:
      "Use parameterized queries, prepared statements, or safe ORM query APIs.",
  },

  {
    ruleId: "xss-innerhtml",
    title: "Potential cross-site scripting via HTML injection",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A05:2025",
      category: "Injection",
    },
    cwe: "CWE-79",
    patterns: [
      /\.innerHTML\s*=/i,
      /\.outerHTML\s*=/i,
      /document\.write\s*\(/i,
      /dangerouslySetInnerHTML/i,
      /\bv-html\s*=/i,
    ],
    recommendation:
      "Avoid inserting untrusted HTML directly into the DOM. Encode or sanitize untrusted output.",
  },

  {
    ruleId: "path-traversal",
    title: "Potential path traversal",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A01:2025",
      category: "Broken Access Control",
    },
    cwe: "CWE-22",
    patterns: [
      /open\s*\([^)]*(request|input|params|query|filename|path)/i,
      /readFile\s*\([^)]*(req\.|request|params|query)/i,
      /sendFile\s*\([^)]*(req\.|request|params|query)/i,
      /path\.join\s*\([^)]*(req\.|request|params|query)/i,
      /\b(filename|filepath|path)\s*=\s*(request|req|input)/i,
      /["']\/var\/www\/[^"']*["']\s*\+\s*\w+/i,
      /["']\.\/uploads\/["']\s*\+\s*\w+/i,
    ],
    recommendation:
      "Resolve paths against an approved base directory and allowlist permitted file names.",
  },

  {
    ruleId: "unsafe-pickle",
    title: "Unsafe pickle deserialization",
    severity: "high",
    confidence: "high",
    owasp: {
      id: "A08:2025",
      category: "Software or Data Integrity Failures",
    },
    cwe: "CWE-502",
    patterns: [
      /\bpickle\.loads?\s*\(/i,
      /\bcPickle\.loads?\s*\(/i,
    ],
    recommendation:
      "Never deserialize untrusted pickle data. Prefer safer formats such as JSON.",
  },

  {
    ruleId: "unsafe-yaml",
    title: "Potential unsafe YAML deserialization",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A08:2025",
      category: "Software or Data Integrity Failures",
    },
    cwe: "CWE-502",
    patterns: [
      /\byaml\.load\s*\([^)]*(?!SafeLoader)/i,
    ],
    recommendation:
      "Use yaml.safe_load() or an explicitly safe loader for untrusted YAML.",
  },

  {
    ruleId: "weak-hash",
    title: "Weak hashing algorithm",
    severity: "medium",
    confidence: "high",
    owasp: {
      id: "A04:2025",
      category: "Cryptographic Failures",
    },
    cwe: "CWE-328",
    patterns: [
      /\bhashlib\.md5\s*\(/i,
      /\bhashlib\.sha1\s*\(/i,
      /\bcrypto\.createHash\s*\(\s*["']md5["']/i,
      /\bcrypto\.createHash\s*\(\s*["']sha1["']/i,
    ],
    recommendation:
      "Use a modern cryptographic hash. For passwords, use Argon2, bcrypt, scrypt, or PBKDF2.",
  },

  {
    ruleId: "insecure-random",
    title: "Potential insecure random generation",
    severity: "medium",
    confidence: "medium",
    owasp: {
      id: "A04:2025",
      category: "Cryptographic Failures",
    },
    cwe: "CWE-330",
    patterns: [
      /\brandom\.(random|randint|choice|randrange)\s*\(/i,
      /\bMath\.random\s*\(/i,
    ],
    recommendation:
      "Use a cryptographically secure random generator for tokens, passwords, keys, and security-sensitive values.",
  },

  {
    ruleId: "insecure-http",
    title: "Insecure HTTP connection detected",
    severity: "medium",
    confidence: "medium",
    owasp: {
      id: "A04:2025",
      category: "Cryptographic Failures",
    },
    cwe: "CWE-319",
    patterns: [
      /["']http:\/\/(?!localhost|127\.0\.0\.1)[^"']+["']/i,
    ],
    recommendation:
      "Use HTTPS/TLS for network communication carrying sensitive or authenticated data.",
  },

  {
    ruleId: "tls-verification-disabled",
    title: "TLS certificate verification disabled",
    severity: "high",
    confidence: "high",
    owasp: {
      id: "A04:2025",
      category: "Cryptographic Failures",
    },
    cwe: "CWE-295",
    patterns: [
      /\bverify\s*=\s*False/i,
      /\brejectUnauthorized\s*:\s*false/i,
      /NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0/i,
    ],
    recommendation:
      "Keep TLS certificate verification enabled and use trusted certificates.",
  },

  {
    ruleId: "cors-wildcard",
    title: "Potential overly permissive CORS configuration",
    severity: "medium",
    confidence: "medium",
    owasp: {
      id: "A02:2025",
      category: "Security Misconfiguration",
    },
    cwe: "CWE-942",
    patterns: [
      /Access-Control-Allow-Origin["']?\s*[:,=]\s*["']\*["']/i,
      /origin\s*:\s*["']\*["']/i,
    ],
    recommendation:
      "Restrict CORS to explicitly trusted frontend origins.",
  },

  {
    ruleId: "jwt-none",
    title: "Potential insecure JWT configuration",
    severity: "critical",
    confidence: "high",
    owasp: {
      id: "A07:2025",
      category: "Authentication Failures",
    },
    cwe: "CWE-347",
    patterns: [
      /algorithm\s*[:=]\s*["']none["']/i,
      /algorithms?\s*[:=]\s*\[\s*["']none["']/i,
      /verify_signature["']?\s*:\s*false/i,
    ],
    recommendation:
      "Require a strong JWT signing algorithm and always verify token signatures.",
  },

  {
    ruleId: "weak-jwt-secret",
    title: "Possible hardcoded JWT secret",
    severity: "high",
    confidence: "high",
    owasp: {
      id: "A07:2025",
      category: "Authentication Failures",
    },
    cwe: "CWE-798",
    patterns: [
      /\bjwt[_-]?secret\s*=\s*["'][^"']+["']/i,
      /\bJWT_SECRET\s*=\s*["'][^"']+["']/i,
    ],
    recommendation:
      "Store JWT signing secrets outside source code and use high-entropy keys.",
  },

  {
    ruleId: "command-construction",
    title: "Potential command injection through string construction",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A05:2025",
      category: "Injection",
    },
    cwe: "CWE-78",
    patterns: [
      /\b(os\.system|child_process\.exec|execSync)\s*\([^)]*\+/i,
      /\b(os\.system|child_process\.exec|execSync)\s*\(\s*`[^`]*\$\{/i,
    ],
    recommendation:
      "Do not construct operating-system commands from user-controlled strings.",
  },

  {
    ruleId: "prototype-pollution",
    title: "Potential prototype pollution",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A08:2025",
      category: "Software or Data Integrity Failures",
    },
    cwe: "CWE-1321",
    patterns: [
      /\["__proto__"\]\s*=/i,
      /\["constructor"\]\["prototype"\]/i,
      /\.__proto__\s*=/i,
    ],
    recommendation:
      "Reject dangerous object keys and use safe object-merging libraries.",
  },

  {
    ruleId: "open-redirect",
    title: "Potential unvalidated redirect",
    severity: "medium",
    confidence: "medium",
    owasp: {
      id: "A01:2025",
      category: "Broken Access Control",
    },
    cwe: "CWE-601",
    patterns: [
      /redirect\s*\(\s*(req\.|request\.|params\.|query\.)/i,
      /location\.href\s*=\s*(req\.|request\.|params\.|query\.)/i,
    ],
    recommendation:
      "Allow redirects only to trusted, predefined destinations.",
  },

  {
    ruleId: "debug-mode",
    title: "Debug mode enabled",
    severity: "medium",
    confidence: "high",
    owasp: {
      id: "A02:2025",
      category: "Security Misconfiguration",
    },
    cwe: "CWE-489",
    patterns: [
      /\bdebug\s*=\s*True/i,
      /\bDEBUG\s*=\s*true/i,
    ],
    recommendation:
      "Disable debug mode and verbose error output in production environments.",
  },

  {
    ruleId: "debug-output",
    title: "Debug output detected",
    severity: "info",
    confidence: "medium",
    owasp: {
      id: "A09:2025",
      category: "Security Logging and Alerting Failures",
    },
    cwe: "CWE-532",
    patterns: [
      /\bconsole\.log\s*\(/i,
      /\bprint\s*\(/i,
    ],
    recommendation:
      "Remove unnecessary debug output or replace it with structured logging.",
  },

  {
    ruleId: "sensitive-logging",
    title: "Potential sensitive data written to logs",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A09:2025",
      category: "Security Logging and Alerting Failures",
    },
    cwe: "CWE-532",
    patterns: [
      /\b(logging\.(info|debug|warning|error)|console\.log|print)\s*\([^)]*(password|passwd|pwd|secret|token|api[_-]?key)/i,
      /\b(logger\.(info|debug|warn|error))\s*\([^)]*(password|secret|token)/i,
    ],
    recommendation:
      "Never log passwords, tokens, API keys, credentials, or other sensitive information.",
  },

  {
    ruleId: "unsafe-temp-file",
    title: "Potential insecure temporary file handling",
    severity: "medium",
    confidence: "medium",
    owasp: {
      id: "A02:2025",
      category: "Security Misconfiguration",
    },
    cwe: "CWE-377",
    patterns: [
      /\btempfile\.mktemp\s*\(/i,
      /["']\/tmp\/[^"']+["']/i,
      /\bos\.tmpnam\s*\(/i,
    ],
    recommendation:
      "Use secure temporary-file APIs that create files atomically with restrictive permissions.",
  },

  {
    ruleId: "unsafe-file-upload",
    title: "Potential unsafe file upload",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A08:2025",
      category: "Software or Data Integrity Failures",
    },
    cwe: "CWE-434",
    patterns: [
      /\.save\s*\([^)]*(filename|uploaded_file|file\.filename)/i,
      /\buploaded_file\.filename\b/i,
      /\brequest\.files\b/i,
    ],
    recommendation:
      "Validate file type and content, generate server-side filenames, and store uploads outside executable directories.",
  },

  {
    ruleId: "environment-exposure",
    title: "Potential exposure of environment variables",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A02:2025",
      category: "Security Misconfiguration",
    },
    cwe: "CWE-200",
    patterns: [
      /dict\s*\(\s*os\.environ\s*\)/i,
      /JSON\.stringify\s*\(\s*process\.env\s*\)/i,
      /return\s+.*process\.env/i,
    ],
    recommendation:
      "Do not expose complete environment-variable sets through API responses or logs.",
  },

  {
    ruleId: "java-process-builder",
    title: "Potential unsafe Java ProcessBuilder usage",
    severity: "critical",
    confidence: "high",
    owasp: {
      id: "A05:2025",
      category: "Injection",
    },
    cwe: "CWE-78",
    patterns: [
      /\bnew\s+ProcessBuilder\s*\([^)]*(\+|args\s*\[|request|param|query|input|username|host|command|cmd)/i,
      /\bProcessBuilder\s*\([^)]*(\+|args\s*\[|request|param|query|input|username|host|command|cmd)/i,
    ],
    recommendation:
      "Avoid shell command construction with untrusted input. Pass validated allowlisted arguments directly to ProcessBuilder without invoking a shell.",
  },

  {
    ruleId: "java-weak-hash",
    title: "Weak Java hashing algorithm",
    severity: "medium",
    confidence: "high",
    owasp: {
      id: "A04:2025",
      category: "Cryptographic Failures",
    },
    cwe: "CWE-328",
    patterns: [
      /MessageDigest\.getInstance\s*\(\s*["']MD5["']\s*\)/i,
      /MessageDigest\.getInstance\s*\(\s*["']SHA-?1["']\s*\)/i,
    ],
    recommendation:
      "Replace MD5 and SHA-1 with modern cryptographic primitives. Use SHA-256 or stronger for integrity and a password-hashing function such as Argon2, bcrypt, scrypt, or PBKDF2 for passwords.",
  },

  {
    ruleId: "java-insecure-random",
    title: "Potential insecure Java random generation",
    severity: "medium",
    confidence: "medium",
    owasp: {
      id: "A04:2025",
      category: "Cryptographic Failures",
    },
    cwe: "CWE-330",
    patterns: [
      /\bnew\s+(?:java\.util\.)?Random\s*\(/i,
      /\bjava\.util\.Random\s+\w+/i,
    ],
    recommendation:
      "Use java.security.SecureRandom for tokens, keys, reset codes, session identifiers, and other security-sensitive values.",
  },

  {
    ruleId: "java-unsafe-deserialization",
    title: "Potential unsafe Java deserialization",
    severity: "high",
    confidence: "high",
    owasp: {
      id: "A08:2025",
      category: "Software or Data Integrity Failures",
    },
    cwe: "CWE-502",
    patterns: [
      /\bObjectInputStream\b/i,
      /\.readObject\s*\(/i,
    ],
    recommendation:
      "Avoid native Java deserialization of untrusted data. Prefer safe structured formats and strict type validation.",
  },

  {
    ruleId: "java-weak-crypto",
    title: "Weak Java cryptographic algorithm",
    severity: "high",
    confidence: "high",
    owasp: {
      id: "A04:2025",
      category: "Cryptographic Failures",
    },
    cwe: "CWE-327",
    patterns: [
      /Cipher\.getInstance\s*\(\s*["'][^"']*\bDES\b[^"']*["']\s*\)/i,
      /Cipher\.getInstance\s*\(\s*["'][^"']*\/ECB(?:\/|["'])/i,
      /\bSecretKeySpec\s*\([^)]*,\s*["']DES["']\s*\)/i,
    ],
    recommendation:
      "Use a modern authenticated cipher such as AES-GCM with securely generated keys. Avoid DES and ECB mode.",
  },

  {
    ruleId: "java-sensitive-logging",
    title: "Potential sensitive data written to Java logs",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A09:2025",
      category: "Security Logging and Alerting Failures",
    },
    cwe: "CWE-532",
    patterns: [
      /\bSystem\.(?:out|err)\.(?:print|println|printf)\s*\([^)]*(password|passwd|pwd|secret|token|api[_-]?key)/i,
      /\b(?:logger|log)\.(?:trace|debug|info|warn|error)\s*\([^)]*(password|passwd|pwd|secret|token|api[_-]?key)/i,
    ],
    recommendation:
      "Never write passwords, API keys, tokens, credentials, or other secrets to logs or console output.",
  },

  {
    ruleId: "java-hardcoded-db-credentials",
    title: "Possible hardcoded Java database credentials",
    severity: "high",
    confidence: "high",
    owasp: {
      id: "A07:2025",
      category: "Authentication Failures",
    },
    cwe: "CWE-798",
    patterns: [
      /DriverManager\.getConnection\s*\([^)]*,\s*["'][^"']+["']\s*,\s*["'][^"']+["']\s*\)/i,
    ],
    recommendation:
      "Move database usernames and passwords out of source code and load them from a secrets manager or protected environment configuration.",
  },


  {
    ruleId: "cpp-unsafe-buffer-copy",
    title: "Unsafe C/C++ buffer copy",
    severity: "critical",
    confidence: "high",
    owasp: {
      id: "A10:2025",
      category: "Mishandling of Exceptional Conditions",
    },
    cwe: "CWE-120",
    patterns: [
      /\bstrcpy\s*\(/i,
      /\bstrcat\s*\(/i,
      /\bgets\s*\(/i,
      /\bsprintf\s*\(/i,
    ],
    recommendation:
      "Avoid unbounded C string functions. Use size-aware alternatives and validate destination buffer capacity before copying or formatting data.",
  },

  {
    ruleId: "cpp-format-string",
    title: "Potential C/C++ format-string vulnerability",
    severity: "high",
    confidence: "high",
    owasp: {
      id: "A05:2025",
      category: "Injection",
    },
    cwe: "CWE-134",
    patterns: [
      /\bprintf\s*\(\s*(?!["'])[^,)]+\s*\)/i,
      /\bfprintf\s*\(\s*[^,]+,\s*(?!["'])[^,)]+\s*\)/i,
      /\bsprintf\s*\(\s*[^,]+,\s*(?!["'])[^,)]+/i,
    ],
    recommendation:
      "Never use attacker-controlled data as a printf-style format string. Use a constant format such as printf(\"%s\", value).",
  },

  {
    ruleId: "cpp-command-injection",
    title: "Potential C/C++ command injection",
    severity: "critical",
    confidence: "high",
    owasp: {
      id: "A05:2025",
      category: "Injection",
    },
    cwe: "CWE-78",
    patterns: [
      /\bsystem\s*\(\s*(?!["'])[^)]+\)/i,
      /\bpopen\s*\(\s*(?!["'])[^,]+/i,
      /\bexecl?p?\s*\([^)]*(user|input|host|command|cmd|argv)/i,
    ],
    recommendation:
      "Avoid passing dynamically constructed strings to system(), popen(), or shell execution APIs. Use allowlisted arguments and direct process APIs instead.",
  },

  {
    ruleId: "cpp-insecure-random",
    title: "Potential insecure C/C++ random generation",
    severity: "medium",
    confidence: "medium",
    owasp: {
      id: "A04:2025",
      category: "Cryptographic Failures",
    },
    cwe: "CWE-330",
    patterns: [
      /\brand\s*\(\s*\)/i,
      /\bsrand\s*\(/i,
    ],
    recommendation:
      "Do not use rand()/srand() for tokens, keys, session identifiers, or other security-sensitive values. Use an operating-system CSPRNG or a vetted cryptographic library.",
  },

  {
    ruleId: "cpp-sensitive-logging",
    title: "Potential sensitive data written to C/C++ output",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A09:2025",
      category: "Security Logging and Alerting Failures",
    },
    cwe: "CWE-532",
    patterns: [
      /\b(?:cout|cerr|clog)\s*<<[^;\n]*(password|passwd|pwd|secret|token|api[_-]?key)/i,
      /\bprintf\s*\([^;\n]*(password|passwd|pwd|secret|token|api[_-]?key)/i,
    ],
    recommendation:
      "Never print passwords, API keys, tokens, credentials, or other secrets to console output or application logs.",
  },

  {
    ruleId: "cpp-weak-crypto",
    title: "Weak C/C++ cryptographic algorithm",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A04:2025",
      category: "Cryptographic Failures",
    },
    cwe: "CWE-327",
    patterns: [
      /\bMD5\b/i,
      /\bSHA1\b/i,
      /\bSHA-1\b/i,
      /\bDES\b/i,
      /\bEVP_md5\s*\(/i,
      /\bEVP_sha1\s*\(/i,
    ],
    recommendation:
      "Replace obsolete cryptographic algorithms such as MD5, SHA-1, and DES with modern vetted primitives. Use password-specific hashing functions for passwords.",
  },

  {
    ruleId: "cpp-unsafe-file-access",
    title: "Potential unsafe C/C++ file access",
    severity: "high",
    confidence: "medium",
    owasp: {
      id: "A01:2025",
      category: "Broken Access Control",
    },
    cwe: "CWE-22",
    patterns: [
      /\bfopen\s*\(\s*(?:userInput|input|filename|path|argv\s*\[)/i,
      /\bifstream\s+\w+\s*\(\s*(?:userInput|input|filename|path|argv\s*\[)/i,
      /\bofstream\s+\w+\s*\(\s*(?:userInput|input|filename|path|argv\s*\[)/i,
    ],
    recommendation:
      "Resolve user-controlled paths against an approved base directory, reject traversal sequences, and allowlist permitted filenames or extensions.",
  },

];

const QUICK_RULE_IDS = new Set([
  "hardcoded-password",
  "hardcoded-api-key",
  "private-key",
  "eval-usage",
  "exec-usage",
  "shell-command",
  "command-construction",
  "sql-injection",
  "jwt-none",
  "weak-jwt-secret",
]);

const BALANCED_EXCLUDED_IDS =
  new Set([
    "debug-output",
  ]);

const SEVERITY_RANK = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};


const LANGUAGE_SPECIFIC_RULES = {
  java: new Set([
    "java-process-builder",
    "java-weak-hash",
    "java-insecure-random",
    "java-unsafe-deserialization",
    "java-weak-crypto",
    "java-sensitive-logging",
    "java-hardcoded-db-credentials",
  ]),

  cpp: new Set([
    "cpp-unsafe-buffer-copy",
    "cpp-format-string",
    "cpp-command-injection",
    "cpp-insecure-random",
    "cpp-sensitive-logging",
    "cpp-weak-crypto",
    "cpp-unsafe-file-access",
  ]),

  python: new Set([
    "unsafe-pickle",
    "unsafe-yaml",
  ]),

  javascript: new Set([
    "xss-innerhtml",
    "prototype-pollution",
    "cors-wildcard",
    "jwt-none",
    "weak-jwt-secret",
  ]),
};

function normalizeLanguage(language = "") {
  const normalized =
    String(language || "")
      .trim()
      .toLowerCase();

  if (
    normalized === "js" ||
    normalized === "javascript"
  ) {
    return "javascript";
  }

  if (
    normalized === "ts" ||
    normalized === "typescript"
  ) {
    return "typescript";
  }

  if (
    normalized === "c++" ||
    normalized === "cpp" ||
    normalized === "cplusplus"
  ) {
    return "cpp";
  }

  if (
    normalized === "py" ||
    normalized === "python"
  ) {
    return "python";
  }

  return normalized;
}

function ruleSupportsLanguage(
  rule,
  language,
) {
  const normalizedLanguage =
    normalizeLanguage(language);

  const ruleId =
    rule?.ruleId || "";

  if (
    LANGUAGE_SPECIFIC_RULES
      .java
      .has(ruleId)
  ) {
    return (
      normalizedLanguage ===
      "java"
    );
  }

  if (
    LANGUAGE_SPECIFIC_RULES
      .cpp
      .has(ruleId)
  ) {
    return (
      normalizedLanguage ===
        "cpp" ||
      normalizedLanguage ===
        "c"
    );
  }

  if (
    LANGUAGE_SPECIFIC_RULES
      .python
      .has(ruleId)
  ) {
    return (
      normalizedLanguage ===
      "python"
    );
  }

  if (
    LANGUAGE_SPECIFIC_RULES
      .javascript
      .has(ruleId)
  ) {
    return (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    );
  }

  return true;
}

function getRulesForProfile(
  profile,
  language = "",
) {
  const normalized =
    String(
      profile || "balanced",
    ).toLowerCase();

  let profileRules;

  if (normalized === "quick") {
    profileRules =
      securityRules.filter(
        (rule) =>
          QUICK_RULE_IDS.has(
            rule.ruleId,
          ),
      );
  } else if (
    normalized === "deep"
  ) {
    profileRules =
      securityRules;
  } else {
    profileRules =
      securityRules.filter(
        (rule) =>
          !BALANCED_EXCLUDED_IDS.has(
            rule.ruleId,
          ),
      );
  }

  return profileRules.filter(
    (rule) =>
      ruleSupportsLanguage(
        rule,
        language,
      ),
  );
}

function countIssues(issues) {
  const issueCount = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  issues.forEach((issue) => {
    if (
      Object.prototype.hasOwnProperty.call(
        issueCount,
        issue.severity,
      )
    ) {
      issueCount[
        issue.severity
      ] += 1;
    }
  });

  return issueCount;
}

function scoreIssues(issues) {
  const counts =
    countIssues(issues);

  const penalty =
    counts.critical * 25 +
    counts.high * 15 +
    counts.medium * 8 +
    counts.low * 3 +
    counts.info * 1;

  return Math.max(
    0,
    Math.min(
      100,
      100 - penalty,
    ),
  );
}

const CODE_ONLY_RULE_IDS = new Set([
  "eval-usage",
  "exec-usage",
  "shell-command",
  "command-construction",
  "xss-innerhtml",
  "path-traversal",
  "unsafe-pickle",
  "unsafe-yaml",
  "weak-hash",
  "insecure-random",
  "tls-verification-disabled",
  "prototype-pollution",
  "open-redirect",
  "debug-output",
  "environment-exposure",

  "java-process-builder",
  "java-weak-hash",
  "java-insecure-random",
  "java-unsafe-deserialization",
  "java-weak-crypto",

  "cpp-unsafe-buffer-copy",
  "cpp-format-string",
  "cpp-command-injection",
  "cpp-insecure-random",
  "cpp-weak-crypto",
  "cpp-unsafe-file-access",
]);

function maskQuotedText(text = "") {
  const source = String(text);

  let result = "";
  let quote = null;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        result += " ";
        continue;
      }

      if (character === "\\") {
        escaped = true;
        result += " ";
        continue;
      }

      if (character === quote) {
        quote = null;
        result += " ";
        continue;
      }

      result += " ";
      continue;
    }

    if (
      character === '"' ||
      character === "'" ||
      character === "`"
    ) {
      quote = character;
      result += " ";
      continue;
    }

    result += character;
  }

  return result;
}

function removeLineComment(text = "") {
  const source = String(text);

  let result = "";
  let quote = null;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (quote) {
      result += character;

      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (
      character === '"' ||
      character === "'" ||
      character === "`"
    ) {
      quote = character;
      result += character;
      continue;
    }

    if (
      character === "/" &&
      nextCharacter === "/"
    ) {
      break;
    }

    if (character === "#") {
      break;
    }

    result += character;
  }

  return result;
}

function getCodeOnlyText(text = "") {
  return maskQuotedText(
    removeLineComment(text),
  );
}

function testRuleAgainstText(rule, text) {
  const sourceText =
    CODE_ONLY_RULE_IDS.has(rule.ruleId)
      ? getCodeOnlyText(text)
      : String(text || "");

  return rule.patterns.some((pattern) => {
    pattern.lastIndex = 0;

    return pattern.test(
      sourceText,
    );
  });
}


function getLanguageAwareRecommendation(
  ruleId,
  language,
  fallback,
) {
  const normalizedLanguage =
    normalizeLanguage(
      language,
    );

  const id =
    String(
      ruleId || "",
    ).toLowerCase();

  if (id === "eval-usage") {
    if (
      normalizedLanguage ===
      "python"
    ) {
      return "Avoid eval(). Use explicit parsing, json.loads(), or ast.literal_eval() only when parsing trusted Python literal structures.";
    }

    if (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    ) {
      return "Avoid eval(). Use explicit parsing, JSON.parse() for JSON data, allowlisted operations, or dedicated safe APIs instead of executing strings as code.";
    }

    return "Avoid dynamically evaluating strings as executable code. Use explicit parsing and allowlisted operations instead.";
  }

  if (id === "exec-usage") {
    if (
      normalizedLanguage ===
      "python"
    ) {
      return "Avoid exec() with dynamic or untrusted input. Use explicit functions, structured parsing, and allowlisted operations.";
    }

    if (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    ) {
      return "Avoid dynamic code or shell execution. Prefer child_process APIs with fixed executables and validated argument arrays, without invoking a shell.";
    }

    if (
      normalizedLanguage ===
        "java"
    ) {
      return "Avoid executing dynamically constructed commands. Use ProcessBuilder with a fixed executable and validated, allowlisted arguments.";
    }

    if (
      normalizedLanguage ===
        "c" ||
      normalizedLanguage ===
        "cpp"
    ) {
      return "Avoid system(), popen(), or shell execution with user-controlled strings. Use direct process APIs with validated, allowlisted arguments.";
    }
  }

  if (
    id === "shell-command" ||
    id === "command-construction"
  ) {
    if (
      normalizedLanguage ===
      "python"
    ) {
      return "Avoid shell=True and dynamically constructed shell strings. Use subprocess with an argument list and strict allowlisting of untrusted values.";
    }

    if (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    ) {
      return "Avoid exec() with concatenated user input. Prefer execFile() or spawn() with a fixed executable and validated argument arrays.";
    }

    if (
      normalizedLanguage ===
      "java"
    ) {
      return "Avoid shell command construction. Use ProcessBuilder with a fixed executable and validated arguments rather than invoking a shell.";
    }

    if (
      normalizedLanguage ===
        "c" ||
      normalizedLanguage ===
        "cpp"
    ) {
      return "Avoid constructing shell commands from user-controlled values. Prefer direct process APIs and strict allowlisting.";
    }
  }

  if (id === "sql-injection") {
    if (
      normalizedLanguage ===
      "python"
    ) {
      return "Use parameterized database queries and pass user values separately from SQL text. Do not build SQL with f-strings, %, or concatenation.";
    }

    if (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    ) {
      return "Use parameterized queries or prepared statements provided by your database client or ORM. Never concatenate request values into SQL strings.";
    }

    if (
      normalizedLanguage ===
      "java"
    ) {
      return "Use PreparedStatement placeholders and bind values with setString(), setInt(), or the appropriate setter instead of concatenating SQL.";
    }

    return "Use parameterized queries, prepared statements, or a safe ORM API instead of concatenating untrusted values into SQL.";
  }

  if (id === "hardcoded-password") {
    if (
      normalizedLanguage ===
      "python"
    ) {
      return "Load passwords from environment variables or a secrets manager, for example os.getenv(), and keep real secrets out of source control.";
    }

    if (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    ) {
      return "Load passwords from process.env or a secrets manager and keep real credentials out of source control.";
    }

    if (
      normalizedLanguage ===
      "java"
    ) {
      return "Load credentials from protected environment configuration or a secrets manager instead of embedding them in Java source.";
    }

    if (
      normalizedLanguage ===
        "c" ||
      normalizedLanguage ===
        "cpp"
    ) {
      return "Load credentials from protected runtime configuration or a secrets manager instead of embedding them in source code.";
    }
  }

  if (
    id === "hardcoded-api-key" ||
    id === "weak-jwt-secret"
  ) {
    if (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    ) {
      return "Load API keys and signing secrets from process.env or a secrets manager. Rotate any credential that has already been committed.";
    }

    if (
      normalizedLanguage ===
      "python"
    ) {
      return "Load API keys and signing secrets from environment variables or a secrets manager. Rotate any credential that has already been committed.";
    }

    return "Move API keys and signing secrets out of source code into protected runtime configuration or a secrets manager, and rotate exposed credentials.";
  }

  if (id === "weak-hash") {
    if (
      normalizedLanguage ===
      "python"
    ) {
      return "Use hashlib.sha256() or stronger for general integrity checks. For passwords, use Argon2, bcrypt, scrypt, or PBKDF2.";
    }

    if (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    ) {
      return "Use crypto.createHash(\"sha256\") or stronger for general integrity checks. For passwords, use a dedicated password-hashing algorithm such as Argon2, bcrypt, or scrypt.";
    }

    return "Replace MD5/SHA-1 with a modern cryptographic primitive. Use a dedicated password-hashing function for passwords.";
  }

  if (id === "insecure-random") {
    if (
      normalizedLanguage ===
      "python"
    ) {
      return "Use the secrets module for tokens, passwords, keys, and security-sensitive random values.";
    }

    if (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    ) {
      return "Use crypto.randomBytes(), crypto.randomUUID(), or Web Crypto for security-sensitive randomness instead of Math.random().";
    }

    return "Use a cryptographically secure random-number generator for security-sensitive values.";
  }

  if (id === "path-traversal") {
    if (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    ) {
      return "Use path.basename() for user-controlled filenames, resolve against an approved base directory, and verify the resolved path remains inside that directory.";
    }

    if (
      normalizedLanguage ===
      "python"
    ) {
      return "Resolve user-controlled paths against an approved base directory, normalize them, and verify the resolved path remains inside that directory.";
    }

    return "Normalize user-controlled paths, resolve them against an approved base directory, and reject paths that escape the allowed location.";
  }

  if (id === "open-redirect") {
    if (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    ) {
      return "Redirect only to allowlisted local paths or trusted origins. Do not pass request parameters directly to res.redirect() or location.href.";
    }

    return "Allow redirects only to trusted, predefined destinations and reject arbitrary user-controlled URLs.";
  }

  if (id === "xss-innerhtml") {
    return "Do not assign untrusted data directly to innerHTML, outerHTML, document.write(), or framework raw-HTML sinks. Prefer textContent or a well-maintained sanitizer when HTML is required.";
  }

  if (id === "sensitive-logging") {
    if (
      normalizedLanguage ===
        "javascript" ||
      normalizedLanguage ===
        "typescript"
    ) {
      return "Do not log passwords, API keys, tokens, or other secrets with console or application loggers. Log only non-sensitive identifiers and metadata.";
    }

    return "Do not write passwords, API keys, tokens, credentials, or other secrets to logs or console output.";
  }

  return (
    fallback ||
    "Review this finding and apply the language-appropriate secure coding practice."
  );
}

function createIssue({ rule, line, text, language }) {
  return {
    ruleId: rule.ruleId,
    title: rule.title,
    description: `Potential issue detected: ${String(text || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 500)}`,
    severity: rule.severity,
    confidence: rule.confidence || "medium",
    line,
    recommendation:
      getLanguageAwareRecommendation(
        rule.ruleId,
        language,
        rule.recommendation,
      ),
    owasp:
      rule.owasp || {
        id: "Not applicable",
        category: "Not applicable",
      },
    cwe: rule.cwe || "Not applicable",
  };
}

const RULE_PRIORITY = {
  "cpp-command-injection": 98,
  "cpp-unsafe-buffer-copy": 94,
  "cpp-format-string": 88,
  "cpp-unsafe-file-access": 84,
  "cpp-sensitive-logging": 80,
  "cpp-weak-crypto": 76,
  "cpp-insecure-random": 64,
  "java-process-builder": 96,
  "java-unsafe-deserialization": 89,
  "java-hardcoded-db-credentials": 86,
  "java-weak-crypto": 82,
  "java-sensitive-logging": 79,
  "java-weak-hash": 66,
  "java-insecure-random": 61,
  "private-key": 100,
  "sql-injection": 95,
  "shell-command": 94,
  "eval-usage": 93,
  "exec-usage": 92,
  "jwt-none": 91,
  "unsafe-pickle": 88,
  "hardcoded-password": 85,
  "hardcoded-api-key": 84,
  "weak-jwt-secret": 83,
  "command-construction": 80,
  "sensitive-logging": 78,
  "path-traversal": 76,
  "unsafe-file-upload": 75,
  "tls-verification-disabled": 74,
  "environment-exposure": 72,
  "xss-innerhtml": 70,
  "prototype-pollution": 68,
  "unsafe-yaml": 67,
  "weak-hash": 65,
  "insecure-random": 60,
  "open-redirect": 58,
  "debug-mode": 55,
  "unsafe-temp-file": 52,
  "insecure-http": 50,
  "cors-wildcard": 48,
  "debug-output": 10,
};

const OVERLAP_GROUPS = [
  new Set([
    "shell-command",
    "command-construction",
    "cpp-command-injection",
  ]),
  new Set([
    "path-traversal",
    "cpp-unsafe-file-access",
  ]),
  new Set([
    "weak-hash",
    "weak-crypto",
    "cpp-weak-crypto",
  ]),
  new Set([
    "insecure-random",
    "cpp-insecure-random",
  ]),
  new Set([
    "sensitive-logging",
    "cpp-sensitive-logging",
  ]),
  new Set([
    "weak-hash",
    "java-weak-hash",
  ]),
  new Set([
    "insecure-random",
    "java-insecure-random",
  ]),
  new Set([
    "sensitive-logging",
    "java-sensitive-logging",
  ]),
  new Set([
    "shell-command",
    "command-construction",
    "java-process-builder",
  ]),
  new Set([
    "hardcoded-password",
    "java-hardcoded-db-credentials",
  ]),
  new Set([
    "shell-command",
    "command-construction",
  ]),
  new Set([
    "hardcoded-api-key",
    "weak-jwt-secret",
  ]),
  new Set([
    "debug-output",
    "sensitive-logging",
  ]),
];

function sameOverlapGroup(firstRuleId, secondRuleId) {
  return OVERLAP_GROUPS.some(
    (group) =>
      group.has(firstRuleId) &&
      group.has(secondRuleId),
  );
}

function consolidateIssues(issues) {
  const sorted = [...issues].sort((a, b) => {
    if (a.line !== b.line) {
      return a.line - b.line;
    }

    const severityDifference =
      (SEVERITY_RANK[b.severity] ?? 0) -
      (SEVERITY_RANK[a.severity] ?? 0);

    if (severityDifference !== 0) {
      return severityDifference;
    }

    return (
      (RULE_PRIORITY[b.ruleId] ?? 0) -
      (RULE_PRIORITY[a.ruleId] ?? 0)
    );
  });

  const result = [];

  for (const issue of sorted) {
    const exactDuplicate = result.some(
      (existing) =>
        existing.ruleId === issue.ruleId &&
        existing.line === issue.line,
    );

    if (exactDuplicate) {
      continue;
    }

    const overlappingIndex = result.findIndex(
      (existing) =>
        Math.abs(existing.line - issue.line) <= 1 &&
        sameOverlapGroup(
          existing.ruleId,
          issue.ruleId,
        ),
    );

    if (overlappingIndex !== -1) {
      const existing =
        result[overlappingIndex];

      const existingSeverity =
        SEVERITY_RANK[
          existing.severity
        ] ?? 0;

      const incomingSeverity =
        SEVERITY_RANK[
          issue.severity
        ] ?? 0;

      const existingPriority =
        RULE_PRIORITY[
          existing.ruleId
        ] ?? 0;

      const incomingPriority =
        RULE_PRIORITY[
          issue.ruleId
        ] ?? 0;

      if (
        incomingSeverity >
          existingSeverity ||
        (
          incomingSeverity ===
            existingSeverity &&
          incomingPriority >
            existingPriority
        )
      ) {
        result[
          overlappingIndex
        ] = issue;
      }

      continue;
    }

    result.push(issue);
  }

  return result;
}

const analyzeCodeLocally = (
  code = "",
  options = {},
) => {
  const {
    profile = "balanced",
    minimumSeverity = "info",
    language = "",
  } = options;

  const normalizedLanguage =
    normalizeLanguage(
      language,
    );

  const activeRules =
    getRulesForProfile(
      profile,
      normalizedLanguage,
    );

  const minimumRank =
    SEVERITY_RANK[
      String(
        minimumSeverity || "info",
      ).toLowerCase()
    ] ?? 0;

  const lines =
    String(code).split(/\r?\n/);

  const detectedIssues = [];
  const seenIssues = new Set();

  function addIssue(
    rule,
    lineNumber,
    text,
  ) {
    const issueKey =
      `${rule.ruleId}:${lineNumber}`;

    if (seenIssues.has(issueKey)) {
      return;
    }

    seenIssues.add(issueKey);

    detectedIssues.push(
      createIssue({
        rule,
        line: lineNumber,
        text,
        language:
          normalizedLanguage,
      }),
    );
  }

  /*
   * PASS 1:
   * Fast line-by-line scanning.
   */
  lines.forEach(
    (lineText, index) => {
      const trimmedLine =
        lineText.trim();

      if (!trimmedLine) {
        return;
      }

      activeRules.forEach(
        (rule) => {
          if (
            testRuleAgainstText(
              rule,
              lineText,
            )
          ) {
            addIssue(
              rule,
              index + 1,
              trimmedLine,
            );
          }
        },
      );
    },
  );

  /*
   * PASS 2:
   * Context scanning only for rules that
   * genuinely benefit from multi-line analysis.
   *
   * SQL injection, redirects and sensitive logging
   * are intentionally excluded here because their
   * normal line rules already anchor them correctly.
   * Scanning them through every sliding window caused
   * one vulnerable statement to appear many times.
   */
  const CONTEXT_WINDOW = 6;

  const multilineRules =
    new Set([
      "command-construction",
      "shell-command",
      "java-process-builder",
      "cpp-command-injection",
      "path-traversal",
      "cpp-unsafe-file-access",
      "unsafe-file-upload",
    ]);

  for (
    let start = 0;
    start < lines.length;
    start += 1
  ) {
    const end =
      Math.min(
        lines.length,
        start + CONTEXT_WINDOW,
      );

    const windowLines =
      lines.slice(start, end);

    const windowText =
      windowLines.join(" ");

    if (!windowText.trim()) {
      continue;
    }

    activeRules.forEach(
      (rule) => {
        if (
          !multilineRules.has(
            rule.ruleId,
          )
        ) {
          return;
        }

        if (
          !testRuleAgainstText(
            rule,
            windowText,
          )
        ) {
          return;
        }

        /*
         * Prefer the exact physical line that matches
         * the rule. This prevents a sliding context
         * window from creating findings on surrounding
         * innocent lines.
         */
        let detectedOffset =
          windowLines.findIndex(
            (candidate) =>
              candidate.trim() &&
              testRuleAgainstText(
                rule,
                candidate,
              ),
          );

        /*
         * If the vulnerability only becomes visible
         * when multiple lines are joined, anchor it to
         * the strongest security-sensitive line.
         */
        if (detectedOffset === -1) {
          detectedOffset =
            windowLines.findIndex(
              (candidate) =>
                /(command|cmd|exec|system|popen|subprocess|spawn|ProcessBuilder|builder|fopen|ifstream|ofstream|open|upload|file|path)/i.test(
                  candidate,
                ),
            );
        }

        if (detectedOffset === -1) {
          return;
        }

        const detectedLine =
          start +
          detectedOffset +
          1;

        /*
         * If PASS 1 already found this exact rule close
         * to the same construct, do not add another
         * context-generated copy.
         */
        const nearbyExisting =
          detectedIssues.some(
            (issue) =>
              issue.ruleId ===
                rule.ruleId &&
              Math.abs(
                issue.line -
                  detectedLine,
              ) <= 2,
          );

        if (nearbyExisting) {
          return;
        }

        addIssue(
          rule,
          detectedLine,
          windowLines[
            detectedOffset
          ].trim() ||
            windowText,
        );
      },
    );
  }

  /*
   * PASS 3:
   * Dedicated SQL construction detector.
   *
   * Each SQL statement is anchored to the physical
   * source line containing SELECT/INSERT/UPDATE/DELETE.
   * A short forward block is used only to determine
   * whether dynamic construction is present. We never
   * create one finding per sliding-window position.
   */
  const sqlRule =
    activeRules.find(
      (rule) =>
        rule.ruleId ===
        "sql-injection",
    );

  if (sqlRule) {
    const sqlKeyword =
      /\b(SELECT|INSERT|UPDATE|DELETE)\b/i;

    const unsafeSqlConstruction =
      /(\+\s*[a-zA-Z_$][\w$]*|\$\{[^}]+\}|%\s*[a-zA-Z_$][\w$]*|f["'][^"']*\{[^}]+\})/i;

    const sqlAnchors =
      new Set();

    for (
      let index = 0;
      index < lines.length;
      index += 1
    ) {
      const currentLine =
        lines[index];

      if (
        !sqlKeyword.test(
          currentLine,
        )
      ) {
        continue;
      }

      /*
       * Use the SQL line plus a few continuation lines.
       * Stop early at a statement terminator where
       * possible so unrelated code is not pulled into
       * the SQL finding.
       */
      const blockLines = [];

      for (
        let offset = 0;
        offset < 5 &&
        index + offset <
          lines.length;
        offset += 1
      ) {
        const candidate =
          lines[
            index + offset
          ];

        blockLines.push(
          candidate,
        );

        if (
          /[;)]\s*$/.test(
            candidate.trim(),
          ) &&
          offset > 0
        ) {
          break;
        }
      }

      const block =
        blockLines.join(" ");

      if (
        !unsafeSqlConstruction.test(
          block,
        )
      ) {
        continue;
      }

      const lineNumber =
        index + 1;

      /*
       * Avoid duplicate anchors for the same statement,
       * while still allowing separate SQL statements
       * elsewhere in the source file.
       */
      const duplicateAnchor =
        [...sqlAnchors].some(
          (existingLine) =>
            Math.abs(
              existingLine -
                lineNumber,
            ) <= 2,
        );

      if (duplicateAnchor) {
        continue;
      }

      sqlAnchors.add(
        lineNumber,
      );

      addIssue(
        sqlRule,
        lineNumber,
        currentLine.trim() ||
          block,
      );
    }
  }

  /*
   * PASS 4:
   * Consolidate overlapping scanner
   * results so one vulnerable code
   * construct does not inflate the
   * final count.
   */
  const consolidatedIssues =
    consolidateIssues(
      detectedIssues,
    );

  /*
   * Security score is based on the
   * consolidated findings rather
   * than raw duplicate matches.
   */
  const issues =
    consolidatedIssues.filter(
      (issue) =>
        (
          SEVERITY_RANK[
            issue.severity
          ] ?? 0
        ) >= minimumRank,
    );

  const securityScore =
    scoreIssues(
      issues,
    );

  const issueCount =
    countIssues(issues);

  return {
    issues,
    issueCount,
    securityScore,

    profile:
      String(profile),

    minimumSeverity:
      String(
        minimumSeverity,
      ),

    language:
      normalizedLanguage,

    scannedRuleCount:
      activeRules.length,

    scannedLineCount:
      lines.length,

    rawFindingCount:
      detectedIssues.length,

    consolidatedFindingCount:
      consolidatedIssues.length,

    displayedFindingCount:
      issues.length,

    duplicateFindingCount:
      Math.max(
        0,
        detectedIssues.length -
          consolidatedIssues.length,
      ),

    filteredFindingCount:
      Math.max(
        0,
        consolidatedIssues.length -
          issues.length,
      ),
  };
};

module.exports = {
  analyzeCodeLocally,
};
