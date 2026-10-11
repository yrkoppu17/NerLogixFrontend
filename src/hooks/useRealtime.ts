import { useEffect } from 'react';
import { useRealtimeHub } from '../realtime/RealtimeProvider';

export function useRealtime(onEvent?: (event: string, data: unknown) => void) {
  const { subscribe } = useRealtimeHub();

  useEffect(() => {
    if (!onEvent) return;

    // Listen to all common events or pass custom handler
    const eventNames = [
      'vehicles.positions',
      'vehicle.update',
      'user.registered',
      'shipment.created',
      'shipment.updated',
      'shipment.assigned',
      'shipment.unassigned',
      'dispatch.assigned',
      'dispatch.accepted',
      'dispatch.declined',
      'incident.created',
      'incident.updated',
      'alert.created',
      'weather.updated',
    ];

    const unsubs = eventNames.map((name) =>
      subscribe(name, (data) => onEvent(name, data))
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [onEvent, subscribe]);
}
