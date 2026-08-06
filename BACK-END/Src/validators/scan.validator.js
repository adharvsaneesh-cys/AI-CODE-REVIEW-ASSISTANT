const { z } = require("zod");

const objectIdPattern = /^[a-f\d]{24}$/i;

const pasteCodeScanSchema = z.object({
  body: z.object({
    projectId: z
      .string()
      .regex(objectIdPattern, "Invalid project ID"),

    code: z
      .string()
      .min(1, "Source code is required")
      .max(100000, "Source code is too large"),

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
      .min(1)
      .max(150)
      .optional()
      .default("pasted-code"),
  }),
});

const scanIdSchema = z.object({
  params: z.object({
    scanId: z
      .string()
      .regex(objectIdPattern, "Invalid scan ID"),
  }),
});

const projectScanListSchema = z.object({
  params: z.object({
    projectId: z
      .string()
      .regex(objectIdPattern, "Invalid project ID"),
  }),
});

module.exports = {
  pasteCodeScanSchema,
  scanIdSchema,
  projectScanListSchema,
};