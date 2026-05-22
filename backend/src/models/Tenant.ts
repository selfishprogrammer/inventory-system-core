import mongoose, { Schema } from 'mongoose';
import { ITenant } from '../types';

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    plan: {
      type: String,
      enum: ['starter', 'professional', 'enterprise'],
      default: 'starter',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<ITenant>('Tenant', tenantSchema);
