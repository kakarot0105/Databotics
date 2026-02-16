"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("databotics");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      router.push("/upload");
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>
      <form className="space-y-4" onSubmit={onSubmit}>
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="w-full rounded bg-slate-900 px-4 py-2 text-white" disabled={loading} type="submit">
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        No account? <Link className="underline" href="/register">Register</Link>
      </p>
    </div>
  );
}
