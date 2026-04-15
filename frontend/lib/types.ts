export type Role = "Admin" | "Dealer" | "Supplier";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  businessName?: string;
  contactInfo?: string;
}

export interface AuthPayload {
  token: string;
  user: AuthUser;
  message: string;
}

export interface Product {
  _id: string;
  name: string;
  type: "RawMaterial" | "FinishedGood";
  price: number;
  currentStock: number;
  minThreshold: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DealerSummary {
  _id: string;
  name: string;
  email: string;
  businessName?: string;
}

export interface ProductSummary {
  _id: string;
  name: string;
  type: "RawMaterial" | "FinishedGood";
  price?: number;
  currentStock?: number;
  minThreshold?: number;
}

export interface OrderItem {
  product: string | ProductSummary;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  _id: string;
  dealer: string | DealerSummary;
  status: "Pending" | "Quoted" | "Approved" | "Dispatched";
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  _id: string;
  order: string;
  billingDate: string;
  paymentStatus: "Pending" | "Paid" | "Failed";
  createdAt?: string;
  updatedAt?: string;
}

export interface SalesRow {
  productId: string;
  productName: string;
  productType: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface ForecastRow {
  productId: string;
  productName: string;
  productType: string;
  currentStock: number;
  minThreshold: number;
  avgDailyConsumption: number;
  recommendedRestock: number;
  risk: "High" | "Normal";
}

export interface ForecastResponse {
  lookbackDays: number;
  coverageDays: number;
  forecast: ForecastRow[];
}

export interface Supply {
  _id: string;
  supplier: string | DealerSummary;
  product: string | ProductSummary;
  quantity: number;
  unitCost: number;
  totalCost: number;
  expectedDeliveryDate?: string;
  status: "Pending" | "Approved" | "Received" | "Rejected";
  createdAt: string;
  updatedAt: string;
}

export interface SupplierDashboard {
  supplierId: string;
  totalRequests: number;
  statusCounts: {
    Pending: number;
    Approved: number;
    Received: number;
    Rejected: number;
  };
  latestSupplies: Supply[];
  lowStockRawMaterials: Array<{
    _id: string;
    name: string;
    currentStock: number;
    minThreshold: number;
  }>;
}

export interface SupplierProfile {
  _id: string;
  name: string;
  email: string;
  role: "Supplier";
  businessName?: string;
  contactInfo?: string;
}

export interface ApiMessage {
  message: string;
}
