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
    <main className="page-wrap" style={{ padding: "2rem 0" }}>
      <div className="surface" style={{ padding: "1rem" }}>
        Redirecting to your dashboard...
      </div>
    </main>
  );
}
