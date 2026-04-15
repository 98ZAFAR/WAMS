"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { roleHomePath } from "@/lib/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OrdersRedirectPage() {
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

    if (user.role === "Dealer") {
      router.replace("/orders/my");
      return;
    }

    if (user.role === "Admin") {
      router.replace("/orders/manage");
      return;
    }

    router.replace(roleHomePath(user.role));
  }, [isAuthenticated, isReady, router, user]);

  return null;
}
