const {
  GoogleGenAI,
} = require(
  "@google/genai",
);

const GEMINI_TIMEOUT_MS =
  30000;

function sleep(
  milliseconds,
) {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

function extractJSON(
  text = "",
) {
  const cleaned =
    String(text)
      .trim()
      .replace(
        /^```json\s*/i,
        "",
      )
      .replace(
        /^```\s*/i,
        "",
      )
      .replace(
        /\s*```$/i,
        "",
      )
      .trim();

  const start =
    cleaned.indexOf(
      "{",
    );

  const end =
    cleaned.lastIndexOf(
      "}",
    );

  if (
    start === -1 ||
    end <= start
  ) {
    throw new Error(
      "Gemini response did not contain valid JSON.",
    );
  }

  return JSON.parse(
    cleaned.slice(
      start,
      end + 1,
    ),
  );
}

function fallbackReview(
  message,
) {
  return {
    available:
      false,

    summary:
      "Static analysis completed, but AI suggestions are temporarily unavailable.",

    riskLevel:
      "unknown",

    priorityActions:
      [],

    detailedFindings:
      [],

    codeQualitySuggestions:
      [],

    finalChecklist:
      [],

    error:
      message,
  };
}

function normalizeSeverity(
  value,
) {
  const severity =
    String(
      value ||
        "info",
    ).toLowerCase();

  const allowed =
    [
      "critical",
      "high",
      "medium",
      "low",
      "info",
    ];

  return allowed.includes(
    severity,
  )
    ? severity
    : "info";
}

function normalizeRisk(
  value,
) {
  const risk =
    String(
      value ||
        "unknown",
    ).toLowerCase();

  const allowed = [
    "critical",
    "high",
    "medium",
    "low",
    "safe",
    "unknown",
  ];

  return allowed.includes(
    risk,
  )
    ? risk
    : "unknown";
}

function normalizeOwasp(
  value,
) {
  if (!value) {
    return {
      id:
        "Not applicable",

      category:
        "Not applicable",
    };
  }

  if (
    typeof value ===
    "string"
  ) {
    return {
      id:
        value,

      category:
        "Not applicable",
    };
  }

  return {
    id:
      String(
        value.id ||
          "Not applicable",
      ),

    category:
      String(
        value.category ||
          "Not applicable",
      ),
  };
}

/*
 * This is what makes 25k-line
 * scanning practical.
 *
 * The local scanner scans every
 * line. Gemini only receives
 * context around detected issues.
 */
function buildSecurityContext({
  code,
  issues,
  maxCharacters =
    30000,
}) {
  const lines =
    String(
      code || "",
    ).split(
      /\r?\n/,
    );

  const findings =
    Array.isArray(
      issues,
    )
      ? issues
      : [];

  const includedLines =
    new Set();

  /*
   * Include 6 lines before
   * and 6 lines after each
   * detected vulnerability.
   */
  findings.forEach(
    (issue) => {
      const lineNumber =
        Math.max(
          Number(
            issue?.line,
          ) || 1,
          1,
        );

      const index =
        lineNumber - 1;

      const start =
        Math.max(
          0,
          index - 6,
        );

      const end =
        Math.min(
          lines.length -
            1,
          index + 6,
        );

      for (
        let lineIndex =
          start;

        lineIndex <=
        end;

        lineIndex += 1
      ) {
        includedLines.add(
          lineIndex,
        );
      }
    },
  );

  /*
   * If static analysis found
   * nothing, send a representative
   * sample instead of the entire
   * massive source file.
   */
  if (
    includedLines.size ===
    0
  ) {
    const sampleSize =
      Math.min(
        lines.length,
        500,
      );

    for (
      let index = 0;

      index <
      sampleSize;

      index += 1
    ) {
      includedLines.add(
        index,
      );
    }
  }

  const sortedLines =
    [
      ...includedLines,
    ].sort(
      (a, b) =>
        a - b,
    );

  const output =
    [];

  let currentLength =
    0;

  let previousLine =
    -2;

  for (
    const lineIndex
    of sortedLines
  ) {
    if (
      lineIndex >
      previousLine + 1
    ) {
      const separator =
        "\n--- unrelated code omitted ---\n";

      if (
        currentLength +
          separator.length <
        maxCharacters
      ) {
        output.push(
          separator,
        );

        currentLength +=
          separator.length;
      }
    }

    const line =
      `${lineIndex + 1}: ${lines[lineIndex]}`;

    if (
      currentLength +
        line.length >
      maxCharacters
    ) {
      break;
    }

    output.push(
      line,
    );

    currentLength +=
      line.length + 1;

    previousLine =
      lineIndex;
  }

  return output
    .join("\n")
    .slice(
      0,
      maxCharacters,
    );
}

function getModeConfig(
  mode,
) {
  const normalized =
    String(
      mode ||
        "standard",
    ).toLowerCase();

  if (
    normalized ===
    "quick"
  ) {
    return {
      mode:
        "quick",

      maxCharacters:
        12000,

      maxOutputTokens:
        1000,

      issueLimit:
        5,

      findingLimit:
        3,
    };
  }

  if (
    normalized ===
    "detailed"
  ) {
    return {
      mode:
        "detailed",

      maxCharacters:
        35000,

      maxOutputTokens:
        3000,

      issueLimit:
        15,

      findingLimit:
        10,
    };
  }

  return {
    mode:
      "standard",

    maxCharacters:
      22000,

    maxOutputTokens:
      1900,

    issueLimit:
      10,

    findingLimit:
      6,
  };
}

function isRetryable(
  error,
) {
  const status =
    Number(
      error?.status ||
        error?.code ||
        error?.response
          ?.status,
    );

  return [
    408,
    429,
    500,
    502,
    503,
    504,
  ].includes(
    status,
  );
}

async function callGemini({
  ai,
  model,
  prompt,
  maxOutputTokens,
}) {
  let lastError;

  for (
    let attempt = 0;

    attempt < 3;

    attempt += 1
  ) {
    try {
      const result =
        await ai.models
          .generateContent({
            model,

            contents:
              prompt,

            config: {
              temperature:
                0.15,

              maxOutputTokens,

              responseMimeType:
                "application/json",
            },
          });

      return extractJSON(
        result?.text ||
          "",
      );
    } catch (error) {
      lastError =
        error;

      if (
        !isRetryable(
          error,
        ) ||
        attempt ===
          2
      ) {
        throw error;
      }

      await sleep(
        700 *
          2 ** attempt,
      );
    }
  }

  throw lastError;
}

async function generateGeminiReview({
  language,
  fileName,
  code,

  securityScore,
  issueCount,
  issues,

  mode =
    "standard",

  secureCodeExamples =
    true,

  showOwasp =
    true,

  showCwe =
    true,
}) {
  const apiKey =
    process.env
      .GEMINI_API_KEY;

  if (!apiKey) {
    return fallbackReview(
      "GEMINI_API_KEY is missing.",
    );
  }

  const model =
    String(
      process.env
        .GEMINI_MODEL ||
        "gemini-2.5-flash",
    )
      .trim()
      .replace(
        /^models\//,
        "",
      );

  const config =
    getModeConfig(
      mode,
    );

  const safeIssues =
    Array.isArray(
      issues,
    )
      ? issues.slice(
          0,
          config.issueLimit,
        )
      : [];

  /*
   * Important:
   * this can include findings from
   * line 1 all the way to line
   * 25,000.
   */
  const securityContext =
    buildSecurityContext({
      code,

      issues:
        safeIssues,

      maxCharacters:
        config.maxCharacters,
    });

  const totalLines =
    String(
      code || "",
    ).split(
      /\r?\n/,
    ).length;

  const secureExampleInstruction =
    secureCodeExamples
      ? "Provide a concise secureExample for reference. Also provide an exact remediationPatch only when you can identify the exact original source lines from the supplied context. The patch must preserve program behavior except for the security remediation. Never invent surrounding code."
      : 'Always return secureExample as an empty string.';

  const owaspInstruction =
    showOwasp
      ? "Provide OWASP mapping only when justified."
      : 'Always return owasp as {"id":"Not applicable","category":"Not applicable"}.';

  const cweInstruction =
    showCwe
      ? "Provide an appropriate CWE identifier when justified."
      : 'Always return cwe as "Not applicable".';

  const prompt = `
You are CodeGuard AI, a senior application-security engineer.

Analyse the security-relevant source-code excerpts below.

The complete file contains ${totalLines} lines.

The complete file has already been scanned by CodeGuard's local static-analysis engine.

The excerpts contain context around vulnerabilities detected anywhere in that file.

Review mode:
${config.mode}

Rules:
- Do not invent vulnerabilities.
- Use the static findings as evidence.
- Preserve the original line numbers.
- Give defensive remediation advice.
- Do not provide destructive exploitation instructions.
- Return ONLY valid JSON.
- Do not wrap the JSON in markdown.
- secureExample is reference-only and must never be described as an automatically verified patch.
- remediationPatch.originalSnippet must exactly match source text visible in SECURITY-RELEVANT SOURCE CONTEXT.
- remediationPatch.startLine and endLine must match the numbered source context.
- If an exact safe replacement cannot be produced from the supplied context, set remediationPatch.available to false and return empty originalSnippet and replacementCode.
- Do not introduce eval, shell execution, unsafe deserialization, string-built SQL, hardcoded secrets, disabled TLS verification, unsafe DOM sinks, or weaker cryptography in remediationPatch.replacementCode.

${secureExampleInstruction}

${owaspInstruction}

${cweInstruction}

Return this structure:

{
  "summary": "Overall security summary",
  "riskLevel": "critical | high | medium | low | safe",
  "priorityActions": [
    "action"
  ],
  "detailedFindings": [
    {
      "title": "Finding title",
      "severity": "critical | high | medium | low | info",
      "line": 1,
      "explanation": "Why the code is risky",
      "impact": "Potential security impact",
      "recommendation": "How to fix it",
      "secureExample": "Corrected defensive reference example",
      "remediationPatch": {
        "available": true,
        "startLine": 1,
        "endLine": 1,
        "originalSnippet": "Exact original source text from startLine through endLine",
        "replacementCode": "Exact replacement source text",
        "reason": "Why this exact replacement remediates the finding"
      },
      "owasp": {
        "id": "OWASP identifier",
        "category": "OWASP category"
      },
      "cwe": "CWE identifier"
    }
  ],
  "codeQualitySuggestions": [
    "suggestion"
  ],
  "finalChecklist": [
    "item"
  ]
}

Maximum detailed findings:
${config.findingLimit}

FILE:
${fileName}

LANGUAGE:
${language}

STATIC SECURITY SCORE:
${securityScore}/100

STATIC ISSUE COUNTS:
${JSON.stringify(
  issueCount,
)}

STATIC FINDINGS:
${JSON.stringify(
  safeIssues,
)}

SECURITY-RELEVANT SOURCE CONTEXT:

${securityContext}
`;

  const ai =
    new GoogleGenAI({
      apiKey,
    });

  let timeoutId;

  try {
    const geminiPromise =
      callGemini({
        ai,

        model,

        prompt,

        maxOutputTokens:
          config
            .maxOutputTokens,
      });

    const timeoutPromise =
      new Promise(
        (
          resolve,
          reject,
        ) => {
          timeoutId =
            setTimeout(
              () => {
                reject(
                  new Error(
                    "AI review exceeded the 30 second limit.",
                  ),
                );
              },
              GEMINI_TIMEOUT_MS,
            );
        },
      );

    const parsed =
      await Promise.race([
        geminiPromise,
        timeoutPromise,
      ]);

    const detailedFindings =
      Array.isArray(
        parsed
          ?.detailedFindings,
      )
        ? parsed.detailedFindings
            .slice(
              0,
              config.findingLimit,
            )
            .map(
              (
                finding,
                index,
              ) => ({
                title:
                  String(
                    finding
                      ?.title ||
                      `Finding ${index + 1}`,
                  ),

                severity:
                  normalizeSeverity(
                    finding
                      ?.severity,
                  ),

                line:
                  Math.max(
                    Number(
                      finding
                        ?.line,
                    ) || 1,
                    1,
                  ),

                explanation:
                  String(
                    finding
                      ?.explanation ||
                      "",
                  ),

                impact:
                  String(
                    finding
                      ?.impact ||
                      "",
                  ),

                recommendation:
                  String(
                    finding
                      ?.recommendation ||
                      "",
                  ),

                secureExample:
                  secureCodeExamples
                    ? String(
                        finding
                          ?.secureExample ||
                          "",
                      )
                    : "",

                remediationPatch:
                  secureCodeExamples &&
                  finding?.remediationPatch &&
                  finding.remediationPatch.available === true
                    ? {
                        available: true,
                        startLine: Math.max(
                          Number(finding.remediationPatch.startLine) ||
                            Number(finding?.line) ||
                            1,
                          1,
                        ),
                        endLine: Math.max(
                          Number(finding.remediationPatch.endLine) ||
                            Number(finding.remediationPatch.startLine) ||
                            Number(finding?.line) ||
                            1,
                          1,
                        ),
                        originalSnippet: String(
                          finding.remediationPatch.originalSnippet ||
                            "",
                        ),
                        replacementCode: String(
                          finding.remediationPatch.replacementCode ||
                            "",
                        ),
                        reason: String(
                          finding.remediationPatch.reason ||
                            "",
                        ),
                      }
                    : {
                        available: false,
                        startLine: Math.max(
                          Number(finding?.line) || 1,
                          1,
                        ),
                        endLine: Math.max(
                          Number(finding?.line) || 1,
                          1,
                        ),
                        originalSnippet: "",
                        replacementCode: "",
                        reason: "",
                      },

                owasp:
                  showOwasp
                    ? normalizeOwasp(
                        finding
                          ?.owasp,
                      )
                    : {
                        id:
                          "Not applicable",

                        category:
                          "Not applicable",
                      },

                cwe:
                  showCwe
                    ? String(
                        finding
                          ?.cwe ||
                          "Not applicable",
                      )
                    : "Not applicable",
              }),
            )
        : [];

    return {
      available:
        true,

      summary:
        String(
          parsed?.summary ||
            "AI security review completed.",
        ),

      riskLevel:
        normalizeRisk(
          parsed?.riskLevel,
        ),

      priorityActions:
        Array.isArray(
          parsed
            ?.priorityActions,
        )
          ? parsed
              .priorityActions
              .slice(
                0,
                config.mode ===
                  "detailed"
                  ? 8
                  : 4,
              )
              .map(
                String,
              )
          : [],

      detailedFindings,

      codeQualitySuggestions:
        Array.isArray(
          parsed
            ?.codeQualitySuggestions,
        )
          ? parsed
              .codeQualitySuggestions
              .slice(
                0,
                config.mode ===
                  "detailed"
                  ? 8
                  : 4,
              )
              .map(
                String,
              )
          : [],

      finalChecklist:
        Array.isArray(
          parsed
            ?.finalChecklist,
        )
          ? parsed
              .finalChecklist
              .slice(
                0,
                config.mode ===
                  "detailed"
                  ? 8
                  : 5,
              )
              .map(
                String,
              )
          : [],

      error:
        null,
    };
  } catch (error) {
    console.error(
      "Gemini review generation failed:",
      error.message,
    );

    return fallbackReview(
      error.message,
    );
  } finally {
    if (timeoutId) {
      clearTimeout(
        timeoutId,
      );
    }
  }
}

module.exports = {
  generateGeminiReview,
};