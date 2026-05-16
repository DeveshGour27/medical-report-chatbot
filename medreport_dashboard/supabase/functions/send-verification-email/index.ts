import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  // ✅ CORS preflight
  if (req?.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*", // DO NOT CHANGE THIS
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*" // DO NOT CHANGE THIS
      }
    });
  }
  
  try {
    const { email, username, verificationUrl } = await req?.json();

    // Validate required fields
    if (!email || !verificationUrl) {
      throw new Error("Email and verification URL are required");
    }

    // Send verification email using Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${globalThis.Deno?.env?.get("RESEND_API_KEY")}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [email],
        subject: "Verify Your Email Address",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
            <p>Hello ${username || 'there'},</p>
            <p>Thank you for signing up! Please click the button below to verify your email address and activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p>If the button above does not work, you can copy and paste the following link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
            <p>This verification link will expire in 24 hours for security reasons.</p>
            <p>If you did not create this account, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 14px;">Best regards,<br>Your App Team</p>
          </div>
        `,
      }),
    });

    if (!resendResponse?.ok) {
      const errorData = await resendResponse?.json();
      throw new Error(`Failed to send email: ${errorData.message || 'Unknown error'}`);
    }

    const resendData = await resendResponse?.json();

    return new Response(JSON.stringify({
      success: true,
      message: "Verification email sent successfully",
      emailId: resendData.id
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // DO NOT CHANGE THIS
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" // DO NOT CHANGE THIS
      }
    });
  }
});