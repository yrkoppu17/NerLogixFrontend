import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiBaseUrl, isJwtExpired } from '../api/axios';
import { createEventHandlerMap } from './eventHandlers';

type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

interface RealtimeContextValue {
  status: RealtimeStatus;
  lastPingAt: Date | null;
  subscribe: (event: string, handler: (data: any) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: 'disconnected',
  lastPingAt: null,
  subscribe: () => () => {},
});

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const [lastPingAt, setLastPingAt] = useState<Date | null>(null);

  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const handlerMapRef = useRef(createEventHandlerMap(queryClient, toast));

  // Update handler map if toast or queryClient changes
  useEffect(() => {
    handlerMapRef.current = createEventHandlerMap(queryClient, toast);
  }, [queryClient, toast]);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set());
    }
    subscribersRef.current.get(event)!.add(handler);

    return () => {
      subscribersRef.current.get(event)?.delete(handler);
    };
  }, []);

  // Multi-tab BroadcastChannel listener
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('nerlogix_sync');
    channel.onmessage = (msgEvent) => {
      const { event, data } = msgEvent.data || {};
      if (event) {
        subscribersRef.current.get(event)?.forEach((fn) => {
          try {
            fn(data);
          } catch (e) {
            console.error('Error in multi-tab subscriber:', e);
          }
        });
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken || !user || isJwtExpired(accessToken)) {
      setStatus('disconnected');
      return;
    }

    let isAborted = false;
    const controller = new AbortController();
    let retryDelay = 1000;

    setStatus('connecting');

    const connectSSE = async () => {
      try {
        await fetchEventSource(`${apiBaseUrl}/realtime/stream`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
          openWhenHidden: true,
          onopen: async (response) => {
            if (isAborted) return;
            if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
              setStatus('connected');
              retryDelay = 1000; // Reset backoff on success
            } else if (response.status === 401 || response.status === 403) {
              setStatus('disconnected');
              controller.abort();
            } else {
              setStatus('connecting');
            }
          },
          onmessage: (msg) => {
            if (isAborted) return;
            const eventName = msg.event || 'message';

            if (eventName === 'ping') {
              setLastPingAt(new Date());
              return;
            }
            if (eventName === 'connected') {
              setStatus('connected');
              return;
            }

            let parsed: any = msg.data;
            try {
              parsed = JSON.parse(msg.data);
            } catch {
              // keep as string
            }

            // Central query patching and toasts
            handlerMapRef.current.handleEvent(eventName, parsed);

            // Component-specific subscribers
            const handlers = subscribersRef.current.get(eventName);
            if (handlers) {
              handlers.forEach((h) => {
                try {
                  h(parsed);
                } catch (err) {
                  console.error(`Error in listener for ${eventName}:`, err);
                }
              });
            }
          },
          onerror: (_err) => {
            if (controller.signal.aborted || isAborted) return;
            setStatus('connecting');
            // Backoff up to 30s
            const delay = retryDelay;
            retryDelay = Math.min(30000, retryDelay * 2);
            // DO NOT throw error here, return retry delay
            return delay;
          },
        });
      } catch (e) {
        if (!isAborted) {
          setStatus('disconnected');
        }
      }
    };

    connectSSE();

    return () => {
      isAborted = true;
      controller.abort();
      setStatus('disconnected');
    };
  }, [user]);

  return (
    <RealtimeContext.Provider value={{ status, lastPingAt, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeHub = () => useContext(RealtimeContext);
