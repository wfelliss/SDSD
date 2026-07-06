// Sentry must be initialised before anything else on the server
import "./instrument.server";

import * as Sentry from "@sentry/react-router";
import { EntryContext, ServerRouter } from "react-router";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import type { HandleErrorFunction } from "react-router";

async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext
) {
  const body = await renderToReadableStream(
    <ServerRouter context={routerContext} url={request.url} />,
    {
      signal: request.signal,
      onError(error: unknown) {
        // Log streaming rendering errors from inside the shell
        Sentry.captureException(error);
        console.error(error);
        responseStatusCode = 500;
      },
    }
  );

  if (isbot(request.headers.get("user-agent") || "")) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}

export default Sentry.wrapSentryHandleRequest(handleRequest);

export const handleError: HandleErrorFunction = (error, { request }) => {
  // Aborted requests (client navigated away) are expected, not errors
  if (!request.signal.aborted) {
    Sentry.captureException(error);
    console.error(error);
  }
};
