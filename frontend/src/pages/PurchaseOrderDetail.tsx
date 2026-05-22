import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { purchaseOrdersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { PurchaseOrder, POStatus } from '../types';

const STATUS_COLORS: Record<POStatus, string> = {
  draft: 'badge-gray', sent: 'badge-blue', confirmed: 'badge-yellow',
  partially_received: 'badge-yellow', received: 'badge-green', cancelled: 'badge-red',
};

const NEXT_STATUSES: Record<POStatus, { value: POStatus; label: string }[]> = {
  draft: [{ value: 'sent', label: 'Mark as Sent' }, { value: 'cancelled', label: 'Cancel PO' }],
  sent: [{ value: 'confirmed', label: 'Confirm PO' }, { value: 'cancelled', label: 'Cancel PO' }],
  confirmed: [{ value: 'cancelled', label: 'Cancel PO' }],
  partially_received: [],
  received: [],
  cancelled: [],
};

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [po, setPO] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiveModal, setReceiveModal] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number | string>>({});
  const [receiving, setReceiving] = useState(false);
  const [receiveError, setReceiveError] = useState('');

  const fetchPO = async () => {
    try {
      const { data } = await purchaseOrdersAPI.get(id!);
      setPO(data);
      const initial: Record<string, number> = {};
      data.items.forEach((item: any) => { initial[item._id] = 0; });
      setReceivedQtys(initial);
    } catch {
      navigate('/purchase-orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPO(); }, [id]);

  const handleStatusChange = async (status: POStatus) => {
    if (!window.confirm(`Change status to "${status}"?`)) return;
    await purchaseOrdersAPI.updateStatus(id!, status);
    fetchPO();
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    setReceiveError('');
    const receivedItems = Object.entries(receivedQtys)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([itemId, receivedQuantity]) => ({ itemId, receivedQuantity: parseInt(String(receivedQuantity)) }));

    if (receivedItems.length === 0) return setReceiveError('Enter quantity for at least one item');
    setReceiving(true);
    try {
      await purchaseOrdersAPI.receive(id!, { receivedItems });
      setReceiveModal(false);
      fetchPO();
    } catch (err: any) {
      setReceiveError(err.response?.data?.error || 'Failed to record receipt');
    } finally {
      setReceiving(false);
    }
  };

  if (loading) return <div className="flex justify-center h-48 items-center"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full" /></div>;
  if (!po) return null;

  const canReceive = ['confirmed', 'partially_received'].includes(po.status) && canManage();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/purchase-orders')} className="text-sm text-blue-600 hover:underline mb-2 block">← Purchase Orders</button>
          <h1 className="text-2xl font-bold text-gray-900 font-mono">{po.poNumber}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={STATUS_COLORS[po.status]}>{po.status.replace('_', ' ')}</span>
            <span className="text-sm text-gray-500">Supplier: {po.supplierId?.name}</span>
            {po.expectedDelivery && <span className="text-sm text-gray-500">Expected: {new Date(po.expectedDelivery).toLocaleDateString()}</span>}
          </div>
        </div>
        {canManage() && (
          <div className="flex gap-2 flex-wrap">
            {canReceive && (
              <button onClick={() => setReceiveModal(true)} className="btn-primary">Record Receipt</button>
            )}
            {NEXT_STATUSES[po.status]?.map((s) => (
              <button key={s.value} onClick={() => handleStatusChange(s.value)}
                className={s.value === 'cancelled' ? 'btn-danger' : 'btn-secondary'}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {po.supplierId && (
        <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">Supplier</span><p className="font-medium mt-0.5">{po.supplierId.name}</p></div>
          {po.supplierId.email && <div><span className="text-gray-500">Email</span><p className="mt-0.5">{po.supplierId.email}</p></div>}
          {po.supplierId.contactPerson && <div><span className="text-gray-500">Contact</span><p className="mt-0.5">{po.supplierId.contactPerson}</p></div>}
          <div><span className="text-gray-500">Total Value</span><p className="font-bold text-lg mt-0.5">₹{po.totalAmount.toLocaleString()}</p></div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-800">Order Items</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Ordered</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Received</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Pending</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Unit Price</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item) => {
                const pending = item.quantity - item.receivedQuantity;
                return (
                  <tr key={item._id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-gray-400">
                        {item.variantAttributes
                          ? Object.entries(item.variantAttributes).map(([k, v]) => `${k}: ${v}`).join(', ')
                          : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{item.variantSku}</td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{item.receivedQuantity}</td>
                    <td className="px-4 py-3 text-right">
                      {pending > 0 ? <span className="badge-yellow">{pending}</span> : <span className="badge-green">Done</span>}
                    </td>
                    <td className="px-4 py-3 text-right">₹{item.unitPrice.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {po.notes && (
        <div className="card p-4 text-sm text-gray-600">
          <span className="font-medium">Notes: </span>{po.notes}
        </div>
      )}

      <Modal open={receiveModal} onClose={() => setReceiveModal(false)} title="Record Stock Receipt" size="lg">
        <form onSubmit={handleReceive} className="space-y-4">
          <p className="text-sm text-gray-500">Enter quantities actually received. Stock will be updated automatically.</p>
          <div className="space-y-3">
            {po.items.filter((item) => item.receivedQuantity < item.quantity).map((item) => (
              <div key={item._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-gray-500 font-mono">{item.variantSku}</p>
                </div>
                <div className="text-xs text-gray-500">Pending: {item.quantity - item.receivedQuantity}</div>
                <input
                  type="number"
                  min="0"
                  max={item.quantity - item.receivedQuantity}
                  className="input w-24 text-right text-sm"
                  placeholder="Qty"
                  value={receivedQtys[item._id] || ''}
                  onChange={(e) => setReceivedQtys({ ...receivedQtys, [item._id]: e.target.value })}
                />
              </div>
            ))}
          </div>
          {receiveError && <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{receiveError}</div>}
          <div className="flex gap-3">
            <button type="submit" disabled={receiving} className="btn-primary">{receiving ? 'Saving...' : 'Confirm Receipt'}</button>
            <button type="button" onClick={() => setReceiveModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
