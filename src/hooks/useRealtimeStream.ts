import { useRealtimeHub } from '../realtime/RealtimeProvider';

export function useRealtimeStream() {
  const { status, lastPingAt } = useRealtimeHub();

  return {
    isConnected: status === 'connected',
    status,
    lastPingAt,
  };
}
