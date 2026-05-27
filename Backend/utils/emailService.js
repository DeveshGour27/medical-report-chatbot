import nodemailer from "nodemailer";
import { google } from "googleapis";
import crypto from "crypto";

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Generate verification token
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Send verification email
export const sendVerificationEmail = async (
  email,
  username,
  token
) => {
  try {
    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",

      auth: {
        type: "OAuth2",

        user: process.env.EMAIL_USER,

        clientId: process.env.GOOGLE_CLIENT_ID,

        clientSecret: process.env.GOOGLE_CLIENT_SECRET,

        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,

        accessToken: accessToken.token,
      },
    });

    const verificationUrl = `${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }/verify-email?token=${token}`;

    const mailOptions = {
      from: `MedReport <${process.env.EMAIL_USER}>`,

      to: email,

      subject: "Verify Your Email Address",

      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">

          <h2 style="color: #333; margin-top: 0;">
            Welcome ${username}!
          </h2>

          <p style="color: #666; line-height: 1.6;">
            Thank you for signing up. Please verify your email address to complete your registration.
          </p>

          <p style="color: #666; line-height: 1.6;">
            Click the button below to verify your email:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="
                 display: inline-block;
                 padding: 14px 28px;
                 background-color: #2563eb;
                 color: white;
                 text-decoration: none;
                 border-radius: 6px;
                 font-weight: 600;
               ">
              Verify Email Address
            </a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Or copy and paste this link in your browser:
          </p>

          <p style="
               word-break: break-all;
               color: #2563eb;
               font-size: 14px;
               background-color: #f1f5f9;
               padding: 10px;
               border-radius: 4px;
             ">
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

    const info = await transporter.sendMail(mailOptions);

    console.log("Verification email sent:", info.messageId);

    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);

    throw new Error(
      `Failed to send verification email: ${error.message}`
    );
  }
};