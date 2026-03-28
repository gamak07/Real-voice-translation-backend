import crypto from "crypto";
import { Request, Response } from "express";
import { loginSchema, signUpSchema } from "../validators/authValidators";
import { prisma } from "../config/db";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "../utils/mailer";
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from "../utils/generateToken";

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

    // check existing user
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ success: false, message: "Email already in use" });
      return;
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token and expiry
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // save new user to database
    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        verifyToken,
        verifyTokenExpiry,
      },
    });

    // send confirmation mail
    await sendVerificationEmail(email, fullName, verifyToken);

    const {
      password: _password,
      verifyToken: _token,
      verifyTokenExpiry: _expiry,
      ...safeUser
    } = newUser;

    res.status(201).json({
      success: true,
      message:
        "Account created successfully. Please check your email to verify your account.",
      data: safeUser,
    });
  } catch (error) {
    console.error("Sign up error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const loginController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
      return;
    }

    const { email, password } = parsed.data;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Check if email is verified
    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        message: "Please verify your email before logging in",
      });
      return;
    }

    // Check if password matches
    const isPasswordValid = await bcrypt.compare(password, user.password!);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Generate access and refresh tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Set tokens as HttpOnly cookies
    setAuthCookies(res, accessToken, refreshToken);

    const {
      password: _password,
      verifyToken: _token,
      verifyTokenExpiry: _expiry,
      resetToken: _reset,
      resetTokenExpiry: _resetExpiry,
      ...safeUser
    } = user;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// verify email

export const verifyEmailController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.query;

    // Check if token is present
    if (!token || typeof token !== "string") {
      res.status(400).json({
        success: false,
        message: "Verification token is missing or invalid",
      });
      return;
    }

    // Find user with this token
    const user = await prisma.user.findFirst({
      where: {
        verifyToken: token,
        verifyTokenExpiry: { gt: new Date() }, 
      },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Verification token is invalid or has expired",
      });
      return;
    }

    // Mark user as verified and clear the token fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verifyToken: null,
        verifyTokenExpiry: null,
      },
    });

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


// o auth

export const oauthCallbackController = (req: Request, res: Response): void => {
  try {
    const user = req.user as any;

    if (!user) {
      res.redirect(`${process.env.CLIENT_URL}/login?error=OAuth authentication failed`);
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Set HttpOnly cookies
    setAuthCookies(res, accessToken, refreshToken);

    // Redirect to frontend dashboard
    res.redirect(`${process.env.CLIENT_URL}`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect(`${process.env.CLIENT_URL}/login?error=Something went wrong`);
  }
};
