import {
  Links,
  LinksFunction,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import stylesheet from "./tailwind.css?url";
import { Providers } from "./lib/providers";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export default function App() {
  return (
    <html lang="en" className="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-page-background-primary font-sans antialiased">
        <Providers>
          <Outlet />
        </Providers>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
