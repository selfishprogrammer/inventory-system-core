import mongoose, { Schema } from 'mongoose';
import { IOrder } from '../types';

const orderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: String,
  variantSku: { type: String, required: true },
  variantAttributes: { type: Map, of: String },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  fulfilledQuantity: { type: Number, default: 0 },
});

const orderSchema = new Schema<IOrder>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    orderNumber: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String },
    status: {
      type: String,
      enum: ['pending', 'processing', 'fulfilled', 'partially_fulfilled', 'cancelled'],
      default: 'pending',
    },
    items: [orderItemSchema],
    totalAmount: { type: Number, default: 0 },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

orderSchema.index({ tenantId: 1, status: 1 });
orderSchema.index({ tenantId: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });

export default mongoose.model<IOrder>('Order', orderSchema);
