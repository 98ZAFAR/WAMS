"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { wamsApi } from "@/lib/api";
import { normalizeError } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import type { Role } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, setAuthSession, user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Dealer");
  const [businessName, setBusinessName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && isAuthenticated && user) {
      router.replace(roleHomePath(user.role));
    }
  }, [isAuthenticated, isReady, router, user]);

  const businessRequired = useMemo(() => role === "Dealer" || role === "Supplier", [role]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (businessRequired && !businessName.trim()) {
      setError("Business name is required for Dealer and Supplier roles.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await wamsApi.register({
        name,
        email,
        password,
        role,
        businessName: businessName.trim() || undefined,
        contactInfo: contactInfo.trim() || undefined,
      });

      setAuthSession(response.token, response.user);
      router.replace(roleHomePath(response.user.role));
    } catch (submitError) {
      setError(normalizeError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-wrap" style={{ padding: "1.2rem 0 2rem" }}>
      <section className="surface" style={{ maxWidth: "720px", margin: "0 auto", padding: "1.5rem" }}>
        <div className="stack-sm" style={{ marginBottom: "0.8rem" }}>
          <p className="kicker">Advanced Inventory Management, Elegantly Simplified</p>
          <h1 className="headline" style={{ fontSize: "2.1rem" }}>
            Create your account
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="stack-md">
          <div className="form-grid">
            <div className="field" style={{ gridColumn: "span 6" }}>
              <label htmlFor="name">Name</label>
              <input
                id="name"
                className="input"
                placeholder="John Doe"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="field" style={{ gridColumn: "span 6" }}>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="john@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field" style={{ gridColumn: "span 6" }}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="field" style={{ gridColumn: "span 6" }}>
              <label htmlFor="role">Select Your Role</label>
              <select
                id="role"
                className="select"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
              >
                <option value="Dealer">Dealer</option>
                <option value="Supplier">Supplier</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="field" style={{ gridColumn: "span 6" }}>
              <label htmlFor="businessName">Business Name</label>
              <input
                id="businessName"
                className="input"
                placeholder="Enter dealer trade name"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                required={businessRequired}
              />
            </div>
            <div className="field" style={{ gridColumn: "span 6" }}>
              <label htmlFor="contactInfo">Contact Info</label>
              <input
                id="contactInfo"
                className="input"
                placeholder="Phone, WhatsApp, alternate email"
                value={contactInfo}
                onChange={(event) => setContactInfo(event.target.value)}
              />
            </div>
          </div>

          {error ? <div className="message error">{error}</div> : null}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="text-soft" style={{ marginTop: "0.9rem", fontSize: "0.9rem" }}>
          Already have access?{" "}
          <Link href="/login" style={{ color: "var(--color-primary-strong)" }}>
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
