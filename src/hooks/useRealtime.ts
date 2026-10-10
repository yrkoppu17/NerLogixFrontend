import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function useRealtime(onEvent?: (event: string, data: unknown) => void) {
  const { user } = useAuth();

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken || !user) return;

    // Use EventSource with query param token fallback for SSE
    const url = `/api/realtime/stream?token=${encodeURIComponent(accessToken)}`;
    const eventSource = new EventSource(url);

    const eventNames = [
      'vehicle.update',
      'alert.created',
      'alert.updated',
      'shipment.updated',
      'incident.created',
      'incident.updated',
      'road.updated',
      'notification.created',
      'emergency.changed',
      'weather.updated'
    ];

    eventNames.forEach(eventName => {
      eventSource.addEventListener(eventName, (e: MessageEvent) => {
        try {
          const parsedData = JSON.parse(e.data);
          onEvent?.(eventName, parsedData);
        } catch {
          onEvent?.(eventName, e.data);
        }
      });
    });

    return () => {
      eventSource.close();
    };
  }, [user, onEvent]);
}
