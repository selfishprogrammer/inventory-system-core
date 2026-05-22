import mongoose, { Schema } from 'mongoose';
import { ISupplier } from '../types';

const supplierSchema = new Schema<ISupplier>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    paymentTerms: { type: Number, default: 30 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

supplierSchema.index({ tenantId: 1, isActive: 1 });
supplierSchema.index({ tenantId: 1, name: 1 });

export default mongoose.model<ISupplier>('Supplier', supplierSchema);
