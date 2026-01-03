import { createCookie } from "@remix-run/node";

// Cookie that stores JWT
export const authCookie = createCookie("auth", {
  maxAge: 60 * 60 * 24, // 1 day
  httpOnly: true,       // can't be read by JS
  secure: process.env.NODE_ENV === "production", // only HTTPS in prod
  sameSite: "lax",      // prevents CSRF
  path: "/",            // available on all routes
});
