"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Unlink, Check, AlertCircle } from "lucide-react";
import { z } from "zod";

interface LinkedAccount {
  provider: string;
  providerAccountId: string;
  email?: string;
  linkedAt: string;
}

const linkedAccountSchema = z.object({
  provider: z.string(),
  providerAccountId: z.string(),
  email: z.string().optional(),
  linkedAt: z.string(),
});

const linkedAccountsResponseSchema = z.object({
  accounts: z.array(linkedAccountSchema).optional(),
});

const errorResponseSchema = z.object({
  error: z.string().optional(),
});

const PROVIDERS = [
  {
    id: "google",
    name: "Google",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
    color: "bg-white hover:bg-gray-50 text-gray-900 border",
  },
  {
    id: "github",
    name: "GitHub",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    color: "bg-gray-900 hover:bg-gray-800 text-white",
  },
];

export default function AccountLinkingPage() {
  const { data: session } = useSession();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void fetchLinkedAccounts();
  }, []);

  async function fetchLinkedAccounts() {
    try {
      const response = await fetch("/api/auth/linked-accounts");
      if (response.ok) {
        const data = linkedAccountsResponseSchema.parse(await response.json());
        setLinkedAccounts(data.accounts ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch linked accounts:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleLink(provider: string) {
    setActionLoading(provider);
    setError(null);

    try {
      // Redirect to OAuth provider for linking
      window.location.href = `/api/auth/link/${provider}`;
    } catch {
      setError(`Failed to link ${provider} account`);
      setActionLoading(null);
    }
  }

  async function handleUnlink(provider: string) {
    // Prevent unlinking if it's the only auth method
    if (linkedAccounts.length <= 1 && !session?.user?.email) {
      setError("Cannot unlink your only authentication method");
      return;
    }

    setActionLoading(provider);
    setError(null);

    try {
      const response = await fetch(`/api/auth/linked-accounts/${provider}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = errorResponseSchema.parse(await response.json());
        throw new Error(data.error ?? "Failed to unlink account");
      }

      setLinkedAccounts((prev) => prev.filter((a) => a.provider !== provider));
      setSuccess(`${provider} account unlinked successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unlink account";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  }

  function isLinked(provider: string) {
    return linkedAccounts.some((a) => a.provider === provider);
  }

  function getLinkedAccount(provider: string) {
    return linkedAccounts.find((a) => a.provider === provider);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Link2 className="text-primary h-6 w-6" />
          </div>
          <CardTitle>Linked Accounts</CardTitle>
          <CardDescription>Connect additional accounts for easier sign-in</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-3 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-600">
              <Check className="h-4 w-4" />
              {success}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {PROVIDERS.map((provider) => {
                const linked = isLinked(provider.id);
                const account = getLinkedAccount(provider.id);

                return (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-md p-2 ${provider.color}`}>{provider.icon}</div>
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        {linked && account?.email && (
                          <p className="text-muted-foreground text-sm">{account.email}</p>
                        )}
                      </div>
                    </div>

                    {linked ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <Check className="mr-1 h-3 w-3" />
                          Linked
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlink(provider.id)}
                          disabled={actionLoading === provider.id}
                        >
                          {actionLoading === provider.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Unlink className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLink(provider.id)}
                        disabled={actionLoading === provider.id}
                      >
                        {actionLoading === provider.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Link2 className="mr-2 h-4 w-4" />
                        )}
                        Link
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4">
            <Button variant="outline" className="w-full" onClick={() => window.history.back()}>
              Back to Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
