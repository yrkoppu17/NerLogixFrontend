import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { flushQueue } from '../utils/syncEngine';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      flushQueue();
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-rust-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md z-50 sticky top-0">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>You are currently offline. Field reports and GPS fixes will be saved locally on your device and auto-synced upon reconnecting.</span>
      </div>
      <button
        onClick={() => flushQueue()}
        className="px-2.5 py-1 bg-rust-700 hover:bg-rust-800 rounded font-semibold text-[11px] flex items-center gap-1 transition"
      >
        <RefreshCw className="w-3 h-3" />
        Try Sync
      </button>
    </div>
  );
};
