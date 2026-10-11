import { useEffect, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiBaseUrl, isJwtExpired } from '../api/axios';

export function useRealtimeStream() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    if (!token || !user || isJwtExpired(token)) {
      setIsConnected(false);
      return;
    }

    const controller = new AbortController();

    const connectSSE = async () => {
      try {
        await fetchEventSource(`${apiBaseUrl}/realtime/stream`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
          onopen: async (response) => {
            if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
              setIsConnected(true);
            } else {
              setIsConnected(false);
              if (response.status === 401 || response.status === 403) {
                // Token invalid or expired: abort immediately to prevent infinite retry loops
                controller.abort();
              }
            }
          },
          onmessage: (event) => {
            const eventType = event.event;
            // Invalidate relevant TanStack Query keys based on SSE event
            if (eventType === 'alert.created' || eventType === 'alert.updated') {
              queryClient.invalidateQueries({ queryKey: ['alerts'] });
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            } else if (eventType === 'incident.created' || eventType === 'incident.updated') {
              queryClient.invalidateQueries({ queryKey: ['incidents'] });
              queryClient.invalidateQueries({ queryKey: ['map'] });
              queryClient.invalidateQueries({ queryKey: ['roads'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            } else if (eventType === 'road.updated') {
              queryClient.invalidateQueries({ queryKey: ['roads'] });
              queryClient.invalidateQueries({ queryKey: ['map'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            } else if (eventType === 'shipment.updated' || eventType === 'vehicle.update') {
              queryClient.invalidateQueries({ queryKey: ['shipments'] });
              queryClient.invalidateQueries({ queryKey: ['vehicles'] });
              queryClient.invalidateQueries({ queryKey: ['map'] });
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            } else if (eventType === 'weather.updated') {
              queryClient.invalidateQueries({ queryKey: ['weather'] });
              queryClient.invalidateQueries({ queryKey: ['map'] });
              queryClient.invalidateQueries({ queryKey: ['roads'] });
            } else if (eventType === 'notification.created') {
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } else if (eventType === 'emergency.changed') {
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              queryClient.invalidateQueries({ queryKey: ['settings'] });
            }
          },
          onerror: (err) => {
            setIsConnected(false);
            if (controller.signal.aborted) {
              return;
            }
            // Allow fetchEventSource to retry with default backoff unless aborted
            throw err;
          },
          onclose: () => {
            setIsConnected(false);
          },
        });
      } catch {
        setIsConnected(false);
      }
    };

    connectSSE();

    return () => {
      controller.abort();
      setIsConnected(false);
    };
  }, [token, user, queryClient]);

  return { isConnected };
}
