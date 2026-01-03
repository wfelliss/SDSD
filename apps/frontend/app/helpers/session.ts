import { redirect } from "@remix-run/node";
import { authCookie } from "./cookie";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export async function requireUser(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = await authCookie.parse(cookieHeader);

  if (!token) {
    throw redirect("/login");
  }

  const res = await fetch(`${BACKEND_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(res.status)

  if (!res.ok) {
    throw redirect("/login");
  }


  return res.json(); // user info
}
