import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireAuth();

  // If user already has a tenant, redirect to dashboard
  if (session.user.tenantId) {
    redirect("/dashboard");
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create your team</h1>
          <p className="text-muted-foreground text-sm">
            Set up your team to get started with the platform
          </p>
        </div>
        <OnboardingForm userId={session.user.id} />
      </div>
    </div>
  );
}
