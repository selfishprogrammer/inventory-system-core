import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

interface Props { onMenuClick: () => void }

export default function Navbar({ onMenuClick }: Props) {
  const { user, logout } = useAuth();
  const socketCtx = useSocket();
  const navigate = useNavigate();

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">☰</button>
        <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
          <span className={`w-2 h-2 rounded-full ${socketCtx?.connected ? 'bg-green-500' : 'bg-gray-300'}`} title={socketCtx?.connected ? 'Real-time connected' : 'Connecting...'} />
          <span>{socketCtx?.connected ? 'Live' : 'Offline'}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-gray-900">{user?.name}</div>
          <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1">Logout</button>
      </div>
    </header>
  );
}
