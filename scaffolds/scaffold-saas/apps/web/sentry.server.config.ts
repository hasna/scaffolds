import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Set profiling sample rate
  profilesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Add environment tag
  environment: process.env.NODE_ENV,

  // Capture unhandled promise rejections
  integrations: [],

  // Filter out known benign errors
  ignoreErrors: [
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
  ],

  // Before sending events, you can filter or modify them
  beforeSend(event) {
    // Filter out development errors
    if (process.env.NODE_ENV === "development") {
      return null;
    }
    return event;
  },
});
