import { Request, Response } from "express";
import { signUpSchema } from "../validators/authValidators";
import { prisma } from "../config/db";
import bcrypt from "bcryptjs";

export const signUpController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const parsed = signUpSchema.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
      return;
    }

    const { fullName, email, password } = parsed.data;

    // TODO: Check if user already exists in your database
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ success: false, message: "Email already in use" });
      return;
    }

    // TODO: Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // TODO: Save the new user to your database
    const newUser = await prisma.user.create({ data: { fullName, email, password: hashedPassword } });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: newUser,
    });
  } catch (error) {
    console.error("Sign up error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
