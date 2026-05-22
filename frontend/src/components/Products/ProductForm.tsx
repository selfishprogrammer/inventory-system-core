import React, { useState } from 'react';
import { productsAPI } from '../../services/api';
import { Supplier, ProductAttribute, Variant } from '../../types';
import VariantManager from './VariantManager';

interface Props {
  suppliers: Supplier[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormState {
  name: string;
  description: string;
  category: string;
  supplierId: string;
}

export default function ProductForm({ suppliers, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<FormState>({ name: '', description: '', category: '', supplierId: '' });
  const [attributes, setAttributes] = useState<ProductAttribute[]>([{ name: '', values: [] }]);
  const [variants, setVariants] = useState<Partial<Variant>[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addAttr = (): void => setAttributes([...attributes, { name: '', values: [] }]);
  const removeAttr = (i: number): void => setAttributes(attributes.filter((_, idx) => idx !== i));
  const updateAttrName = (i: number, val: string): void =>
    setAttributes(attributes.map((a, idx) => idx === i ? { ...a, name: val } : a));
  const updateAttrValues = (i: number, raw: string): void => {
    const values = raw.split(',').map((v) => v.trim()).filter(Boolean);
    setAttributes(attributes.map((a, idx) => idx === i ? { ...a, values } : a));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');

    if (variants.length === 0) { setError('Add at least one variant'); return; }
    if (variants.some((v) => !v.sku?.trim())) { setError('All variants must have a SKU'); return; }
    if (variants.some((v) => !v.price || v.price <= 0)) { setError('All variants must have a price > 0'); return; }

    setLoading(true);
    try {
      await productsAPI.create({
        ...form,
        supplierId: form.supplierId || undefined,
        attributes: attributes.filter((a) => a.name && a.values.length > 0),
        variants,
      });
      onSuccess();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error ?? 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  const validAttributes = attributes.filter((a) => a.name && a.values.length > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
          <input className="input" placeholder="Classic Cotton T-Shirt" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <input className="input" placeholder="Apparel" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
          <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
            <option value="">Select supplier</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Attributes</label>
          <button type="button" onClick={addAttr} className="text-xs text-blue-600 hover:underline">+ Add attribute</button>
        </div>
        <div className="space-y-2">
          {attributes.map((attr, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input className="input w-32 flex-shrink-0" placeholder="size" value={attr.name} onChange={(e) => updateAttrName(i, e.target.value)} />
              <input className="input flex-1" placeholder="S, M, L, XL  (comma separated)" value={attr.values.join(', ')} onChange={(e) => updateAttrValues(i, e.target.value)} />
              <button type="button" onClick={() => removeAttr(i)} className="text-gray-400 hover:text-red-500 mt-2">✕</button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Variants & Stock *</label>
        <VariantManager attributes={validAttributes} variants={variants} onChange={setVariants} />
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Product'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
