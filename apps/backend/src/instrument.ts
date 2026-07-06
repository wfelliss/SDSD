import * as Sentry from "@sentry/nestjs";

// Must be imported before any other module in main.ts so Sentry can
// instrument Node built-ins before NestJS loads them. Note: the backend
// runs under Bun, so OpenTelemetry auto-instrumentation is limited —
// error capture and manual spans work, automatic http/db spans may not.
Sentry.init({
  debug: process.env.NODE_ENV === "development",
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? "production",
  release: process.env.SENTRY_RELEASE,
  // Lower to 0.1–0.2 once traffic grows
  tracesSampleRate: 1.0,

  enableLogs: true,
});
