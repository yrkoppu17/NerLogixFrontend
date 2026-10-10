import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, AuditLogItem } from '../../api/admin';
import { RefreshCw } from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => getAuditLogs(),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading">System Audit Log</h1>
          <p className="text-sm text-ink-600">Immutable record of security events, status overrides, and administrative actions</p>
        </div>
        <button onClick={() => refetch()} className="p-2 border border-mist-200 rounded-xl hover:bg-mist-100 text-ink-600">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-ink-600">Loading audit logs...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-mist-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-mist-50 border-b border-mist-200 text-ink-500 font-medium text-xs uppercase">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Actor Email</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">Target Type</th>
                  <th className="p-4">Details</th>
                  <th className="p-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100 font-mono text-xs">
                {data?.content.map((log: AuditLogItem) => (
                  <tr key={log.id} className="hover:bg-mist-50">
                    <td className="p-4 text-ink-500">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-4 font-semibold text-ink-900">{log.userEmail || 'SYSTEM'}</td>
                    <td className="p-4 text-river-600 font-bold">{log.action}</td>
                    <td className="p-4 text-ink-700">{log.targetType} #{log.targetId || ''}</td>
                    <td className="p-4 text-ink-800 font-sans">{log.details}</td>
                    <td className="p-4 text-ink-400">{log.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
