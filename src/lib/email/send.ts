import { createTransport } from "nodemailer";
import { render } from "@react-email/render";
import { randomBytes } from "crypto";
import { adminDb } from "@/lib/db";
import {
  emailVerificationTokens,
  passwordResetTokens,
} from "@/lib/db/schema/auth";
import { VerificationEmail } from "./templates/verification";
import { PasswordResetEmail } from "./templates/password-reset";

// Lazy-initialize SMTP transport
let _transport: ReturnType<typeof createTransport> | null = null;
export function getTransport() {
  if (!_transport) {
    _transport = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "ssl",
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return _transport;
}

export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "1on1 <noreply@example.com>";
}

export async function sendVerificationEmail(
  email: string,
  userId: string,
  baseUrl?: string
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await adminDb.insert(emailVerificationTokens).values({
    userId,
    token,
    expiresAt,
  });

  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${appUrl}/verify-email?token=${token}`;
  const html = await render(
    VerificationEmail({
      verifyUrl,
      // TODO(13-03): replace with createEmailTranslator
      heading: "Verify your email",
      body: "Thanks for signing up. Please verify your email address by clicking the button below.",
      buttonLabel: "Verify Email Address",
      footer: "If you did not create an account, you can safely ignore this email. This link expires in 24 hours.",
    })
  );

  await getTransport().sendMail({
    from: getEmailFrom(),
    to: email,
    subject: "Verify your email address",
    html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  userId: string,
  baseUrl?: string
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await adminDb.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });

  const appUrl = baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;
  const html = await render(
    PasswordResetEmail({
      resetUrl,
      // TODO(13-03): replace with createEmailTranslator
      heading: "Reset your password",
      body: "We received a request to reset your password. Click the button below to choose a new one.",
      buttonLabel: "Reset Password",
      footer: "This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.",
    })
  );

  await getTransport().sendMail({
    from: getEmailFrom(),
    to: email,
    subject: "Reset your password",
    html,
  });
}
