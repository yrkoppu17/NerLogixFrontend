import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { flushQueue } from '../utils/syncEngine';
import { onWarmupChange, apiBaseUrl } from '../api/axios';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isWarmingUp, setIsWarmingUp] = useState<boolean>(false);
  const [dismissedApiBanner, setDismissedApiBanner] = useState<boolean>(false);

  const isMissingApiUrl = import.meta.env.PROD && !(import.meta.env.VITE_API_BASE_URL || '').trim();

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

    const unsubscribeWarmup = onWarmupChange((warming) => {
      setIsWarmingUp(warming);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeWarmup();
    };
  }, []);

  if (isOffline) {
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
  }

  if (isWarmingUp) {
    return (
      <div className="bg-river-900 border-b border-river-700 text-river-100 px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md z-50 sticky top-0 animate-fade-in">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-river-400" />
          <span>Connecting to server — initial cloud instance warmup may take up to 45 seconds...</span>
        </div>
      </div>
    );
  }

  if (isMissingApiUrl && !dismissedApiBanner) {
    return (
      <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-md z-50 sticky top-0 animate-fade-in">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>VITE_API_BASE_URL is not explicitly configured in this production build. Using default Render backend ({apiBaseUrl}).</span>
        </div>
        <button
          onClick={() => setDismissedApiBanner(true)}
          className="px-2.5 py-0.5 bg-amber-700 hover:bg-amber-800 rounded font-semibold text-[11px] transition"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return null;
};
