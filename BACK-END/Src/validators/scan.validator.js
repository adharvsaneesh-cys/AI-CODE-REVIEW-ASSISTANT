const { z } = require("zod");

const objectIdPattern =
  /^[a-f\d]{24}$/i;

/*
 * Normal CodeGuard source limit:
 * 25,000 lines.
 *
 * Backend has 100 lines of headroom
 * because secured code may require
 * imports / remediation scaffolding.
 */
const MAX_CODE_LINES =
  25100;

const MAX_CODE_CHARACTERS =
  5 * 1024 * 1024;

function countLines(
  code = "",
) {
  const text =
    String(code || "");

  if (!text) {
    return 0;
  }

  const normalized =
    text.replace(
      /\r\n/g,
      "\n",
    );

  const lines =
    normalized.split(
      "\n",
    );

  /*
   * Ignore final empty element caused
   * by a normal trailing newline.
   */
  while (
    lines.length > 1 &&
    lines[
      lines.length - 1
    ] === ""
  ) {
    lines.pop();
  }

  return lines.length;
}

const pasteCodeScanSchema =
  z.object({
    body: z.object({
      projectId: z
        .string()
        .regex(
          objectIdPattern,
          "Invalid project ID",
        ),

      code: z
        .string()
        .min(
          1,
          "Source code is required",
        )
        .max(
          MAX_CODE_CHARACTERS,
          "Source code exceeds the 5 MB limit",
        )
        .refine(
          (value) =>
            countLines(
              value,
            ) <=
            MAX_CODE_LINES,
          {
            message:
              "Secured source exceeds the 25,100 line backend limit",
          },
        ),

      language: z.enum([
        "python",
        "javascript",
        "typescript",
        "java",
        "c",
        "cpp",
        "go",
        "php",
        "ruby",
        "rust",
      ]),

      fileName: z
        .string()
        .trim()
        .min(
          1,
          "File name is required",
        )
        .max(
          150,
          "File name is too long",
        )
        .optional()
        .default(
          "pasted-code",
        ),
    }),
  });

const scanIdSchema =
  z.object({
    params: z.object({
      scanId: z
        .string()
        .regex(
          objectIdPattern,
          "Invalid scan ID",
        ),
    }),
  });

const projectScanListSchema =
  z.object({
    params: z.object({
      projectId: z
        .string()
        .regex(
          objectIdPattern,
          "Invalid project ID",
        ),
    }),
  });

module.exports = {
  pasteCodeScanSchema,
  scanIdSchema,
  projectScanListSchema,
};