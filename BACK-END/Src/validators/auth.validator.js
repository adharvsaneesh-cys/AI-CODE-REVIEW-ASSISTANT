const { z } = require("zod");

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain a special character",
  );

const registerSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must contain at least 2 characters")
      .max(80, "Full name cannot exceed 80 characters"),

    email: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .transform((email) => email.toLowerCase()),

    password: strongPassword,
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .transform((email) => email.toLowerCase()),

    password: z
      .string()
      .min(1, "Password is required")
      .max(128, "Password is too long"),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
};