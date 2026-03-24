import z from "zod";

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full name is required")
      .regex(/^[^\d]+$/, "Full name must not contain numbers")
      .refine((val) => val.trim().split(/\s+/).length >= 2, {
        message: "Full name must contain a minimum of two words",
      }),

    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),

    password: z.string().min(6, "Password must be at least 6 characters long"),

    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;
