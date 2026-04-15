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
      <section className="w-full max-w-3xl rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)] md:p-5">
        {loading ? <p className="text-sm text-[#605850]">Loading profile...</p> : null}
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div> : null}

        <form onSubmit={handleSubmit} className="mt-3 space-y-4">
          <div className="space-y-2">
            <label htmlFor="name">Name</label>
            <input id="name" className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <label htmlFor="businessName">Business Name</label>
            <input
              id="businessName"
              className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="contactInfo">Contact Info</label>
            <input
              id="contactInfo"
              className="w-full rounded-lg border border-[#d8d0c8] bg-[#faf5ee] px-3 py-2 text-sm text-[#3a302a] outline-none transition focus:border-[#c2652a] focus:ring-2 focus:ring-[#c2652a]/20"
              value={contactInfo}
              onChange={(event) => setContactInfo(event.target.value)}
            />
          </div>

          <button type="submit" className="inline-flex items-center justify-center rounded-lg bg-[#c2652a] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>
            {submitting ? "Updating..." : "Update Profile"}
          </button>
        </form>
      </section>
    </AppShell>
  );
}

