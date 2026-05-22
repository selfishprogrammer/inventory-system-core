// ─── Shared API response types ────────────────────────────────────────────────

export type UserRole = 'owner' | 'manager' | 'staff';
export type POStatus = 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled';
export type OrderStatus = 'pending' | 'processing' | 'fulfilled' | 'partially_fulfilled' | 'cancelled';
export type StockMovementType = 'purchase' | 'sale' | 'return' | 'adjustment';

export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise';
  isActive: boolean;
  createdAt: string;
}

export interface User {
  _id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Variant {
  sku: string;
  attributes: Record<string, string>;
  price: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  reorderPoint: number;
}

export interface ProductAttribute {
  name: string;
  values: string[];
}

export interface SupplierRef {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
}

export interface Product {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  category?: string;
  supplierId?: SupplierRef | null;
  attributes: ProductAttribute[];
  variants: Variant[];
  isActive: boolean;
  createdAt: string;
}

export interface Supplier {
  _id: string;
  tenantId: string;
  name: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  paymentTerms: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface StockMovement {
  _id: string;
  tenantId: string;
  productId: string;
  variantSku: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  referenceId?: string;
  userId?: { _id: string; name: string } | null;
  note?: string;
  createdAt: string;
}

export interface POItem {
  _id: string;
  productId: string;
  productName?: string;
  variantSku: string;
  variantAttributes?: Record<string, string>;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  _id: string;
  tenantId: string;
  poNumber: string;
  supplierId: SupplierRef | null;
  status: POStatus;
  items: POItem[];
  totalAmount: number;
  notes?: string;
  expectedDelivery?: string;
  receivedAt?: string;
  createdBy?: { _id: string; name: string } | null;
  createdAt: string;
}

export interface OrderItem {
  _id: string;
  productId: string;
  productName?: string;
  variantSku: string;
  variantAttributes?: Record<string, string>;
  quantity: number;
  unitPrice: number;
  fulfilledQuantity: number;
}

export interface Order {
  _id: string;
  tenantId: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  createdBy?: { _id: string; name: string } | null;
  createdAt: string;
}

// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalProducts: number;
  totalSkus: number;
  totalInventoryValue: number;
  totalOrders: number;
  totalRevenue: number;
  pendingPOs: number;
  lowStockCount: number;
}

export interface LowStockItem {
  productId: string;
  productName: string;
  category?: string;
  supplierName?: string | null;
  variantSku: string;
  variantAttributes?: Record<string, string>;
  currentStock: number;
  pendingPOQuantity: number;
  effectiveStock: number;
  lowStockThreshold: number;
  reorderPoint: number;
}

export interface TopSeller {
  productId: string;
  productName: string;
  category?: string;
  variantSku: string;
  totalSold: number;
}

export interface ChartDataPoint {
  date: string;
  purchase: number;
  sale: number;
  return: number;
  adjustment: number;
}
