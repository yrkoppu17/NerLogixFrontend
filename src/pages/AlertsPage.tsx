import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlerts, ackAlert, resolveAlert, AlertItem } from '../api/alerts';
import { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN';

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['alerts', statusFilter, typeFilter],
    queryFn: () => getAlerts({ status: statusFilter, type: typeFilter }),
  });

  const ackMutation = useMutation({
    mutationFn: ackAlert,
    onSuccess: () => {
      success('Alert acknowledged');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => {
      success('Alert resolved');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const parseJsonText = (json: string): string => {
    try {
      const parsed = typeof json === 'string' ? JSON.parse(json) : json;
      if (typeof parsed === 'object' && parsed !== null) {
        const lang = user?.language || 'en';
        return parsed[lang] || parsed.en || Object.values(parsed)[0] || String(json);
      }
      return String(parsed);
    } catch {
      return json;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading">Instant Alert Notifications</h1>
          <p className="text-sm text-ink-600">Rule-based emergency and operational risk alerts</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 border border-mist-200 rounded-lg hover:bg-mist-100 text-ink-600 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-mist-200 flex flex-wrap gap-4 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm text-ink-900 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm text-ink-900 bg-white"
        >
          <option value="">All Types</option>
          <option value="ROAD_BLOCKED">ROAD_BLOCKED</option>
          <option value="DISTRICT_INACCESSIBLE">DISTRICT_INACCESSIBLE</option>
          <option value="DELIVERY_DELAYED">DELIVERY_DELAYED</option>
          <option value="HIGH_RISK_CORRIDOR">HIGH_RISK_CORRIDOR</option>
          <option value="EMERGENCY">EMERGENCY</option>
        </select>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="text-center py-12 text-ink-600">Loading alerts...</div>
      ) : isError ? (
        <div className="text-center py-12 text-rust-600">
          {getErrorMessage(queryError)} <button onClick={() => refetch()} className="underline ml-2">Retry</button>
        </div>
      ) : data?.content.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-mist-200 text-ink-600">No alerts found.</div>
      ) : (
        <div className="space-y-4">
          {data?.content.map((alert: AlertItem) => (
            <div key={alert.id} className="bg-white p-5 rounded-xl border border-mist-200 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    alert.severity === 'CRITICAL' ? 'bg-rust-600 text-white' :
                    alert.severity === 'WARNING' ? 'bg-marigold-500 text-white' :
                    'bg-sky-500 text-white'
                  }`}>
                    {alert.severity}
                  </span>
                  <span className="font-bold text-sm text-ink-900">{parseJsonText(alert.title)}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    alert.status === 'OPEN' ? 'bg-rust-100 text-rust-600' :
                    alert.status === 'ACKNOWLEDGED' ? 'bg-marigold-100 text-marigold-500' :
                    'bg-tea-100 text-tea-500'
                  }`}>
                    {alert.status}
                  </span>
                </div>
                <span className="text-xs text-ink-400 font-mono">
                  {new Date(alert.createdAt).toLocaleString()}
                </span>
              </div>

              <p className="text-sm text-ink-600">{parseJsonText(alert.message)}</p>

              {isModeratorOrAdmin && alert.status !== 'RESOLVED' && (
                <div className="flex justify-end gap-2 pt-2 border-t border-mist-100">
                  {alert.status === 'OPEN' && (
                    <button
                      onClick={() => ackMutation.mutate(alert.id)}
                      disabled={ackMutation.isPending}
                      className="px-3 py-1.5 border border-marigold-500 text-marigold-500 hover:bg-marigold-100 rounded-lg text-xs font-medium transition"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => resolveMutation.mutate(alert.id)}
                    disabled={resolveMutation.isPending}
                    className="px-3 py-1.5 bg-tea-500 hover:bg-tea-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolve Alert
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
