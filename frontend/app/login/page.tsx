"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { wamsApi } from "@/lib/api";
import { normalizeError } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

/*
Critical auth flow note:
The backend returns JWT + sanitized user from /api/auth/login.
This page persists both in localStorage via AuthProvider and immediately redirects
to role-specific workspace routes so every next request can send Bearer auth.
*/
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, setAuthSession, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && isAuthenticated && user) {
      router.replace(roleHomePath(user.role));
    }
  }, [isAuthenticated, isReady, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await wamsApi.login({ email, password });
      setAuthSession(response.token, response.user);
      router.replace(roleHomePath(response.user.role));
    } catch (submitError) {
      setError(normalizeError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-wrap" style={{ padding: "1.4rem 0 2rem" }}>
      <section className="surface" style={{ maxWidth: "560px", margin: "0 auto", padding: "1.6rem" }}>
        <div className="stack-sm" style={{ marginBottom: "0.8rem" }}>
          <p className="kicker">Precision in every movement, clarity in every byte</p>
          <h1 className="headline" style={{ fontSize: "2.2rem" }}>
            Welcome Back
          </h1>
          <p className="text-soft">Use your WAMS credentials to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="stack-md">
          <div className="field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="name@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error ? <div className="message error">{error}</div> : null}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="text-soft" style={{ marginTop: "0.9rem", fontSize: "0.9rem" }}>
          New to WAMS?{" "}
          <Link href="/register" style={{ color: "var(--color-primary-strong)" }}>
            Create your account
          </Link>
        </p>
      </section>
    </main>
  );
}
