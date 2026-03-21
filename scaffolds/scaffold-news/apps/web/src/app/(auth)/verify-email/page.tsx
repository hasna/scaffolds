"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">(
    token ? "loading" : "no-token"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    async function verifyEmail() {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || "Your email has been verified!");
          setTimeout(() => {
            router.push("/login?verified=true");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed");
        }
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    }

    verifyEmail();
  }, [token, router]);

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Email Verification</CardTitle>
        <CardDescription>
          {status === "loading" && "Verifying your email..."}
          {status === "success" && "Verification successful!"}
          {status === "error" && "Verification failed"}
          {status === "no-token" && "Check your email"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8">
        {status === "loading" && <Loader2 className="text-primary h-16 w-16 animate-spin" />}
        {status === "success" && <CheckCircle className="h-16 w-16 text-green-500" />}
        {status === "error" && <XCircle className="text-destructive h-16 w-16" />}
        {status === "no-token" && <Mail className="text-muted-foreground h-16 w-16" />}
        <p className="text-muted-foreground mt-4 text-center">
          {message ||
            (status === "no-token" &&
              "We sent you a verification email. Please click the link in the email to verify your account.")}
        </p>
        {status === "success" && (
          <p className="text-muted-foreground mt-2 text-sm">Redirecting to login...</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        {status === "error" && (
          <div className="flex w-full flex-col gap-2">
            <Button asChild className="w-full">
              <Link href="/register">Try Again</Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/login">Back to Login</Link>
            </Button>
          </div>
        )}
        {status === "no-token" && (
          <Button asChild className="w-full">
            <Link href="/login">Back to Login</Link>
          </Button>
        )}
        {status === "success" && (
          <Button asChild className="w-full">
            <Link href="/login">Go to Login</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function LoadingCard() {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Email Verification</CardTitle>
        <CardDescription>Loading...</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8">
        <Loader2 className="text-primary h-16 w-16 animate-spin" />
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
