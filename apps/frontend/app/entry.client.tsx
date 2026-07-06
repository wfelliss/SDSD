import * as Sentry from "@sentry/react-router";
import { HydratedRouter } from "react-router/dom";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  // Tracing is intentionally disabled for now (no tracesSampleRate) —
  // errors and replays only. Re-add reactRouterTracingIntegration() and
  // trace meta-tag injection in entry.server.tsx when enabling it.
  integrations: [Sentry.replayIntegration()],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter onError={Sentry.sentryOnError} />
    </StrictMode>
  );
});
