import * as Sentry from "@sentry/react-router";

// Server-side Sentry init — imported first in entry.server.tsx.
// (Direct import rather than NODE_OPTIONS --import so it works identically
// on Windows dev machines and the Railway deployment.)
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? "production",
  // Lower to 0.1–0.2 once traffic grows
  tracesSampleRate: 1.0,
  enableLogs: true,
});
