/**
 * Rate limiting specifically for authentication endpoints
 * Provides stricter limits to prevent brute force attacks
 */

interface AuthRateLimitConfig {
  // Max attempts per window
  maxAttempts: number;
  // Window duration in milliseconds
  windowMs: number;
  // Lockout duration after max attempts (ms)
  lockoutMs: number;
  // Max lockout duration (prevents infinite lockouts)
  maxLockoutMs: number;
}

interface AuthRateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
  lockoutCount: number;
}

// Store for rate limit entries (in production, use Redis)
const authRateLimits = new Map<string, AuthRateLimitEntry>();

// Default configurations for different auth actions
const AUTH_RATE_LIMIT_CONFIGS: Record<string, AuthRateLimitConfig> = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    lockoutMs: 15 * 60 * 1000, // 15 minute lockout
    maxLockoutMs: 24 * 60 * 60 * 1000, // Max 24 hour lockout
  },
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    lockoutMs: 60 * 60 * 1000, // 1 hour lockout
    maxLockoutMs: 24 * 60 * 60 * 1000,
  },
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    lockoutMs: 60 * 60 * 1000, // 1 hour lockout
    maxLockoutMs: 24 * 60 * 60 * 1000,
  },
  twoFactor: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
    lockoutMs: 30 * 60 * 1000, // 30 minute lockout
    maxLockoutMs: 24 * 60 * 60 * 1000,
  },
  apiKey: {
    maxAttempts: 10,
    windowMs: 60 * 1000, // 1 minute
    lockoutMs: 5 * 60 * 1000, // 5 minute lockout
    maxLockoutMs: 60 * 60 * 1000,
  },
};

/**
 * Generate a rate limit key based on identifier and action
 */
function getKey(identifier: string, action: string): string {
  return `auth:${action}:${identifier}`;
}

/**
 * Check if an identifier is rate limited for a specific action
 */
export function isAuthRateLimited(
  identifier: string,
  action: keyof typeof AUTH_RATE_LIMIT_CONFIGS
): { limited: boolean; retryAfter?: number; attemptsRemaining?: number } {
  const config = AUTH_RATE_LIMIT_CONFIGS[action];
  if (!config) {
    return { limited: false };
  }

  const key = getKey(identifier, action);
  const entry = authRateLimits.get(key);
  const now = Date.now();

  if (!entry) {
    return { limited: false, attemptsRemaining: config.maxAttempts };
  }

  // Check if currently locked out
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      limited: true,
      retryAfter: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }

  // Check if window has expired
  if (now - entry.firstAttempt > config.windowMs) {
    // Reset the entry but keep lockout count
    authRateLimits.set(key, {
      attempts: 0,
      firstAttempt: now,
      lockedUntil: null,
      lockoutCount: entry.lockoutCount,
    });
    return { limited: false, attemptsRemaining: config.maxAttempts };
  }

  // Check if max attempts reached
  if (entry.attempts >= config.maxAttempts) {
    // Calculate lockout duration with exponential backoff
    const lockoutDuration = Math.min(
      config.lockoutMs * Math.pow(2, entry.lockoutCount),
      config.maxLockoutMs
    );
    const lockedUntil = now + lockoutDuration;

    authRateLimits.set(key, {
      ...entry,
      lockedUntil,
      lockoutCount: entry.lockoutCount + 1,
    });

    return {
      limited: true,
      retryAfter: Math.ceil(lockoutDuration / 1000),
    };
  }

  return {
    limited: false,
    attemptsRemaining: config.maxAttempts - entry.attempts,
  };
}

/**
 * Record an authentication attempt
 */
export function recordAuthAttempt(
  identifier: string,
  action: keyof typeof AUTH_RATE_LIMIT_CONFIGS,
  success: boolean
): void {
  const config = AUTH_RATE_LIMIT_CONFIGS[action];
  if (!config) return;

  const key = getKey(identifier, action);
  const now = Date.now();

  if (success) {
    // On success, clear the rate limit entry
    authRateLimits.delete(key);
    return;
  }

  const entry = authRateLimits.get(key);

  if (!entry || now - entry.firstAttempt > config.windowMs) {
    // Start a new window
    authRateLimits.set(key, {
      attempts: 1,
      firstAttempt: now,
      lockedUntil: null,
      lockoutCount: entry?.lockoutCount ?? 0,
    });
  } else {
    // Increment attempts in current window
    authRateLimits.set(key, {
      ...entry,
      attempts: entry.attempts + 1,
    });
  }
}

/**
 * Clear rate limit for an identifier (e.g., after successful password reset)
 */
export function clearAuthRateLimit(
  identifier: string,
  action: keyof typeof AUTH_RATE_LIMIT_CONFIGS
): void {
  const key = getKey(identifier, action);
  authRateLimits.delete(key);
}

/**
 * Get rate limit info for an identifier
 */
export function getAuthRateLimitInfo(
  identifier: string,
  action: keyof typeof AUTH_RATE_LIMIT_CONFIGS
): AuthRateLimitEntry | null {
  const key = getKey(identifier, action);
  return authRateLimits.get(key) ?? null;
}

// Cleanup old entries periodically (run every 5 minutes)
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of authRateLimits.entries()) {
      // Remove entries older than 24 hours
      if (now - entry.firstAttempt > 24 * 60 * 60 * 1000) {
        authRateLimits.delete(key);
      }
    }
  },
  5 * 60 * 1000
);
