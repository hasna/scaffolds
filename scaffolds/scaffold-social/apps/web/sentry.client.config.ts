import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Adjust sampling rate in production
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Set profiling sample rate
  profilesSampleRate: 0.1,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out known benign errors
  ignoreErrors: [
    // Random plugins/extensions
    "top.GLOBALS",
    // Chrome extensions
    "chrome-extension://",
    // Firefox extensions
    "moz-extension://",
    // Safari extensions
    "safari-web-extension://",
    // Network errors
    "Failed to fetch",
    "NetworkError",
    "AbortError",
    // User errors
    "ResizeObserver loop",
  ],

  // Add environment tag
  environment: process.env.NODE_ENV,
});
