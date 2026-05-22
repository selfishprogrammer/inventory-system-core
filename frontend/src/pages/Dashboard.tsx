import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { DashboardStats, LowStockItem, TopSeller, ChartDataPoint } from '../types';

function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: string; color: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <span className={`text-2xl p-2 rounded-lg ${color}`}>{icon}</span>
      </div>
    </div>
  );
}

function LowStockCard({ item }: { item: LowStockItem }) {
  const navigate = useNavigate();
  const attrs = item.variantAttributes
    ? Object.entries(item.variantAttributes).map(([k, v]) => `${k}: ${v}`).join(', ')
    : item.variantSku;

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded"
      onClick={() => navigate(`/products/${item.productId}`)}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
        <p className="text-xs text-gray-400 mt-0.5">{attrs}</p>
      </div>
      <div className="text-right ml-3 flex-shrink-0">
        <p className="text-sm font-semibold text-red-600">{item.currentStock} in stock</p>
        {item.pendingPOQuantity > 0 && <p className="text-xs text-green-600">+{item.pendingPOQuantity} on order</p>}
      </div>
    </div>
  );
}

const fmt = (n: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const socketCtx = useSocket();

  const fetchAll = useCallback(async (): Promise<void> => {
    try {
      const [s, ls, ts, cm] = await Promise.all([
        dashboardAPI.stats(),
        dashboardAPI.lowStock(),
        dashboardAPI.topSellers(),
        dashboardAPI.stockMovements(),
      ]);
      setStats(s.data);
      setLowStock(ls.data);
      setTopSellers(ts.data);
      setChartData(cm.data);
    } catch (err) {
      console.error('Dashboard fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!socketCtx?.on) return;
    const c1 = socketCtx.on('stock-updated', fetchAll);
    const c2 = socketCtx.on('order-created', fetchAll);
    const c3 = socketCtx.on('po-received', fetchAll);
    return () => { c1?.(); c2?.(); c3?.(); };
  }, [socketCtx, fetchAll]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time inventory overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Products" value={stats?.totalProducts ?? 0} icon="📦" color="bg-blue-50" />
        <StatCard label="Total SKUs" value={stats?.totalSkus ?? 0} icon="🏷️" color="bg-purple-50" />
        <StatCard label="Inventory Value" value={fmt(stats?.totalInventoryValue ?? 0)} icon="💰" color="bg-green-50" sub="at cost price" />
        <StatCard label="Total Orders" value={stats?.totalOrders ?? 0} icon="🛍️" color="bg-orange-50" />
        <StatCard label="Revenue" value={fmt(stats?.totalRevenue ?? 0)} icon="📈" color="bg-emerald-50" sub="all time" />
        <StatCard label="Pending POs" value={stats?.pendingPOs ?? 0} icon="🚚" color="bg-yellow-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Stock Movement — Last 7 Days</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="purchase" stroke="#3b82f6" fill="url(#gP)" strokeWidth={2} name="Purchase" />
                <Area type="monotone" dataKey="sale" stroke="#10b981" fill="url(#gS)" strokeWidth={2} name="Sale" />
                <Area type="monotone" dataKey="return" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Return" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No movement data yet</div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Top 5 Sellers — 30 Days</h2>
          {topSellers.length > 0 ? (
            <div className="space-y-3">
              {topSellers.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.variantSku}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{item.totalSold}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">No sales yet</p>}
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold text-gray-900">Low Stock Alerts</h2>
            <span className="badge-red">{lowStock.length}</span>
            <span className="text-xs text-gray-400 ml-1">(pending PO included)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8">
            {lowStock.slice(0, 12).map((item, i) => <LowStockCard key={i} item={item} />)}
          </div>
          {lowStock.length > 12 && <p className="text-sm text-gray-400 mt-3">+{lowStock.length - 12} more items below threshold</p>}
        </div>
      )}
    </div>
  );
}
