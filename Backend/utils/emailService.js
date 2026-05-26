import nodemailer from "nodemailer";
import crypto from "crypto";

// Create transporter with better error handling
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error("Email credentials not configured in environment variables");
    throw new Error("Email service not configured");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Generate verification token
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Send verification email
export const sendVerificationEmail = async (email, username, token) => {
  const verificationUrl = `${
    process.env.FRONTEND_URL || "http://localhost:3000"
  }/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Med Report" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email Address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-top: 0;">Welcome ${username}!</h2>
          <p style="color: #666; line-height: 1.6;">
            Thank you for signing up. Please verify your email address to complete your registration.
          </p>
          <p style="color: #666; line-height: 1.6;">
            Click the button below to verify your email:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; padding: 14px 28px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Or copy and paste this link in your browser:
          </p>
          <p style="word-break: break-all; color: #2563eb; font-size: 14px; background-color: #f1f5f9; padding: 10px; border-radius: 4px;">
            ${verificationUrl}
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.6;">
            This link will expire in 24 hours.
          </p>
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.6;">
            If you didn't create an account, please ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
};
