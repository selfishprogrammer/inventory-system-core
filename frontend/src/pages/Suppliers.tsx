import React, { useState, useEffect } from 'react';
import { suppliersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import { Supplier } from '../types';

interface SupplierFormData {
  name: string;
  email: string;
  phone: string;
  contactPerson: string;
  paymentTerms: number;
  notes: string;
}

interface SupplierFormProps {
  initial?: Supplier | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function SupplierForm({ initial, onSuccess, onCancel }: SupplierFormProps) {
  const [form, setForm] = useState<SupplierFormData>(
    initial
      ? { name: initial.name, email: initial.email || '', phone: initial.phone || '', contactPerson: initial.contactPerson || '', paymentTerms: initial.paymentTerms, notes: initial.notes || '' }
      : { name: '', email: '', phone: '', contactPerson: '', paymentTerms: 30, notes: '' }
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (initial?._id) await suppliersAPI.update(initial._id, form);
      else await suppliersAPI.create(form);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
          <input className="input" placeholder="Acme Supplies" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input className="input" type="email" placeholder="orders@acme.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input className="input" placeholder="+91 9876543210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
          <input className="input" placeholder="John Smith" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (days)</label>
          <input type="number" min="0" className="input" value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: +e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : (initial ? 'Update' : 'Create Supplier')}</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default function Suppliers() {
  const { canManage } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<null | 'create' | Supplier>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const { data } = await suppliersAPI.list();
      setSuppliers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this supplier?')) return;
    await suppliersAPI.delete(id);
    fetchSuppliers();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-sm text-gray-500 mt-1">{suppliers.length} suppliers</p>
        </div>
        {canManage() && (
          <button onClick={() => setModal('create')} className="btn-primary">+ Add Supplier</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center h-48 items-center"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full" /></div>
      ) : suppliers.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">🏭</div>
          <p>No suppliers yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div key={s._id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  {s.contactPerson && <p className="text-sm text-gray-500 mt-0.5">{s.contactPerson}</p>}
                </div>
                {canManage() && (
                  <div className="flex gap-2 ml-2">
                    <button onClick={() => setModal(s)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(s._id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                {s.email && <div>✉️ {s.email}</div>}
                {s.phone && <div>📞 {s.phone}</div>}
                <div>💳 Net {s.paymentTerms} days</div>
              </div>
              {s.notes && <p className="text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Add Supplier' : 'Edit Supplier'}
      >
        <SupplierForm
          initial={modal !== 'create' ? modal : null}
          onSuccess={() => { setModal(null); fetchSuppliers(); }}
          onCancel={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
