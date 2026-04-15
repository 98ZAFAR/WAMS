"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { wamsApi } from "@/lib/api";
import { normalizeError } from "@/lib/format";
import { roleHomePath } from "@/lib/navigation";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function SupplierProfilePage() {
  const router = useRouter();
  const { isReady, token, user, setAuthSession } = useAuth();

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !token || !user) {
      return;
    }

    if (user.role !== "Supplier") {
      router.replace(roleHomePath(user.role));
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const profile = await wamsApi.getSupplierProfile(token);
        setName(profile.name || "");
        setBusinessName(profile.businessName || "");
        setContactInfo(profile.contactInfo || "");
      } catch (loadError) {
        setError(normalizeError(loadError));
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [isReady, router, token, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token || !user) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await wamsApi.updateSupplierProfile(token, {
        name,
        businessName,
        contactInfo,
      });

      setSuccess(response.message);
      setAuthSession(token, {
        ...user,
        name: response.profile.name,
        businessName: response.profile.businessName,
        contactInfo: response.profile.contactInfo,
      });
    } catch (submitError) {
      setError(normalizeError(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      requiredRoles={["Supplier"]}
      title="Supplier Profile"
      subtitle="Maintain contact and business details used by admin supply workflows."
    >
      <section className="surface" style={{ maxWidth: "720px", padding: "1rem" }}>
        {loading ? <p className="text-soft">Loading profile...</p> : null}
        {error ? <div className="message error">{error}</div> : null}
        {success ? <div className="message success">{success}</div> : null}

        <form onSubmit={handleSubmit} className="stack-md" style={{ marginTop: "0.7rem" }}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" className="input" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="businessName">Business Name</label>
            <input
              id="businessName"
              className="input"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="contactInfo">Contact Info</label>
            <input
              id="contactInfo"
              className="input"
              value={contactInfo}
              onChange={(event) => setContactInfo(event.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
