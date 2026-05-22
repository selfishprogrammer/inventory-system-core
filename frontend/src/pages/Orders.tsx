import React, { useState, useEffect } from 'react';
import { ordersAPI, productsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { Order, Product, OrderStatus } from '../types';

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'badge-yellow', processing: 'badge-blue', fulfilled: 'badge-green',
  partially_fulfilled: 'badge-yellow', cancelled: 'badge-red',
};

interface FormItem {
  productId: string;
  variantSku: string;
  quantity: number | string;
}

interface CreateOrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateOrderForm({ onSuccess, onCancel }: CreateOrderFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ customerName: '', customerEmail: '', notes: '' });
  const [items, setItems] = useState<FormItem[]>([{ productId: '', variantSku: '', quantity: 1 }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    productsAPI.list({ limit: 200 }).then(({ data }) => setProducts(data.products));
  }, []);

  const addItem = () => setItems([...items, { productId: '', variantSku: '', quantity: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof FormItem, val: string | number) =>
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const getVariants = (productId: string) =>
    products.find((p) => p._id === productId)?.variants || [];

  const handleProductChange = (i: number, productId: string) => {
    const variants = getVariants(productId);
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === i ? { ...item, productId, variantSku: variants[0]?.sku || '' } : item
      )
    );
  };

  const getTotal = () => {
    return items.reduce((sum, item) => {
      const product = products.find((p) => p._id === item.productId);
      const variant = product?.variants.find((v) => v.sku === item.variantSku);
      return sum + (variant?.price || 0) * Number(item.quantity);
    }, 0);
  };

  const getVariantInfo = (productId: string, sku: string) => {
    const product = products.find((p) => p._id === productId);
    return product?.variants.find((v) => v.sku === sku);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const valid = items.filter((i) => i.productId && i.variantSku && Number(i.quantity) > 0);
    if (valid.length === 0) return setError('Add at least one item');
    if (!form.customerName) return setError('Customer name is required');

    setLoading(true);
    try {
      await ordersAPI.create({
        ...form,
        items: valid.map((i) => ({ ...i, quantity: parseInt(String(i.quantity)) })),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
          <input className="input" placeholder="John Doe" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
          <input className="input" type="email" placeholder="john@example.com" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input className="input" placeholder="Optional order notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Order Items</label>
          <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline">+ Add item</button>
        </div>
        <div className="space-y-2">
          {items.map((item, i) => {
            const variant = getVariantInfo(item.productId, item.variantSku);
            return (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <select className="input text-xs" value={item.productId} onChange={(e) => handleProductChange(i, e.target.value)}>
                    <option value="">Select product</option>
                    {products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-4">
                  <select className="input text-xs" value={item.variantSku} onChange={(e) => updateItem(i, 'variantSku', e.target.value)} disabled={!item.productId}>
                    <option value="">Variant</option>
                    {getVariants(item.productId).map((v) => (
                      <option key={v.sku} value={v.sku}>{v.sku} (stock: {v.stock})</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <input type="number" min="1" className="input text-xs text-right" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
                </div>
                <div className="col-span-1 text-center">
                  <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
                {variant && (
                  <div className="col-span-12 -mt-1">
                    <p className="text-xs text-gray-400 ml-1">₹{variant.price.toLocaleString()} per unit</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="text-right font-semibold text-sm mt-2 text-gray-800">
          Estimated Total: ₹{getTotal().toLocaleString()}
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Processing...' : 'Place Order'}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default function Orders() {
  const { canManage } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await ordersAPI.list({ status, limit: 30 });
      setOrders(data.orders);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [status]);

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this order and restore stock?')) return;
    try {
      await ordersAPI.cancel(id);
      fetchOrders();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel order');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{total} orders total</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Order</button>
      </div>

      <div className="card p-4">
        <div className="flex gap-2 flex-wrap">
          {(['', 'pending', 'processing', 'fulfilled', 'partially_fulfilled', 'cancelled'] as const).map((s) => (
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
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-2">📋</div><p>No orders found</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Items</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <React.Fragment key={order._id}>
                  <tr
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">{order.orderNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{order.customerName}</div>
                      {order.customerEmail && <div className="text-xs text-gray-400">{order.customerEmail}</div>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{order.items.length}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{order.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className={STATUS_COLORS[order.status]}>{order.status}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {canManage() && order.status !== 'cancelled' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancel(order._id); }}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedOrder === order._id && (
                    <tr>
                      <td colSpan={7} className="bg-gray-50 px-4 py-3">
                        <div className="text-xs space-y-1">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-4 text-gray-600">
                              <span className="font-medium">{item.productName}</span>
                              <span className="font-mono text-gray-400">{item.variantSku}</span>
                              <span>×{item.quantity}</span>
                              <span>@₹{item.unitPrice.toLocaleString()}</span>
                              <span className="font-semibold">= ₹{(item.quantity * item.unitPrice).toLocaleString()}</span>
                            </div>
                          ))}
                          {order.notes && <div className="text-gray-400 pt-1">Note: {order.notes}</div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Sales Order" size="xl">
        <CreateOrderForm onSuccess={() => { setShowForm(false); fetchOrders(); }} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
