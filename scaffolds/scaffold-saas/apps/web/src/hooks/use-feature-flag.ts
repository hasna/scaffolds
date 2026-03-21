"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface FeatureFlagState {
  enabled: boolean;
  limits?: Record<string, number>;
  loading: boolean;
}

interface FeatureFlagsCache {
  flags: Record<string, FeatureFlagState>;
  timestamp: number;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

let flagsCache: FeatureFlagsCache | null = null;

export function useFeatureFlag(flagKey: string): FeatureFlagState {
  const { data: session } = useSession();
  const [state, setState] = useState<FeatureFlagState>({
    enabled: false,
    limits: undefined,
    loading: true,
  });

  useEffect(() => {
    if (!session?.user?.tenantId) {
      setState({ enabled: false, limits: undefined, loading: false });
      return;
    }

    // Check cache first
    if (flagsCache && Date.now() - flagsCache.timestamp < CACHE_DURATION) {
      const cached = flagsCache.flags[flagKey];
      if (cached) {
        setState({ ...cached, loading: false });
        return;
      }
    }

    // Fetch from API
    fetchFeatureFlags(session.user.tenantId).then((flags) => {
      const flag = flags[flagKey];
      setState({
        enabled: flag?.enabled ?? false,
        limits: flag?.limits,
        loading: false,
      });
    });
  }, [flagKey, session?.user?.tenantId]);

  return state;
}

export function useFeatureFlags(): {
  flags: Record<string, FeatureFlagState>;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { data: session } = useSession();
  const [flags, setFlags] = useState<Record<string, FeatureFlagState>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.user?.tenantId) return;

    setLoading(true);
    flagsCache = null; // Clear cache
    const newFlags = await fetchFeatureFlags(session.user.tenantId);
    setFlags(newFlags);
    setLoading(false);
  }, [session?.user?.tenantId]);

  useEffect(() => {
    if (!session?.user?.tenantId) {
      setFlags({});
      setLoading(false);
      return;
    }

    fetchFeatureFlags(session.user.tenantId).then((newFlags) => {
      setFlags(newFlags);
      setLoading(false);
    });
  }, [session?.user?.tenantId]);

  return { flags, loading, refresh };
}

async function fetchFeatureFlags(
  _tenantId: string
): Promise<Record<string, FeatureFlagState>> {
  try {
    const response = await fetch("/api/v1/feature-flags");
    if (!response.ok) throw new Error("Failed to fetch feature flags");

    const data = await response.json();
    const flags: Record<string, FeatureFlagState> = {};

    for (const flag of data.data || []) {
      flags[flag.key] = {
        enabled: flag.enabled,
        limits: flag.limits,
        loading: false,
      };
    }

    // Update cache
    flagsCache = {
      flags,
      timestamp: Date.now(),
    };

    return flags;
  } catch (error) {
    console.error("Failed to fetch feature flags:", error);
    return {};
  }
}

// Helper to check if a feature is enabled (for server-side use)
export async function isFeatureEnabled(
  tenantId: string,
  flagKey: string
): Promise<boolean> {
  const flags = await fetchFeatureFlags(tenantId);
  return flags[flagKey]?.enabled ?? false;
}

// Helper to get feature limit
export function useFeatureLimit(
  flagKey: string,
  limitKey: string
): number | undefined {
  const { limits } = useFeatureFlag(flagKey);
  return limits?.[limitKey];
}

// Common feature flag keys
export const FEATURE_FLAGS = {
  AI_ASSISTANT: "ai_assistant",
  WEBHOOKS: "webhooks",
  API_ACCESS: "api_access",
  TEAM_MEMBERS: "team_members",
  CUSTOM_BRANDING: "custom_branding",
  PRIORITY_SUPPORT: "priority_support",
  ADVANCED_ANALYTICS: "advanced_analytics",
  SSO: "sso",
  AUDIT_LOGS: "audit_logs",
  DATA_EXPORT: "data_export",
} as const;
