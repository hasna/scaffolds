import { Job } from "bullmq";
import { Resend } from "resend";
import { logger } from "../lib/logger";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@example.com";

interface WelcomeEmailData {
  type: "welcome";
  to: string;
  name: string;
}

interface TeamInviteEmailData {
  type: "team-invite";
  to: string;
  inviterName: string;
  tenantName: string;
  inviteToken: string;
}

interface PasswordResetEmailData {
  type: "password-reset";
  to: string;
  resetToken: string;
}

interface SubscriptionEmailData {
  type: "subscription-created" | "subscription-cancelled" | "payment-failed";
  to: string;
  planName: string;
}

interface EmailVerificationData {
  type: "email-verification";
  to: string;
  verificationToken: string;
}

export type EmailJobData =
  | WelcomeEmailData
  | TeamInviteEmailData
  | PasswordResetEmailData
  | SubscriptionEmailData
  | EmailVerificationData;

export async function processEmailJob(job: Job<EmailJobData>) {
  const { data } = job;

  if (!resend) {
    logger.warn("Resend not configured, skipping email", { type: data.type });
    return { skipped: true };
  }

  logger.info("Processing email job", { type: data.type, to: data.to });

  try {
    switch (data.type) {
      case "welcome":
        await resend.emails.send({
          from: FROM_EMAIL,
          to: data.to,
          subject: "Welcome to Scaffold SaaS!",
          html: `
            <h1>Welcome, ${data.name}!</h1>
            <p>Thank you for signing up. We're excited to have you on board.</p>
            <p>Get started by creating your first project.</p>
          `,
        });
        break;

      case "team-invite": {
        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${data.inviteToken}`;
        await resend.emails.send({
          from: FROM_EMAIL,
          to: data.to,
          subject: `You've been invited to join ${data.tenantName}`,
          html: `
            <h1>Team Invitation</h1>
            <p>${data.inviterName} has invited you to join ${data.tenantName}.</p>
            <p><a href="${inviteUrl}">Accept Invitation</a></p>
          `,
        });
        break;
      }

      case "password-reset": {
        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${data.resetToken}`;
        await resend.emails.send({
          from: FROM_EMAIL,
          to: data.to,
          subject: "Reset your password",
          html: `
            <h1>Password Reset</h1>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetUrl}">Reset Password</a></p>
            <p>This link expires in 1 hour.</p>
          `,
        });
        break;
      }

      case "subscription-created":
        await resend.emails.send({
          from: FROM_EMAIL,
          to: data.to,
          subject: "Subscription confirmed",
          html: `
            <h1>Subscription Confirmed</h1>
            <p>Your ${data.planName} subscription is now active.</p>
          `,
        });
        break;

      case "subscription-cancelled":
        await resend.emails.send({
          from: FROM_EMAIL,
          to: data.to,
          subject: "Subscription cancelled",
          html: `
            <h1>Subscription Cancelled</h1>
            <p>Your ${data.planName} subscription has been cancelled.</p>
            <p>You'll continue to have access until the end of your billing period.</p>
          `,
        });
        break;

      case "payment-failed":
        await resend.emails.send({
          from: FROM_EMAIL,
          to: data.to,
          subject: "Payment failed",
          html: `
            <h1>Payment Failed</h1>
            <p>We couldn't process your payment for the ${data.planName} plan.</p>
            <p>Please update your payment method to avoid service interruption.</p>
          `,
        });
        break;

      case "email-verification": {
        const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${data.verificationToken}`;
        await resend.emails.send({
          from: FROM_EMAIL,
          to: data.to,
          subject: "Verify your email address",
          html: `
            <h1>Verify Your Email</h1>
            <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
            <p><a href="${verifyUrl}">Verify Email</a></p>
            <p>This link expires in 24 hours.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          `,
        });
        break;
      }
    }

    logger.info("Email sent successfully", { type: data.type, to: data.to });
    return { sent: true };
  } catch (error) {
    logger.error("Failed to send email", {
      type: data.type,
      to: data.to,
      error: String(error),
    });
    throw error;
  }
}
