import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  on: (event: string, handler: (...args: unknown[]) => void) => (() => void) | undefined;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, tenant } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user || !tenant) return;

    const socket = io(
      (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? window.location.origin,
      { withCredentials: true }
    );

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-tenant', tenant._id);
    });

    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id, tenant?._id]);

  const on = (event: string, handler: (...args: unknown[]) => void): (() => void) | undefined => {
    if (!socketRef.current) return undefined;
    socketRef.current.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  };

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = (): SocketContextValue | null => useContext(SocketContext);
