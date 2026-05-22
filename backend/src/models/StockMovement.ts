import mongoose, { Schema } from 'mongoose';
import { IStockMovement } from '../types';

const stockMovementSchema = new Schema<IStockMovement>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantSku: { type: String, required: true },
    type: {
      type: String,
      enum: ['purchase', 'sale', 'return', 'adjustment'],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reference: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String },
  },
  { timestamps: true }
);

stockMovementSchema.index({ tenantId: 1, productId: 1, createdAt: -1 });
stockMovementSchema.index({ tenantId: 1, type: 1, createdAt: -1 });
stockMovementSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);
