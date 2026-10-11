import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDispatchBoard,
  getDispatchCandidates,
  assignShipment,
  unassignShipment,
  DriverCandidate,
  DispatchAssignment,
} from '../api/dispatch';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../api/axios';
import {
  Compass,
  Truck,
  User,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  X,
  Package,
} from 'lucide-react';

export const DispatchBoardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);

  const { data: boardData, isLoading: isLoadingBoard, refetch } = useQuery({
    queryKey: ['dispatch'],
    queryFn: getDispatchBoard,
  });

  const { data: candidates = [], isLoading: isLoadingCandidates } = useQuery<DriverCandidate[]>({
    queryKey: ['dispatchCandidates', selectedShipment?.id],
    queryFn: () => getDispatchCandidates(selectedShipment.id),
    enabled: !!selectedShipment,
  });

  const assignMutation = useMutation({
    mutationFn: assignShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      success(`Shipment assigned to driver! Notification dispatched via SSE.`);
      setSelectedShipment(null);
    },
    onError: (err: any) => {
      toastError(getErrorMessage(err));
    },
  });

  const unassignMutation = useMutation({
    mutationFn: unassignShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatch'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      success('Shipment unassigned successfully');
    },
    onError: (err: any) => {
      toastError(getErrorMessage(err));
    },
  });

  const unassigned = boardData?.unassignedShipments || [];
  const pending = boardData?.pendingAssignments || [];
  const recent = boardData?.recentAccepted || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading flex items-center gap-2">
            <Compass className="w-6 h-6 text-river-600" />
            <span>Moderator Dispatch Control</span>
          </h1>
          <p className="text-sm text-ink-600">
            Realtime suitability engine matching cargo shipments with optimal drivers & vehicles across NE corridors
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-mist-300 hover:bg-mist-100 rounded-lg text-xs font-semibold text-ink-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Board</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-mist-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Unassigned Shipments</span>
            <div className="text-2xl font-black text-ink-900 mt-0.5">{unassigned.length}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-marigold-100 flex items-center justify-center text-marigold-700">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mist-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Pending Driver Response</span>
            <div className="text-2xl font-black text-ink-900 mt-0.5">{pending.length}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-river-100 flex items-center justify-center text-river-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-mist-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Dispatched & Active</span>
            <div className="text-2xl font-black text-ink-900 mt-0.5">{recent.length}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-tea-100 flex items-center justify-center text-tea-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Queue & Live Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Unassigned Queue */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-mist-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-mist-100 pb-3">
            <h2 className="text-base font-bold text-ink-900 font-heading">
              Awaiting Driver Match ({unassigned.length})
            </h2>
            <span className="text-xs text-ink-500 font-medium">Ranked by Priority</span>
          </div>

          {isLoadingBoard ? (
            <div className="text-center py-10 text-xs text-ink-400">Loading queue...</div>
          ) : unassigned.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-mist-200 rounded-xl text-xs text-ink-500">
              <CheckCircle2 className="w-8 h-8 text-tea-500 mx-auto mb-2" />
              <p className="font-semibold text-ink-800">All shipments dispatched!</p>
              <p className="mt-0.5 text-ink-500">No unassigned cargo batches waiting in the queue.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unassigned.map((s: any) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-mist-200 hover:border-river-400 bg-mist-50/50 hover:bg-white transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-ink-900">{s.code || '#' + s.id}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-river-100 text-river-800 uppercase">
                        {s.cargoCategory}
                      </span>
                      {s.priority === 'EMERGENCY' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rust-100 text-rust-800 uppercase animate-pulse">
                          EMERGENCY
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-700 font-medium">
                      {s.cargoDescription || 'Essential goods payload'}
                    </div>
                    <div className="text-xs text-ink-500 flex items-center gap-2 pt-0.5">
                      <span>Weight: <strong className="text-ink-700">{s.weightKg} kg</strong></span>
                      <span>•</span>
                      <span>{s.originNodeName || 'Guwahati'} → {s.destinationNodeName || 'Imphal'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedShipment(s)}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-marigold-300" />
                    <span>Find Driver Match</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Assignments Feed */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-mist-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-mist-100 pb-3">
            <h2 className="text-base font-bold text-ink-900 font-heading">
              Active Dispatches ({pending.length + recent.length})
            </h2>
            <span className="text-xs text-ink-500 font-medium">Live SSE Updates</span>
          </div>

          <div className="space-y-3">
            {pending.map((a: DispatchAssignment) => (
              <div key={a.id} className="p-3.5 rounded-xl border border-river-200 bg-river-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-river-900">{a.shipmentCode}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-marigold-200 text-marigold-900 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pending Driver
                  </span>
                </div>
                <div className="text-xs text-ink-700">
                  Driver: <strong className="text-ink-900">{a.driverName}</strong> • Vehicle: <strong className="font-mono">{a.vehicleRegNo}</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-ink-500 pt-1 border-t border-river-100">
                  <span>{a.originName} → {a.destinationName} ({a.weightKg} kg)</span>
                  <button
                    onClick={() => {
                      if (window.confirm(`Unassign shipment ${a.shipmentCode}?`)) {
                        unassignMutation.mutate(a.shipmentId);
                      }
                    }}
                    disabled={unassignMutation.isPending}
                    className="text-rust-600 hover:text-rust-800 font-semibold underline"
                  >
                    Unassign
                  </button>
                </div>
              </div>
            ))}

            {recent.map((a: DispatchAssignment) => (
              <div key={a.id} className="p-3.5 rounded-xl border border-tea-200 bg-tea-50/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-tea-950">{a.shipmentCode}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tea-200 text-tea-900 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Accepted
                  </span>
                </div>
                <div className="text-xs text-ink-700">
                  Driver: <strong className="text-ink-900">{a.driverName}</strong> • Vehicle: <strong className="font-mono">{a.vehicleRegNo}</strong>
                </div>
                <div className="flex justify-end pt-1 border-t border-tea-100">
                  <button
                    onClick={() => {
                      if (window.confirm(`Unassign shipment ${a.shipmentCode}?`)) {
                        unassignMutation.mutate(a.shipmentId);
                      }
                    }}
                    disabled={unassignMutation.isPending}
                    className="text-[11px] text-rust-600 hover:text-rust-800 font-semibold underline"
                  >
                    Unassign
                  </button>
                </div>
              </div>
            ))}

            {pending.length === 0 && recent.length === 0 && (
              <div className="text-center py-10 text-xs text-ink-400">No active dispatches yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Suitability Drawer / Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-mist-300 animate-slide-up">
            {/* Modal Header */}
            <div className="p-5 border-b border-mist-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-ink-900 font-heading flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-river-600" />
                  <span>Suitability Match: {selectedShipment.code}</span>
                </h3>
                <p className="text-xs text-ink-600">
                  Payload: <strong>{selectedShipment.weightKg} kg</strong> • Route: <strong>{selectedShipment.originNodeName} → {selectedShipment.destinationNodeName}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="p-1.5 text-ink-400 hover:text-ink-700 rounded-lg hover:bg-mist-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidates List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {isLoadingCandidates ? (
                <div className="text-center py-12 text-xs text-ink-400">
                  Evaluating driver locations, vehicle capacities, and road constraints...
                </div>
              ) : candidates.length === 0 ? (
                <div className="text-center py-12 text-xs text-rust-600">
                  No eligible drivers/vehicles found with capacity &gt;= {selectedShipment.weightKg} kg.
                </div>
              ) : (
                candidates.map((c) => (
                  <div
                    key={`${c.driverUserId}-${c.vehicleId}`}
                    className="p-4 rounded-xl border border-mist-200 hover:border-river-500 bg-mist-50/40 hover:bg-white transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            c.matchScore >= 80
                              ? 'bg-tea-100 text-tea-800 border border-tea-300'
                              : c.matchScore >= 60
                              ? 'bg-river-100 text-river-800 border border-river-300'
                              : 'bg-marigold-100 text-marigold-800 border border-marigold-300'
                          }`}
                        >
                          {c.matchScore}%
                        </div>
                        <div>
                          <div className="font-bold text-sm text-ink-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-ink-400" />
                            <span>{c.driverName}</span>
                          </div>
                          <div className="text-xs text-ink-500 flex items-center gap-1.5">
                            <Truck className="w-3 h-3 text-ink-400" />
                            <span className="font-mono">{c.vehicleRegNo}</span> ({c.vehicleType}) • Capacity: <strong className="text-ink-700">{c.vehicleCapacityKg} kg</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1 pl-11">
                        {c.matchReasons.map((r, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-mist-200 text-ink-700"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        assignMutation.mutate({
                          shipmentId: selectedShipment.id,
                          driverUserId: c.driverUserId,
                          vehicleId: c.vehicleId,
                        })
                      }
                      disabled={assignMutation.isPending}
                      className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      <span>Assign</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-mist-200 bg-mist-50 flex justify-end">
              <button
                onClick={() => setSelectedShipment(null)}
                className="px-4 py-2 border border-mist-300 rounded-lg text-xs font-semibold text-ink-700 hover:bg-mist-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
