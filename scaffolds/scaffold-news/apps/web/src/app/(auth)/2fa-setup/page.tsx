"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Smartphone, Copy, Check } from "lucide-react";
import { z } from "zod";

const setupResponseSchema = z.object({
  qrCode: z.string().nullable().optional(),
  secret: z.string().nullable().optional(),
  error: z.string().optional(),
});

const verifyResponseSchema = z.object({
  backupCodes: z.array(z.string()).optional(),
  error: z.string().optional(),
});

type SetupResponse = z.infer<typeof setupResponseSchema>;
type VerifyResponse = z.infer<typeof verifyResponseSchema>;

export default function TwoFactorSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "setup" | "verify" | "backup">("intro");
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSetup() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to setup 2FA");

      const data: SetupResponse = setupResponseSchema.parse(await response.json());
      setQrCode(data.qrCode ?? null);
      setSecret(data.secret ?? null);
      setStep("setup");
    } catch {
      setError("Failed to initialize 2FA setup. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode }),
      });

      if (!response.ok) {
        const data: VerifyResponse = verifyResponseSchema.parse(await response.json());
        throw new Error(data.error ?? "Invalid code");
      }

      const data: VerifyResponse = verifyResponseSchema.parse(await response.json());
      setBackupCodes(data.backupCodes ?? []);
      setStep("backup");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function copySecret() {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function copyBackupCodes() {
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleComplete() {
    router.push("/dashboard/settings");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Shield className="text-primary h-6 w-6" />
          </div>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            {step === "intro" && "Add an extra layer of security to your account"}
            {step === "setup" && "Scan the QR code with your authenticator app"}
            {step === "verify" && "Enter the code from your authenticator app"}
            {step === "backup" && "Save your backup codes"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="bg-destructive/10 text-destructive mb-4 rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          {step === "intro" && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Smartphone className="text-muted-foreground mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-medium">Authenticator App Required</p>
                    <p className="text-muted-foreground text-sm">
                      You&apos;ll need an authenticator app like Google Authenticator, Authy, or
                      1Password.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleSetup} className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Get Started
              </Button>
            </div>
          )}

          {step === "setup" && (
            <div className="space-y-4">
              {qrCode && (
                <div className="flex justify-center">
                  <div className="rounded-lg border bg-white p-4">
                    <img src={qrCode} alt="QR Code" className="h-48 w-48" />
                  </div>
                </div>
              )}

              {secret && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm">
                    Or enter this code manually:
                  </Label>
                  <div className="flex gap-2">
                    <Input value={secret} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={copySecret}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <Button onClick={() => setStep("verify")} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>

              <Button onClick={handleVerify} className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Enable
              </Button>

              <Button variant="ghost" className="w-full" onClick={() => setStep("setup")}>
                Back
              </Button>
            </div>
          )}

          {step === "backup" && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg border p-4">
                <p className="text-muted-foreground mb-3 text-sm">
                  Save these backup codes in a safe place. Each code can only be used once.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <code key={i} className="bg-background rounded px-2 py-1 font-mono text-sm">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={copyBackupCodes}>
                {copied ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Backup Codes
                  </>
                )}
              </Button>

              <Button onClick={handleComplete} className="w-full">
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
