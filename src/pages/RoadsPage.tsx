import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoads, updateRoadStatus, RoadSegmentDto, RoadParams } from '../api/roads';
import { useAuth } from '../context/AuthContext';
import { Search, AlertTriangle } from 'lucide-react';

export const RoadsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [params, setParams] = useState<RoadParams>({
    status: '',
    state: '',
    assetType: '',
    risk: '',
    q: '',
    page: 0,
    size: 20
  });

  const [editingSegment, setEditingSegment] = useState<RoadSegmentDto | null>(null);
  const [newStatus, setNewStatus] = useState<'OPEN' | 'RESTRICTED' | 'BLOCKED'>('OPEN');
  const [reason, setReason] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['roads', params],
    queryFn: () => getRoads(params)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: 'OPEN' | 'RESTRICTED' | 'BLOCKED'; reason: string }) =>
      updateRoadStatus(id, { status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roads'] });
      setEditingSegment(null);
      setReason('');
      setUpdateError(null);
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setUpdateError(errorObj.response?.data?.message || 'Failed to update road status');
    }
  });

  const handleOpenEditModal = (segment: RoadSegmentDto) => {
    setEditingSegment(segment);
    setNewStatus(segment.status);
    setReason(segment.statusReason || '');
    setUpdateError(null);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSegment) return;
    if (newStatus === 'BLOCKED' && !reason.trim()) {
      setUpdateError('A reason is required when blocking a road');
      return;
    }
    updateMutation.mutate({ id: editingSegment.id, status: newStatus, reason: reason.trim() });
  };

  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-tea-100 text-tea-500">
            <span className="w-1.5 h-1.5 rounded-full bg-tea-500"></span>
            OPEN
          </span>
        );
      case 'RESTRICTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-marigold-100 text-marigold-500">
            <span className="w-1.5 h-1.5 rounded-full bg-marigold-500"></span>
            RESTRICTED
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rust-100 text-rust-600">
            <span className="w-1.5 h-1.5 rounded-full bg-rust-600"></span>
            BLOCKED
          </span>
        );
      default:
        return <span className="text-ink-600">{status}</span>;
    }
  };

  const getRiskBadge = (score: number) => {
    let colorClass = 'bg-tea-100 text-tea-500';
    let label = 'LOW';
    if (score >= 80) {
      colorClass = 'bg-rust-100 text-rust-600 font-bold';
      label = 'CRITICAL';
    } else if (score >= 60) {
      colorClass = 'bg-marigold-100 text-marigold-500 font-semibold';
      label = 'HIGH';
    } else if (score >= 35) {
      colorClass = 'bg-marigold-100 text-marigold-500';
      label = 'MEDIUM';
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${colorClass}`}>
        <span className="font-mono">{Math.round(score)}</span> ({label})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink-900">Road Corridor & Status Management</h1>
          <p className="text-sm text-ink-600">
            Monitor road accessibility, bridges, passes and issue blocked route status overrides.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-mist-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
            <input
              type="text"
              placeholder="Search highway, corridor, city..."
              value={params.q || ''}
              onChange={(e) => setParams({ ...params, q: e.target.value, page: 0 })}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-mist-200 focus:outline-none focus:ring-2 focus:ring-river-600 bg-mist-50"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={params.status || ''}
              onChange={(e) => setParams({ ...params, status: e.target.value, page: 0 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-mist-200 bg-mist-50 text-ink-900 focus:outline-none focus:ring-2 focus:ring-river-600"
            >
              <option value="">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="RESTRICTED">RESTRICTED</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>
          </div>

          {/* Asset Type filter */}
          <div>
            <select
              value={params.assetType || ''}
              onChange={(e) => setParams({ ...params, assetType: e.target.value, page: 0 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-mist-200 bg-mist-50 text-ink-900 focus:outline-none focus:ring-2 focus:ring-river-600"
            >
              <option value="">All Types</option>
              <option value="ROAD">Road</option>
              <option value="BRIDGE">Bridge</option>
              <option value="PASS">Mountain Pass</option>
            </select>
          </div>

          {/* Risk filter */}
          <div>
            <select
              value={params.risk || ''}
              onChange={(e) => setParams({ ...params, risk: e.target.value, page: 0 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-mist-200 bg-mist-50 text-ink-900 focus:outline-none focus:ring-2 focus:ring-river-600"
            >
              <option value="">All Risk Levels</option>
              <option value="LOW">LOW (&lt; 35)</option>
              <option value="MEDIUM">MEDIUM (35–59)</option>
              <option value="HIGH">HIGH (60–79)</option>
              <option value="CRITICAL">CRITICAL (≥ 80)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-mist-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-ink-600">Loading road network data...</div>
        ) : isError ? (
          <div className="p-8 text-center text-rust-600 flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8" />
            <p>Failed to load roads data.</p>
            <button
              onClick={() => refetch()}
              className="mt-2 px-4 py-1.5 bg-river-600 text-white rounded-lg text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : data?.content.length === 0 ? (
          <div className="p-8 text-center text-ink-600">No road segments match the filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-mist-100 border-b border-mist-200 text-ink-600 font-medium">
                  <th className="py-3 px-4">Highway / Corridor</th>
                  <th className="py-3 px-4">Asset Type</th>
                  <th className="py-3 px-4">From → To</th>
                  <th className="py-3 px-4">Length</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Status Reason / Details</th>
                  {isModeratorOrAdmin && <th className="py-3 px-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-mist-200">
                {data?.content.map((segment) => (
                  <tr key={segment.id} className="hover:bg-mist-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-ink-900">
                      <div>{segment.name}</div>
                      <div className="text-xs text-ink-400 font-mono">{segment.highwayCode || 'Local'}</div>
                    </td>
                    <td className="py-3 px-4 text-ink-600">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-mist-100 font-medium text-ink-900">
                        {segment.assetType === 'BRIDGE' ? '🌉 BRIDGE' : segment.assetType === 'PASS' ? '⛰️ PASS' : '🛣️ ROAD'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink-600 text-xs">
                      {segment.fromNodeName} → {segment.toNodeName}
                    </td>
                    <td className="py-3 px-4 text-ink-900 font-mono text-xs">
                      {segment.lengthKm} km
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(segment.status)}</td>
                    <td className="py-3 px-4">{getRiskBadge(segment.riskScore)}</td>
                    <td className="py-3 px-4 text-xs text-ink-600 max-w-xs truncate">
                      {segment.statusReason || (segment.landslideProne ? 'Landslide prone terrain' : 'Normal conditions')}
                    </td>
                    {isModeratorOrAdmin && (
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEditModal(segment)}
                          className="px-3 py-1 bg-river-100 text-river-700 hover:bg-river-600 hover:text-white transition-colors rounded text-xs font-semibold"
                        >
                          Change status
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-mist-200 flex items-center justify-between text-xs text-ink-600">
            <div>
              Showing {data.page * data.size + 1} to {Math.min((data.page + 1) * data.size, data.totalElements)} of{' '}
              {data.totalElements} corridors
            </div>
            <div className="flex gap-2">
              <button
                disabled={data.page === 0}
                onClick={() => setParams({ ...params, page: data.page - 1 })}
                className="px-3 py-1.5 border border-mist-200 rounded disabled:opacity-50 hover:bg-mist-100"
              >
                Previous
              </button>
              <button
                disabled={data.page >= data.totalPages - 1}
                onClick={() => setParams({ ...params, page: data.page + 1 })}
                className="px-3 py-1.5 border border-mist-200 rounded disabled:opacity-50 hover:bg-mist-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Status Modal */}
      {editingSegment && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-mist-200 shadow-xl animate-in fade-in zoom-in duration-150">
            <h2 className="text-xl font-bold text-ink-900 font-heading">Update Road Status</h2>
            <p className="text-xs text-ink-600">
              Modifying status for <strong className="text-ink-900">{editingSegment.name}</strong> ({editingSegment.highwayCode}). This action is logged in audit history and broadcast live via SSE.
            </p>

            {updateError && (
              <div className="p-3 bg-rust-100 text-rust-600 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">New Status</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewStatus('OPEN')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      newStatus === 'OPEN'
                        ? 'bg-tea-500 text-white border-tea-500 shadow-xs'
                        : 'border-mist-200 text-ink-600 hover:bg-mist-100'
                    }`}
                  >
                    OPEN
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('RESTRICTED')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      newStatus === 'RESTRICTED'
                        ? 'bg-marigold-500 text-white border-marigold-500 shadow-xs'
                        : 'border-mist-200 text-ink-600 hover:bg-mist-100'
                    }`}
                  >
                    RESTRICTED
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewStatus('BLOCKED')}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                      newStatus === 'BLOCKED'
                        ? 'bg-rust-600 text-white border-rust-600 shadow-xs'
                        : 'border-mist-200 text-ink-600 hover:bg-mist-100'
                    }`}
                  >
                    BLOCKED
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">
                  Reason for Status Change {newStatus === 'BLOCKED' && <span className="text-rust-600">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe the cause (e.g. Landslide at km 42, flood overflow, bridge repair)..."
                  className="w-full text-xs p-3 border border-mist-200 rounded-lg bg-mist-50 focus:outline-none focus:ring-2 focus:ring-river-600 text-ink-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSegment(null)}
                  className="px-4 py-2 text-xs font-medium text-ink-600 hover:bg-mist-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-xs font-medium bg-river-600 hover:bg-river-700 text-white rounded-lg disabled:opacity-50 shadow-xs"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default RoadsPage;
