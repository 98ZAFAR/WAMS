import type { ProductSummary } from "@/lib/types";

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);
};

export const formatDate = (value?: string | Date) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

export const toStatusClass = (status?: string) => {
  if (!status) {
    return "status-pending";
  }

  return `status-${status.toLowerCase()}`;
};

export const readProductName = (product: string | ProductSummary) => {
  if (typeof product === "string") {
    return product;
  }

  return product.name;
};

export const readProductId = (product: string | ProductSummary) => {
  if (typeof product === "string") {
    return product;
  }

  return product._id;
};

export const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
};
