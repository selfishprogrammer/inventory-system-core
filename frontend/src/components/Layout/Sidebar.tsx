import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface NavItem { to: string; label: string; icon: string }

const nav: NavItem[] = [
  { to: '/dashboard',       label: 'Dashboard',       icon: '📊' },
  { to: '/products',        label: 'Products',         icon: '📦' },
  { to: '/suppliers',       label: 'Suppliers',        icon: '🏭' },
  { to: '/purchase-orders', label: 'Purchase Orders',  icon: '🛒' },
  { to: '/orders',          label: 'Sales Orders',     icon: '📋' },
];

interface Props { open: boolean; onClose: () => void }

export default function Sidebar({ open, onClose }: Props) {
  const { tenant, user } = useAuth();

  return (
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between p-5 border-b border-gray-700">
        <div>
          <div className="text-lg font-bold text-white">InventoryOS</div>
          <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{tenant?.name ?? 'Loading...'}</div>
        </div>
        <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">✕</button>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="space-y-1">
          {nav.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="text-sm text-gray-300 font-medium truncate">{user?.name}</div>
        <div className="text-xs text-gray-500 capitalize mt-0.5">{user?.role}</div>
      </div>
    </aside>
  );
}
