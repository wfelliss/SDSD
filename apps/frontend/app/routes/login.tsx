import { redirect, json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { authCookie } from "../helpers/cookie";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return json({ error: "Missing email or password" }, { status: 400 });
  }

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

  const res = await fetch(`${BACKEND_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    return json({ error: data.message || "Invalid credentials" }, { status: res.status });
  }

  // Create cookie using Remix helper
  const cookieHeader = await authCookie.serialize(data.token);

  // Set cookie on redirect to dashboard
  return redirect("/", {
    headers: {
      "Set-Cookie": cookieHeader,
    },
  });
}

export default function Login() {
  const data = useActionData<typeof action>();

  return (
    <div style={{ maxWidth: 400, margin: "auto", paddingTop: 80 }}>
      <h1>Login</h1>

      {data?.error && <p style={{ color: "red" }}>{data.error}</p>}

      <Form method="post">
        <div>
          <input name="email" type="email" placeholder="Email" required />
        </div>

        <div>
          <input name="password" type="password" placeholder="Password" required />
        </div>

        <button type="submit">Log in</button>
      </Form>
    </div>
  );
}
