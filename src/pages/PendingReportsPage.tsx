import React, { useState, useEffect } from 'react';
import { getQueuedReports, removeQueuedReport, flushQueue, QueuedReport } from '../utils/syncEngine';
import { RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export const PendingReportsPage: React.FC = () => {
  const [reports, setReports] = useState<QueuedReport[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const loadQueue = async () => {
    const list = await getQueuedReports();
    setReports(list);
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await flushQueue();
    await loadQueue();
    setIsSyncing(false);
  };

  const handleDiscard = async (clientId: string) => {
    await removeQueuedReport(clientId);
    await loadQueue();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading">Pending Offline Queue</h1>
          <p className="text-sm text-ink-600">Local reports saved on device waiting to sync with central DB</p>
        </div>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-2 bg-river-600 hover:bg-river-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-mist-200 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-tea-500 mx-auto" />
          <h3 className="font-bold text-ink-900">Queue is Clear</h3>
          <p className="text-sm text-ink-600">All field reports have been synced with the central server.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((item) => (
            <div key={item.clientId} className="bg-white p-5 rounded-xl border border-mist-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-river-700">{item.clientId}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    item.status === 'Synced' ? 'bg-tea-100 text-tea-500' :
                    item.status === 'Syncing' ? 'bg-sky-500/10 text-sky-500' :
                    item.status === 'Failed' ? 'bg-rust-100 text-rust-600' :
                    'bg-marigold-100 text-marigold-500'
                  }`}>
                    {item.status}
                  </span>
                  <span className="text-xs text-ink-400 font-mono">
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm font-medium text-ink-900">
                  {item.payload.type} (Severity Level {item.payload.severity})
                </div>
                <p className="text-xs text-ink-600">{item.payload.note || 'No note'}</p>
                {item.errorReason && (
                  <div className="text-xs text-rust-600 flex items-center gap-1 font-mono">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {item.errorReason}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDiscard(item.clientId)}
                  className="p-2 border border-rust-100 text-rust-600 hover:bg-rust-100 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                  title="Discard"
                >
                  <Trash2 className="w-4 h-4" />
                  Discard
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
