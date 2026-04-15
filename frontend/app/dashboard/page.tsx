"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { roleHomePath } from "@/lib/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { isReady, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    router.replace(roleHomePath(user.role));
  }, [isAuthenticated, isReady, router, user]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      <div className="rounded-2xl border border-[#d8d0c8]/60 bg-white p-4 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
        Redirecting to your dashboard...
      </div>
    </main>
  );
}

