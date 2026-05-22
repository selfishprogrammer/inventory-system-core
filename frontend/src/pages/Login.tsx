import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface DemoKey { email: string; password: string; tenantSlug: string }

const DEMO_CREDS: Record<string, DemoKey> = {
  fashionhub_owner:  { email: 'owner@fashionhub.com',   password: 'password123', tenantSlug: 'fashionhub'  },
  fashionhub_staff:  { email: 'staff@fashionhub.com',   password: 'password123', tenantSlug: 'fashionhub'  },
  techgadgets_owner: { email: 'owner@techgadgets.com',  password: 'password123', tenantSlug: 'techgadgets' },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', tenantSlug: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (key: string): void => setForm(DEMO_CREDS[key]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">📦</div>
          <h1 className="text-2xl font-bold text-gray-900">InventoryOS</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="mb-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs font-medium text-blue-700 mb-2">Quick Demo Login:</p>
          <div className="flex flex-wrap gap-2">
            {Object.keys(DEMO_CREDS).map((key) => (
              <button key={key} onClick={() => fillDemo(key)} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                {key.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organisation Slug <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input className="input" placeholder="e.g. fashionhub" value={form.tenantSlug} onChange={(e) => setForm({ ...form, tenantSlug: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input className="input" type="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">{loading ? 'Signing in...' : 'Sign In'}</button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          New business? <Link to="/register" className="text-blue-600 hover:underline font-medium">Create account</Link>
        </p>
      </div>
    </div>
  );
}
