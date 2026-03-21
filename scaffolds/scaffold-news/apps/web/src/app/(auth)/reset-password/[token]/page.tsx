import { db } from "@scaffold-news/database/client";
import { eq, gt } from "drizzle-orm";
import { ResetPasswordForm } from "./reset-password-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ResetPasswordPage({ params }: PageProps) {
  const { token } = await params;

  const resetToken = await db.query.passwordResetTokens.findFirst({
    where: (t, { and }) =>
      and(eq(t.token, token), gt(t.expiresAt, new Date())),
  });

  if (!resetToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invalid Link</h1>
          <p className="mt-2 text-muted-foreground">
            This password reset link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
