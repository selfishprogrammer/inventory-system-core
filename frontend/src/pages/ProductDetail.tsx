import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { Product, StockMovement, StockMovementType } from '../types';

const typeColors: Record<StockMovementType, string> = {
  purchase: 'badge-blue',
  sale: 'badge-green',
  return: 'badge-yellow',
  adjustment: 'badge-gray',
};

interface AdjustForm {
  variantSku: string;
  quantity: string;
  note: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState<AdjustForm>({ variantSku: '', quantity: '', note: '' });
  const [adjustError, setAdjustError] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchProduct = async () => {
    try {
      const [p, m] = await Promise.all([
        productsAPI.get(id!),
        productsAPI.movements(id!),
      ]);
      setProduct(p.data);
      setMovements(m.data.movements);
    } catch {
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProduct(); }, [id]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError('');
    if (!adjustForm.variantSku) return setAdjustError('Select a variant');
    setAdjusting(true);
    try {
      await productsAPI.adjust(id!, adjustForm);
      setAdjustModal(false);
      setAdjustForm({ variantSku: '', quantity: '', note: '' });
      fetchProduct();
    } catch (err: any) {
      setAdjustError(err.response?.data?.error || 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) return <div className="flex justify-center h-48 items-center"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full" /></div>;
  if (!product) return null;

  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
  const totalValue = product.variants.reduce((s, v) => s + v.stock * v.costPrice, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/products')} className="text-sm text-blue-600 hover:underline mb-2 flex items-center gap-1">
            ← Products
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          {product.description && <p className="text-gray-500 text-sm mt-1">{product.description}</p>}
          <div className="flex gap-2 mt-2">
            {product.category && <span className="badge-blue">{product.category}</span>}
            {product.supplierId && <span className="badge-gray">{product.supplierId.name}</span>}
          </div>
        </div>
        {canManage() && (
          <button onClick={() => setAdjustModal(true)} className="btn-primary">
            Adjust Stock
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-xs text-gray-500">Total Stock</p><p className="text-2xl font-bold mt-1">{totalStock}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Variants / SKUs</p><p className="text-2xl font-bold mt-1">{product.variants.length}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Inventory Value</p><p className="text-xl font-bold mt-1">₹{totalValue.toLocaleString()}</p></div>
        <div className="card p-4"><p className="text-xs text-gray-500">Avg. Sell Price</p><p className="text-xl font-bold mt-1">₹{product.variants.length > 0 ? Math.round(product.variants.reduce((s, v) => s + v.price, 0) / product.variants.length).toLocaleString() : 0}</p></div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-800">Variants</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Attributes</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Price</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Stock</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Alert At</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((v, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{v.sku}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {v.attributes ? Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">₹{v.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-500">₹{v.costPrice.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold">{v.stock}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{v.lowStockThreshold}</td>
                  <td className="px-4 py-3">
                    {v.stock === 0 ? <span className="badge-red">Out of Stock</span>
                      : v.stock <= v.lowStockThreshold ? <span className="badge-yellow">Low Stock</span>
                      : <span className="badge-green">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-800">Stock Movement History</div>
        {movements.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No movements recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Qty Change</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">New Stock</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">By</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Note</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m._id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={typeColors[m.type]}>{m.type}</span></td>
                    <td className="px-4 py-3 font-mono text-xs">{m.variantSku}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </td>
                    <td className="px-4 py-3 text-right">{m.newStock}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.userId?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{m.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={adjustModal} onClose={() => setAdjustModal(false)} title="Adjust Stock">
        <form onSubmit={handleAdjust} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Variant</label>
            <select className="input" value={adjustForm.variantSku} onChange={(e) => setAdjustForm({ ...adjustForm, variantSku: e.target.value })} required>
              <option value="">Select variant...</option>
              {product.variants.map((v) => (
                <option key={v.sku} value={v.sku}>{v.sku} (current: {v.stock})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity Change <span className="text-gray-400 font-normal">(positive = add, negative = remove)</span>
            </label>
            <input type="number" className="input" placeholder="+10 or -5" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input className="input" placeholder="e.g. Damaged goods, correction" value={adjustForm.note} onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })} />
          </div>
          {adjustError && <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{adjustError}</div>}
          <div className="flex gap-3">
            <button type="submit" disabled={adjusting} className="btn-primary">{adjusting ? 'Saving...' : 'Save Adjustment'}</button>
            <button type="button" onClick={() => setAdjustModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
