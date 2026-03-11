import { useState } from "react";
import { useNavigate } from "react-router-dom";

const DOT_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='hsl(216%2C100%25%2C50%25)' fill-opacity='0.18'/%3E%3C/svg%3E")`;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid credentials");
        return;
      }

      localStorage.setItem("token", data.access_token);
      navigate("/");
    } catch (err) {
      setError("Login failed. Try again.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-zinc-100"
      style={{ backgroundImage: DOT_PATTERN }}
    >
      <div className="w-full max-w-sm mx-4">
        {/* Card */}
        <div className="bg-zinc-50 rounded-2xl shadow-xl overflow-hidden">
          {/* Top accent bar — blue + orange gradient matching chart colours */}
          <div
            className="h-1.5 w-full"
            style={{
              background:
                "linear-gradient(90deg, hsl(216,100%,50%), hsl(333, 93%, 56%)",
            }}
          />

          <div className="px-8 pt-8 pb-10">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img
                src="/logo-full.png"
                alt="SDSD"
                className="h-12 object-contain"
              />
            </div>

            <h1 className="text-xl font-bold text-zinc-900 mb-1">
              Welcome back
            </h1>
            <p className="text-sm text-zinc-500 mb-6">
              Sign in to your account to continue
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-zinc-600 uppercase tracking-wider"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-zinc-600 uppercase tracking-wider"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-zinc-200 rounded-md px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-700 hover:bg-indigo-600 active:bg-indigo-800 text-white font-semibold text-sm rounded-md py-2.5 transition cursor-pointer mt-2"
              >
                Log in
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
