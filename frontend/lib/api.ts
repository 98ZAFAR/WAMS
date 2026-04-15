import type {
  ApiMessage,
  AuthPayload,
  ForecastResponse,
  Invoice,
  Order,
  Product,
  SalesRow,
  SupplierDashboard,
  SupplierProfile,
  Supply,
} from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3001/api";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers = new Headers();

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : null;

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message || "Request failed")
        : "Request failed";

    throw new ApiError(message, response.status, data);
  }

  return data as T;
};

export const wamsApi = {
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: "Admin" | "Dealer" | "Supplier";
    businessName?: string;
    contactInfo?: string;
  }) => request<AuthPayload>("/auth/register", { method: "POST", body: payload }),

  login: (payload: { email: string; password: string }) =>
    request<AuthPayload>("/auth/login", { method: "POST", body: payload }),

  getInventory: (token: string) => request<Product[]>("/inventory", { token }),

  addProduct: (
    token: string,
    payload: {
      name: string;
      type: "RawMaterial" | "FinishedGood";
      price: number;
      currentStock: number;
      minThreshold: number;
    },
  ) => request<{ message: string; product: Product }>("/inventory", { method: "POST", token, body: payload }),

  updateStock: (token: string, id: string, quantityChange: number) =>
    request<{ message: string; product: Product }>(`/inventory/${id}/stock`, {
      method: "PUT",
      token,
      body: { quantityChange },
    }),

  requestOrder: (
    token: string,
    items: Array<{
      product: string;
      quantity: number;
    }>,
  ) =>
    request<{ message: string; order: Order }>("/orders/request", {
      method: "POST",
      token,
      body: { items },
    }),

  getDealerOrders: (token: string, dealerId: string) =>
    request<Order[]>(`/orders/dealer/${dealerId}`, { token }),

  getAllOrders: (token: string) => request<Order[]>("/orders", { token }),

  addQuote: (
    token: string,
    orderId: string,
    items: Array<{
      product: string;
      unitPrice: number;
    }>,
  ) =>
    request<{ message: string; order: Order }>(`/orders/${orderId}/quote`, {
      method: "PUT",
      token,
      body: { items },
    }),

  approveOrder: (token: string, orderId: string) =>
    request<{ message: string; order: Order; invoice: Invoice }>(`/orders/${orderId}/approve`, {
      method: "PUT",
      token,
    }),

  getSalesReport: (token: string) => request<SalesRow[]>("/reports/sales", { token }),

  getForecastReport: (
    token: string,
    query?: {
      lookbackDays?: number;
      coverageDays?: number;
    },
  ) => {
    const params = new URLSearchParams();

    if (query?.lookbackDays) {
      params.set("lookbackDays", String(query.lookbackDays));
    }

    if (query?.coverageDays) {
      params.set("coverageDays", String(query.coverageDays));
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";

    return request<ForecastResponse>(`/reports/forecast${suffix}`, { token });
  },

  getSupplierDashboard: (token: string) =>
    request<SupplierDashboard>("/suppliers/dashboard", { token }),

  getSupplierProfile: (token: string) =>
    request<SupplierProfile>("/suppliers/profile", { token }),

  updateSupplierProfile: (
    token: string,
    payload: {
      name?: string;
      businessName?: string;
      contactInfo?: string;
    },
  ) => request<{ message: string; profile: SupplierProfile }>("/suppliers/profile", { method: "PUT", token, body: payload }),

  createSupplyRequest: (
    token: string,
    payload: {
      product: string;
      quantity: number;
      unitCost: number;
      expectedDeliveryDate?: string;
    },
  ) =>
    request<{ message: string; supply: Supply }>("/suppliers/supplies", {
      method: "POST",
      token,
      body: payload,
    }),

  getSupplies: (
    token: string,
    query?: {
      status?: string;
      supplierId?: string;
    },
  ) => {
    const params = new URLSearchParams();

    if (query?.status) {
      params.set("status", query.status);
    }

    if (query?.supplierId) {
      params.set("supplierId", query.supplierId);
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";

    return request<Supply[]>(`/suppliers/supplies${suffix}`, { token });
  },

  updateSupplyStatus: (
    token: string,
    supplyId: string,
    status: "Approved" | "Received" | "Rejected",
  ) =>
    request<{ message: string; supply: Supply }>(`/suppliers/supplies/${supplyId}/status`, {
      method: "PUT",
      token,
      body: { status },
    }),

  ping: () => request<ApiMessage>("/"),
};
