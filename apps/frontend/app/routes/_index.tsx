import { type MetaFunction } from "@remix-run/node";
import { useState } from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "Frontend App" },
    { name: "description", content: "Welcome to the frontend app!" },
  ];
};

export default function Index() {
  const [number, setNumber] = useState(0);
  const [apiResponse, setApiResponse] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api");
      const text = await response.text();
      setApiResponse(text);
    } catch (error) {
      setApiResponse("API Error: " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header Section */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4 animate-fade-in">
            Welcome to Remix Frontend
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            This is your new Remix frontend app running in a Turborepo monorepo
            with Tailwind CSS for beautiful styling.
          </p>
        </header>

        {/* Button Demo Section */}
        <div className="flex justify-center gap-4 mb-12">
          <button
            className="btn-primary px-6 py-2"
            onClick={() => setNumber(number + 1)}
          >
            Click me! {number}
          </button>

          <button
            className="btn-secondary px-6 py-2"
            onClick={testApi}
            disabled={loading}
          >
            {loading ? "Testing..." : "Test API"}
          </button>
        </div>

        {/* API Response Section */}
        {apiResponse && (
          <div className="mb-12">
            <div className="card p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-2">API Response:</h3>
              <pre className="bg-slate-100 p-3 rounded text-sm overflow-auto">
                {apiResponse}
              </pre>
            </div>
          </div>
        )}

        {/* Cards Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="card p-6 hover:shadow-lg transition-shadow duration-200 group">
            <span className="text-slate-600 group-hover:text-slate-800 transition-colors">
              Learn about Remix features and API. Explore routing, data loading,
              and server-side rendering.
            </span>
          </div>

          <div className="card p-6 hover:shadow-lg transition-shadow duration-200 group">
            <span className="text-slate-600 group-hover:text-slate-800 transition-colors">
              Learn about Turborepo and monorepos. Discover build optimization
              and workspace management.
            </span>
          </div>
        </div>

        {/* Footer Section */}
        <footer className="text-center">
          <div className="inline-flex items-center gap-2 text-slate-600">
            <span>Edit</span>
            <code className="bg-slate-200 text-slate-800 px-2 py-1 rounded text-sm font-mono">
              app/routes/_index.tsx
            </code>
            <span>to get started.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
