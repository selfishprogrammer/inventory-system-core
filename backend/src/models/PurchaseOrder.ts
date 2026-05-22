import mongoose, { Schema } from 'mongoose';
import { IPurchaseOrder } from '../types';

const poItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: String,
  variantSku: { type: String, required: true },
  variantAttributes: { type: Map, of: String },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  receivedQuantity: { type: Number, default: 0 },
});

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    poNumber: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'],
      default: 'draft',
    },
    items: [poItemSchema],
    totalAmount: { type: Number, default: 0 },
    notes: { type: String },
    expectedDelivery: { type: Date },
    receivedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ tenantId: 1, status: 1 });
purchaseOrderSchema.index({ tenantId: 1, supplierId: 1 });
purchaseOrderSchema.index({ tenantId: 1, createdAt: -1 });
purchaseOrderSchema.index({ tenantId: 1, poNumber: 1 }, { unique: true });

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
