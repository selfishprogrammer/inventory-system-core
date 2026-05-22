import { Document, Types } from 'mongoose';

// ─── Tenant ──────────────────────────────────────────────────────────────────

export interface ITenant extends Document {
  name: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'manager' | 'staff';

export interface IUser extends Document {
  tenantId: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

// ─── Product ──────────────────────────────────────────────────────────────────

export interface IVariant {
  sku: string;
  attributes: Map<string, string>;
  price: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  reorderPoint: number;
}

export interface IProductAttribute {
  name: string;
  values: string[];
}

export interface IProduct extends Document {
  tenantId: Types.ObjectId;
  name: string;
  description?: string;
  category?: string;
  supplierId?: Types.ObjectId;
  attributes: IProductAttribute[];
  variants: Types.DocumentArray<IVariant & Document>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── StockMovement ────────────────────────────────────────────────────────────

export type StockMovementType = 'purchase' | 'sale' | 'return' | 'adjustment';

export interface IStockMovement extends Document {
  tenantId: Types.ObjectId;
  productId: Types.ObjectId;
  variantSku: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference?: string;
  referenceId?: Types.ObjectId;
  userId: Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Supplier ─────────────────────────────────────────────────────────────────

export interface ISupplierAddress {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface ISupplier extends Document {
  tenantId: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: ISupplierAddress;
  paymentTerms: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── PurchaseOrder ────────────────────────────────────────────────────────────

export type POStatus =
  | 'draft'
  | 'sent'
  | 'confirmed'
  | 'partially_received'
  | 'received'
  | 'cancelled';

export interface IPOItem extends Document {
  productId: Types.ObjectId;
  productName?: string;
  variantSku: string;
  variantAttributes?: Map<string, string>;
  quantity: number;
  unitPrice: number;
  receivedQuantity: number;
}

export interface IPurchaseOrder extends Document {
  tenantId: Types.ObjectId;
  poNumber: string;
  supplierId: Types.ObjectId;
  status: POStatus;
  items: Types.DocumentArray<IPOItem>;
  totalAmount: number;
  notes?: string;
  expectedDelivery?: Date;
  receivedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Order ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'fulfilled'
  | 'partially_fulfilled'
  | 'cancelled';

export interface IOrderItem extends Document {
  productId: Types.ObjectId;
  productName?: string;
  variantSku: string;
  variantAttributes?: Map<string, string>;
  quantity: number;
  unitPrice: number;
  fulfilledQuantity: number;
}

export interface IOrder extends Document {
  tenantId: Types.ObjectId;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  status: OrderStatus;
  items: Types.DocumentArray<IOrderItem>;
  totalAmount: number;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
