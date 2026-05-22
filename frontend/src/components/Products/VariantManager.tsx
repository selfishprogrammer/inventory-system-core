import React from 'react';
import { ProductAttribute, Variant } from '../../types';

interface Props {
  attributes: ProductAttribute[];
  variants: Partial<Variant>[];
  onChange: (variants: Partial<Variant>[]) => void;
}

function generateVariants(attributes: ProductAttribute[]): Partial<Variant>[] {
  if (!attributes.length) return [];
  const combos = attributes.reduce<Record<string, string>[]>(
    (acc, attr) => {
      if (!attr.values.length) return acc;
      return acc.flatMap((existing) =>
        attr.values.map((val) => ({ ...existing, [attr.name]: val }))
      );
    },
    [{}]
  );
  return combos.map((combo) => ({
    sku: Object.values(combo).join('-').toUpperCase().replace(/\s+/g, '-'),
    attributes: combo,
    price: 0,
    costPrice: 0,
    stock: 0,
    lowStockThreshold: 10,
    reorderPoint: 5,
  }));
}

export default function VariantManager({ attributes, variants, onChange }: Props) {
  const generateAll = (): void => {
    onChange(generateVariants(attributes));
  };

  const updateVariant = (index: number, field: keyof Variant, value: string): void => {
    const numFields: (keyof Variant)[] = ['price', 'costPrice', 'stock', 'lowStockThreshold', 'reorderPoint'];
    onChange(variants.map((v, i) =>
      i === index ? { ...v, [field]: numFields.includes(field) ? Number(value) : value } : v
    ));
  };

  const addManual = (): void => {
    onChange([...variants, { sku: '', attributes: {}, price: 0, costPrice: 0, stock: 0, lowStockThreshold: 10, reorderPoint: 5 }]);
  };

  const removeVariant = (index: number): void => {
    onChange(variants.filter((_, i) => i !== index));
  };

  const canGenerate = attributes.some((a) => a.name && a.values.length > 0);
  const expectedCount = attributes.reduce((n, a) => n * (a.values.length || 1), 1);

  return (
    <div>
      {canGenerate && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700 flex-1">{expectedCount} variant combinations possible</p>
          <button type="button" onClick={generateAll} className="btn-primary text-xs py-1.5">
            Auto-Generate {expectedCount} Variants
          </button>
        </div>
      )}

      {variants.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                {['SKU', 'Attributes', 'Price (₹)', 'Cost (₹)', 'Stock', 'Alert At', ''].map((h) => (
                  <th key={h} className={`px-3 py-2 text-gray-600 font-medium ${h === 'SKU' || h === 'Attributes' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <input className="input text-xs py-1 font-mono" value={v.sku ?? ''} onChange={(e) => updateVariant(i, 'sku', e.target.value)} placeholder="SKU-001" />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {v.attributes ? Object.entries(v.attributes).map(([k, val]) => `${k}:${val}`).join(', ') : '—'}
                  </td>
                  {(['price', 'costPrice', 'stock', 'lowStockThreshold'] as (keyof Variant)[]).map((field) => (
                    <td key={field} className="px-3 py-2">
                      <input type="number" min="0" className="input text-xs py-1 text-right w-20" value={(v[field] as number) ?? 0} onChange={(e) => updateVariant(i, field, e.target.value)} />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <button type="button" onClick={() => removeVariant(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
          No variants yet. Generate from attributes or add manually.
        </div>
      )}

      <button type="button" onClick={addManual} className="btn-secondary text-xs mt-3">+ Add Variant Manually</button>
    </div>
  );
}
