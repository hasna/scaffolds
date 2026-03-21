import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { requireAuth } from "@/lib/auth-utils";

const SUPPORTED_PROVIDERS = ["google", "github"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    await requireAuth();
    const { provider } = await params;

    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: "Unsupported provider" },
        { status: 400 }
      );
    }

    // Redirect to OAuth flow - the existing NextAuth handler will link the account
    // if the user is already signed in
    const callbackUrl = new URL(request.url).searchParams.get("callbackUrl") || "/dashboard/settings";
    
    await signIn(provider, { redirectTo: callbackUrl });
  } catch (error) {
    // signIn throws a redirect, which is expected
    if ((error as { digest?: string })?.digest?.includes("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Link provider error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
