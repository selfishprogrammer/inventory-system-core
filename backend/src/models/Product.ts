import mongoose, { Schema } from 'mongoose';
import { IProduct } from '../types';

const variantSchema = new Schema(
  {
    sku: { type: String, required: true },
    attributes: { type: Map, of: String },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    reorderPoint: { type: Number, default: 5 },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    attributes: [{ name: { type: String, required: true }, values: [String] }],
    variants: [variantSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ tenantId: 1, category: 1 });
productSchema.index({ tenantId: 1, isActive: 1 });
productSchema.index({ tenantId: 1, 'variants.sku': 1 });
productSchema.index({ tenantId: 1, createdAt: -1 });
productSchema.index({ tenantId: 1, name: 'text', description: 'text' });

export default mongoose.model<IProduct>('Product', productSchema);
