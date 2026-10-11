import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiBaseUrl, isJwtExpired } from '../api/axios';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export function useRealtime(onEvent?: (event: string, data: unknown) => void) {
  const { user } = useAuth();

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken || !user || isJwtExpired(accessToken)) return;

    const controller = new AbortController();

    fetchEventSource(`${apiBaseUrl}/realtime/stream`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'text/event-stream',
      },
      signal: controller.signal,
      onopen: async (response) => {
        if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream')) {
          if (response.status === 401 || response.status === 403) {
            controller.abort();
          }
        }
      },
      onmessage: (event) => {
        if (event.event && onEvent) {
          try {
            const parsedData = JSON.parse(event.data);
            onEvent(event.event, parsedData);
          } catch {
            onEvent(event.event, event.data);
          }
        }
      },
      onerror: (err) => {
        if (controller.signal.aborted) return;
        throw err;
      },
    }).catch(() => {});

    return () => {
      controller.abort();
    };
  }, [user, onEvent]);
}
