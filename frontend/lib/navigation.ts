import type { Role } from "@/lib/types";

export const roleHomePath = (role?: Role | null) => {
  if (role === "Admin") {
    return "/dashboard/admin";
  }

  if (role === "Supplier") {
    return "/dashboard/supplier";
  }

  return "/dashboard/dealer";
};

export const roleNav = {
  Admin: [
    { href: "/dashboard/admin", label: "Dashboard" },
    { href: "/inventory", label: "Inventory" },
    { href: "/orders/manage", label: "Orders" },
    { href: "/supplies", label: "Supplies" },
  ],
  Dealer: [
    { href: "/dashboard/dealer", label: "Dashboard" },
    { href: "/orders/request", label: "Request Order" },
    { href: "/orders/my", label: "My Orders" },
  ],
  Supplier: [
    { href: "/dashboard/supplier", label: "Dashboard" },
    { href: "/supplier/production", label: "Production" },
    { href: "/supplier/profile", label: "Profile" },
  ],
};
