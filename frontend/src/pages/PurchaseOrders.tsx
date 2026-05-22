import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrdersAPI, suppliersAPI, productsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { PurchaseOrder, POStatus, Supplier, Product } from '../types';

const STATUS_COLORS: Record<POStatus, string> = {
  draft: 'badge-gray', sent: 'badge-blue', confirmed: 'badge-yellow',
  partially_received: 'badge-yellow', received: 'badge-green', cancelled: 'badge-red',
};

interface POFormItem {
  productId: string;
  variantSku: string;
  quantity: number | string;
  unitPrice: number | string;
}

interface CreatePOFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function CreatePOForm({ onSuccess, onCancel }: CreatePOFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ supplierId: '', notes: '', expectedDelivery: '' });
  const [items, setItems] = useState<POFormItem[]>([{ productId: '', variantSku: '', quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    suppliersAPI.list().then(({ data }) => setSuppliers(data));
    productsAPI.list({ limit: 200 }).then(({ data }) => setProducts(data.products));
  }, []);

  const addItem = () => setItems([...items, { productId: '', variantSku: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof POFormItem, val: string | number) =>
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const getVariants = (productId: string) =>
    products.find((p) => p._id === productId)?.variants || [];

  const handleProductChange = (i: number, productId: string) => {
    const variants = getVariants(productId);
    const firstSku = variants[0]?.sku || '';
    const firstPrice = variants[0]?.costPrice || 0;
    setItems(items.map((item, idx) =>
      idx === i ? { ...item, productId, variantSku: firstSku, unitPrice: firstPrice } : item
    ));
  };

  const handleVariantChange = (i: number, sku: string, productId: string) => {
    const variants = getVariants(productId);
    const v = variants.find((v) => v.sku === sku);
    setItems(items.map((item, idx) =>
      idx === i ? { ...item, variantSku: sku, unitPrice: v?.costPrice ?? item.unitPrice } : item
    ));
  };

  const total = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const valid = items.filter((i) => i.productId && i.variantSku && Number(i.quantity) > 0);
    if (valid.length === 0) return setError('Add at least one valid item');

    setLoading(true);
    try {
      const poItems = valid.map((item) => {
        const prod = products.find((p) => p._id === item.productId);
        const variant = prod?.variants.find((v) => v.sku === item.variantSku);
        return {
          productId: item.productId,
          productName: prod?.name,
          variantSku: item.variantSku,
          variantAttributes: variant?.attributes ? Object.fromEntries(Object.entries(variant.attributes)) : {},
          quantity: parseInt(String(item.quantity)),
          unitPrice: parseFloat(String(item.unitPrice)),
        };
      });
      await purchaseOrdersAPI.create({ ...form, items: poItems });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
          <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} required>
            <option value="">Select supplier</option>
            {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
          <input type="date" className="input" value={form.expectedDelivery} onChange={(e) => setForm({ ...form, expectedDelivery: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input className="input" placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Items</label>
          <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline">+ Add item</button>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <select className="input text-xs" value={item.productId} onChange={(e) => handleProductChange(i, e.target.value)}>
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <select className="input text-xs" value={item.variantSku} onChange={(e) => handleVariantChange(i, e.target.value, item.productId)} disabled={!item.productId}>
                  <option value="">Select variant</option>
                  {getVariants(item.productId).map((v) => <option key={v.sku} value={v.sku}>{v.sku}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input type="number" min="1" className="input text-xs text-right" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
              </div>
              <div className="col-span-2">
                <input type="number" min="0" step="0.01" className="input text-xs text-right" placeholder="₹ Unit" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)} />
              </div>
              <div className="col-span-1 text-center">
                <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="text-right text-sm font-semibold mt-2 text-gray-800">
          Total: ₹{total.toLocaleString()}
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Purchase Order'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const { data } = await purchaseOrdersAPI.list({ status, limit: 30 });
      setPOs(data.purchaseOrders);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPOs(); }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{total} orders total</p>
        </div>
        {canManage() && (
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Create PO</button>
        )}
      </div>

      <div className="card p-4">
        <div className="flex gap-2 flex-wrap">
          {(['', 'draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center h-48 items-center"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full" /></div>
        ) : pos.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-2">🛒</div><p>No purchase orders</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">PO Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Items</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((po) => (
                <tr key={po._id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/purchase-orders/${po._id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{po.poNumber}</td>
                  <td className="px-4 py-3">{po.supplierId?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{po.items.length} items</td>
                  <td className="px-4 py-3 text-right font-semibold">₹{po.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={STATUS_COLORS[po.status]}>{po.status.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(po.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create Purchase Order" size="xl">
        <CreatePOForm onSuccess={() => { setShowForm(false); fetchPOs(); }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
