import { User } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import {
  generateVerificationToken,
  sendVerificationEmail,
} from "../utils/emailService.js";

export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      username,
      email,
      password,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: tokenExpiry,
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, username, verificationToken);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Delete the user if email fails
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        message: "Failed to send verification email. Please try again.",
      });
    }

    // Don't create a session token yet - user must verify first
    res.status(201).json({
      message:
        "User registered successfully. Please check your email to verify your account.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: false,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res
        .status(400)
        .json({ message: "Verification token is required" });
    }

    // First check if user exists with this token (even if expired)
    const user = await User.findOne({
      emailVerificationToken: token,
    });

    // If no user found with this token, check if already verified
    if (!user) {
      // Check if there's a user who had this token but already verified
      const verifiedUser = await User.findOne({
        isEmailVerified: true,
        emailVerificationToken: { $exists: false },
      });

      // If we can't find the user, token is invalid
      return res.status(400).json({
        message: "Invalid verification token or email already verified",
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(200).json({
        message: "Your email is already verified. You can login now.",
      });
    }

    // Check if token is expired
    if (user.emailVerificationExpires < Date.now()) {
      return res.status(400).json({
        message: "Verification link has expired. Please request a new one.",
      });
    }

    // Verify the email
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res
      .status(200)
      .json({ message: "Email verified successfully. You can now login." });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = tokenExpiry;
    await user.save();

    // Send verification email
    await sendVerificationEmail(email, user.username, verificationToken);

    res.status(200).json({
      message: "Verification email sent successfully. Please check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Failed to resend verification email" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        message:
          "Please verify your email before logging in. Check your inbox for the verification link.",
      });
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1d",
    });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
