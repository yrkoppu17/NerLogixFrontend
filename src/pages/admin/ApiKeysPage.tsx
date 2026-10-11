import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiKeys, createApiKey, deleteApiKey, ApiKeyItem } from '../../api/admin';
import { getErrorMessage } from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { Key, Trash2, Plus, Copy, Check } from 'lucide-react';

export const ApiKeysPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['admin-api-keys'],
    queryFn: getApiKeys,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createApiKey(name),
    onSuccess: (data) => {
      setGeneratedRawKey(data.apiKey);
      setNewKeyName('');
      success('API Key generated');
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteApiKey(id),
    onSuccess: () => {
      success('API Key revoked');
      queryClient.invalidateQueries({ queryKey: ['admin-api-keys'] });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const handleCopy = () => {
    if (generatedRawKey) {
      navigator.clipboard.writeText(generatedRawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 font-heading">Integration API Keys</h1>
        <p className="text-sm text-ink-600">Generate credentials for external transport, weather, and asset monitoring systems</p>
      </div>

      {/* Generate API Key Card */}
      <div className="bg-white p-6 rounded-2xl border border-mist-200 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-ink-900">Create New Integration Key</h3>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. State Disaster Monitoring System"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 px-4 py-2 border border-mist-200 rounded-xl text-sm bg-white"
          />
          <button
            onClick={() => createMutation.mutate(newKeyName)}
            disabled={!newKeyName || createMutation.isPending}
            className="px-4 py-2 bg-river-600 hover:bg-river-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Generate Key
          </button>
        </div>

        {/* Display generated key modal/alert */}
        {generatedRawKey && (
          <div className="p-4 bg-tea-50 border border-tea-300 rounded-xl space-y-2">
            <div className="text-xs font-bold text-tea-700">Save your API key now (it will not be shown again):</div>
            <div className="flex items-center justify-between font-mono bg-white p-2.5 rounded-lg border border-tea-200 text-sm font-bold text-ink-900">
              <span>{generatedRawKey}</span>
              <button onClick={handleCopy} className="p-1 text-tea-600 hover:text-tea-700">
                {copied ? <Check className="w-4 h-4 text-tea-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* API Keys Table */}
      {isLoading ? (
        <div className="py-12 text-center text-ink-600">Loading API keys...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-mist-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-mist-50 border-b border-mist-200 text-ink-500 font-medium text-xs uppercase">
                  <th className="p-4">Key Name</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4">Last Used</th>
                  <th className="p-4 text-right">Revoke</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-100">
                {keys?.map((k: ApiKeyItem) => (
                  <tr key={k.id} className="hover:bg-mist-50">
                    <td className="p-4 font-semibold text-ink-900 flex items-center gap-2">
                      <Key className="w-4 h-4 text-marigold-500" /> {k.name}
                    </td>
                    <td className="p-4 text-ink-600 font-mono text-xs">{new Date(k.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-ink-600 font-mono text-xs">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'Never'}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => deleteMutation.mutate(k.id)}
                        className="p-1.5 text-rust-600 hover:bg-rust-50 rounded-lg transition"
                        title="Revoke Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
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
