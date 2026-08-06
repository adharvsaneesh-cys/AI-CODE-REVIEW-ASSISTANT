const { z } = require("zod");

const objectIdPattern = /^[a-f\d]{24}$/i;

const projectIdSchema = z.object({
  params: z.object({
    projectId: z
      .string()
      .regex(objectIdPattern, "Invalid project ID"),
  }),
});

const createProjectSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must contain at least 2 characters")
      .max(100, "Project name cannot exceed 100 characters"),

    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional()
      .default(""),

    primaryLanguage: z
      .string()
      .trim()
      .max(40, "Language name is too long")
      .optional()
      .default("unknown"),

    sourceType: z
      .enum(["paste", "file", "zip", "repository"])
      .optional()
      .default("paste"),

    repositoryUrl: z
      .string()
      .trim()
      .url("Enter a valid repository URL")
      .nullable()
      .optional(),
  }),
});

const updateProjectSchema = z.object({
  params: z.object({
    projectId: z
      .string()
      .regex(objectIdPattern, "Invalid project ID"),
  }),

  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, "Project name must contain at least 2 characters")
        .max(100, "Project name cannot exceed 100 characters")
        .optional(),

      description: z
        .string()
        .trim()
        .max(500, "Description cannot exceed 500 characters")
        .optional(),

      primaryLanguage: z
        .string()
        .trim()
        .max(40, "Language name is too long")
        .optional(),

      sourceType: z
        .enum(["paste", "file", "zip", "repository"])
        .optional(),

      repositoryUrl: z
        .string()
        .trim()
        .url("Enter a valid repository URL")
        .nullable()
        .optional(),
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      "Provide at least one field to update",
    ),
});

module.exports = {
  projectIdSchema,
  createProjectSchema,
  updateProjectSchema,
};