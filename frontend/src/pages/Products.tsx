import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsAPI, suppliersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import ProductForm from '../components/Products/ProductForm';
import { Product, Supplier } from '../types';

const statusBadge = (stock: number, threshold: number) => {
  if (stock === 0) return <span className="badge-red">Out of Stock</span>;
  if (stock <= threshold) return <span className="badge-yellow">Low Stock</span>;
  return <span className="badge-green">In Stock</span>;
};

export default function Products() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await productsAPI.list({ page, limit: 20, search, category });
      setProducts(data.products);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    productsAPI.categories().then(({ data }) => setCategories(data));
    suppliersAPI.list().then(({ data }) => setSuppliers(data));
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Archive this product?')) return;
    await productsAPI.delete(id);
    fetchProducts();
  };

  const handleCreated = () => {
    setShowForm(false);
    fetchProducts();
    productsAPI.categories().then(({ data }) => setCategories(data));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">{total} products total</p>
        </div>
        {canManage() && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add Product
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <input
          className="input sm:w-64"
          placeholder="Search products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="input sm:w-48"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📦</div>
            <p>No products found</p>
            {canManage() && (
              <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
                Add your first product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Variants</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Total Stock</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
                  const minThreshold = Math.min(...p.variants.map((v) => v.lowStockThreshold));
                  return (
                    <tr
                      key={p._id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/products/${p._id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{p.description?.slice(0, 50)}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.category || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{p.variants.length} SKUs</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{totalStock}</td>
                      <td className="px-4 py-3 text-gray-600">{p.supplierId?.name || '—'}</td>
                      <td className="px-4 py-3">{statusBadge(totalStock, minThreshold)}</td>
                      <td className="px-4 py-3">
                        {canManage() && (
                          <button
                            onClick={(e) => handleDelete(p._id, e)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1">Prev</button>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-3 py-1">Next</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Product" size="xl">
        <ProductForm suppliers={suppliers} onSuccess={handleCreated} onCancel={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}
