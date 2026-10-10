import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShipments, createShipment, assignShipment, startShipment, deliverShipment, cancelShipment, Shipment } from '../api/shipments';
import { getVehicles } from '../api/vehicles';
import { getMapLocations, RoadNodeDto } from '../api/map';
import { useAuth } from '../context/AuthContext';
import { Plus, RefreshCw, X, Play, CheckCircle2, Truck, User as UserIcon, MapPin } from 'lucide-react';
import { GoogleMapEmbed } from '../components/GoogleMapEmbed';

export const ShipmentsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN';

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [expandedMapId, setExpandedMapId] = useState<number | null>(null);

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [assignModalShipment, setAssignModalShipment] = useState<Shipment | null>(null);

  // New Shipment Form State
  const [code, setCode] = useState('');
  const [cargoCategory, setCargoCategory] = useState<'MEDICINE' | 'FOOD' | 'CONSTRUCTION' | 'AGRI' | 'OTHER'>('MEDICINE');
  const [cargoDescription, setCargoDescription] = useState('');
  const [weightKg, setWeightKg] = useState('2500');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'EMERGENCY'>('NORMAL');
  const [originNodeId, setOriginNodeId] = useState<number | ''>('');
  const [destinationNodeId, setDestinationNodeId] = useState<number | ''>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');

  // Assign form state
  const [assignVehicleId, setAssignVehicleId] = useState<number | ''>('');
  const [assignDriverUserId, setAssignDriverUserId] = useState<number | ''>(user?.id || '');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['shipments', statusFilter, categoryFilter, priorityFilter, search],
    queryFn: () => getShipments({ status: statusFilter, cargoCategory: categoryFilter, priority: priorityFilter, q: search }),
  });

  const { data: locations } = useQuery<RoadNodeDto[]>({
    queryKey: ['locations'],
    queryFn: getMapLocations,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-idle'],
    queryFn: () => getVehicles({ size: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: createShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setShowCreateModal(false);
      resetForm();
    },
  });

  const assignMutation = useMutation({
    mutationFn: (vars: { id: number; vehicleId: number; driverUserId: number }) =>
      assignShipment(vars.id, vars.vehicleId, vars.driverUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setAssignModalShipment(null);
    },
  });

  const startMutation = useMutation({
    mutationFn: startShipment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shipments'] }),
  });

  const deliverMutation = useMutation({
    mutationFn: deliverShipment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shipments'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelShipment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shipments'] }),
  });

  const resetForm = () => {
    setCode('');
    setCargoCategory('MEDICINE');
    setCargoDescription('');
    setWeightKg('2500');
    setPriority('NORMAL');
    setOriginNodeId('');
    setDestinationNodeId('');
    setSelectedVehicleId('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originNodeId || !destinationNodeId) return;

    createMutation.mutate({
      code: code || undefined,
      cargoCategory,
      cargoDescription,
      weightKg: parseFloat(weightKg),
      priority,
      originNodeId: Number(originNodeId),
      destinationNodeId: Number(destinationNodeId),
      vehicleId: selectedVehicleId ? Number(selectedVehicleId) : undefined,
      driverUserId: user?.id,
    });
  };

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalShipment || !assignVehicleId || !assignDriverUserId) return;
    assignMutation.mutate({
      id: assignModalShipment.id,
      vehicleId: Number(assignVehicleId),
      driverUserId: Number(assignDriverUserId),
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading">Essential Goods Shipments</h1>
          <p className="text-sm text-ink-600">Track movement, vehicle assignment, and delivery status</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 border border-mist-200 rounded-lg hover:bg-mist-100 text-ink-600 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {isModeratorOrAdmin && (
            <button
              onClick={() => {
                if (locations && Array.isArray(locations) && locations.length > 1) {
                  setOriginNodeId(locations[0].id);
                  setDestinationNodeId(locations[1].id);
                }
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-river-600 hover:bg-river-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Create Shipment
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-mist-200 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search code or cargo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm text-ink-900 focus:outline-none focus:border-river-600 w-60"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm text-ink-900 bg-white"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="IN_TRANSIT">IN_TRANSIT</option>
          <option value="DELAYED">DELAYED</option>
          <option value="DELIVERED">DELIVERED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm text-ink-900 bg-white"
        >
          <option value="">All Categories</option>
          <option value="MEDICINE">MEDICINE</option>
          <option value="FOOD">FOOD</option>
          <option value="CONSTRUCTION">CONSTRUCTION</option>
          <option value="AGRI">AGRI</option>
          <option value="OTHER">OTHER</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm text-ink-900 bg-white"
        >
          <option value="">All Priorities</option>
          <option value="NORMAL">NORMAL</option>
          <option value="HIGH">HIGH</option>
          <option value="EMERGENCY">EMERGENCY</option>
        </select>
      </div>

      {/* Shipments List */}
      {isLoading ? (
        <div className="text-center py-12 text-ink-600">Loading shipments...</div>
      ) : isError ? (
        <div className="text-center py-12 text-rust-600">
          Failed to load shipments. <button onClick={() => refetch()} className="underline">Retry</button>
        </div>
      ) : data?.content.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-mist-200 text-ink-600">No shipments found.</div>
      ) : (
        <div className="space-y-4">
          {data?.content.map((s) => {
            const isDriver = s.driverUser?.id === user?.id;
            const canStart = (isDriver || isModeratorOrAdmin) && (s.status === 'ASSIGNED' || s.status === 'DRAFT') && s.vehicle;
            const canDeliver = (isDriver || isModeratorOrAdmin) && (s.status === 'IN_TRANSIT' || s.status === 'DELAYED');
            const canCancel = (isDriver || isModeratorOrAdmin) && s.status !== 'DELIVERED' && s.status !== 'CANCELLED';

            return (
              <div key={s.id} className="bg-white rounded-xl border border-mist-200 p-5 shadow-sm space-y-4 hover:border-river-600/30 transition">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-mist-200 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-lg text-river-700">{s.code}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      s.status === 'IN_TRANSIT' ? 'bg-tea-100 text-tea-500' :
                      s.status === 'DELAYED' ? 'bg-marigold-100 text-marigold-500' :
                      s.status === 'DELIVERED' ? 'bg-river-100 text-river-700' :
                      s.status === 'CANCELLED' ? 'bg-rust-100 text-rust-600' :
                      'bg-mist-200 text-ink-600'
                    }`}>
                      {s.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      s.priority === 'EMERGENCY' ? 'bg-rust-600 text-white font-bold' :
                      s.priority === 'HIGH' ? 'bg-marigold-500 text-white' :
                      'bg-mist-100 text-ink-600'
                    }`}>
                      {s.priority}
                    </span>
                  </div>
                  <div className="text-xs text-ink-400 font-mono">
                    Created: {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-ink-400 block mb-0.5">Cargo</span>
                    <span className="font-medium text-ink-900">{s.cargoCategory}</span>
                    <span className="text-xs text-ink-600 block">({s.weightKg?.toLocaleString()} kg) - {s.cargoDescription || 'No detail'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-ink-400 block mb-0.5">Route</span>
                    <span className="font-medium text-ink-900">{s.originNode?.name} → {s.destinationNode?.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-ink-400 block mb-0.5">Assigned Vehicle & Driver</span>
                    {s.vehicle ? (
                      <div className="flex items-center gap-1.5 font-mono text-xs text-ink-900">
                        <Truck className="w-3.5 h-3.5 text-river-600" />
                        {s.vehicle.regNo} ({s.vehicle.type})
                      </div>
                    ) : (
                      <span className="text-xs text-rust-600">Unassigned vehicle</span>
                    )}
                    {s.driverUser ? (
                      <div className="flex items-center gap-1.5 text-xs text-ink-600 mt-0.5">
                        <UserIcon className="w-3 h-3 text-ink-400" />
                        {s.driverUser.name}
                      </div>
                    ) : (
                      <span className="text-xs text-rust-600 block">Unassigned driver</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-ink-400 block mb-0.5">ETA / Progress</span>
                    <div className="w-full bg-mist-100 h-2 rounded-full overflow-hidden mb-1">
                      <div
                        className="bg-river-600 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, s.progressPct || 0))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-ink-600 font-mono">
                      <span>{Math.round(s.progressPct || 0)}%</span>
                      {s.delayMin ? <span className="text-marigold-500">+{s.delayMin}m delay</span> : null}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-mist-100">
                  <button
                    onClick={() => setExpandedMapId(expandedMapId === s.id ? null : s.id)}
                    className="px-3 py-1.5 border border-mist-200 text-ink-700 hover:bg-mist-100 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-river-600" />
                    {expandedMapId === s.id ? 'Hide Map' : 'Google Maps View'}
                  </button>
                  {isModeratorOrAdmin && (s.status === 'DRAFT' || !s.vehicle) && (
                    <button
                      onClick={() => {
                        setAssignModalShipment(s);
                        setAssignVehicleId(s.vehicle?.id || '');
                        setAssignDriverUserId(s.driverUser?.id || user?.id || '');
                      }}
                      className="px-3 py-1.5 border border-river-600 text-river-700 hover:bg-river-100 rounded-lg text-xs font-medium transition"
                    >
                      Assign Vehicle & Driver
                    </button>
                  )}
                  {canStart && (
                    <button
                      onClick={() => startMutation.mutate(s.id)}
                      disabled={startMutation.isPending}
                      className="px-3 py-1.5 bg-tea-500 hover:bg-tea-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start Convoy Trip
                    </button>
                  )}
                  {canDeliver && (
                    <button
                      onClick={() => deliverMutation.mutate(s.id)}
                      disabled={deliverMutation.isPending}
                      className="px-3 py-1.5 bg-river-600 hover:bg-river-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Delivered
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => cancelMutation.mutate(s.id)}
                      disabled={cancelMutation.isPending}
                      className="px-3 py-1.5 border border-rust-100 text-rust-600 hover:bg-rust-100 rounded-lg text-xs font-medium transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {expandedMapId === s.id && (
                  <div className="pt-2">
                    <GoogleMapEmbed
                      originLat={s.originNode.lat}
                      originLng={s.originNode.lng}
                      destLat={s.destinationNode.lat}
                      destLng={s.destinationNode.lng}
                      height="220px"
                      title={`Google Maps Driving Route - ${s.code} (${s.originNode.name} to ${s.destinationNode.name})`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Shipment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-mist-200">
            <div className="flex justify-between items-center border-b border-mist-200 pb-3">
              <h2 className="text-lg font-bold text-ink-900 font-heading">Create Essential Shipment</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-ink-400 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Category</label>
                  <select
                    value={cargoCategory}
                    onChange={(e) => setCargoCategory(e.target.value as Shipment['cargoCategory'])}
                    className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm bg-white"
                  >
                    <option value="MEDICINE">MEDICINE</option>
                    <option value="FOOD">FOOD</option>
                    <option value="CONSTRUCTION">CONSTRUCTION</option>
                    <option value="AGRI">AGRI</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Cargo Description</label>
                <input
                  type="text"
                  placeholder="e.g. Life-saving medicines and vaccines"
                  value={cargoDescription}
                  onChange={(e) => setCargoDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Shipment['priority'])}
                    className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm bg-white"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="EMERGENCY">EMERGENCY</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Origin Node</label>
                  <select
                    value={originNodeId}
                    onChange={(e) => setOriginNodeId(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm bg-white"
                  >
                    {locations?.map((n) => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Destination Node</label>
                  <select
                    value={destinationNodeId}
                    onChange={(e) => setDestinationNodeId(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm bg-white"
                  >
                    {locations?.map((n) => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Assign Vehicle (Optional)</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm bg-white font-mono"
                >
                  <option value="">Unassigned</option>
                  {vehiclesData?.content.map((v) => (
                    <option key={v.id} value={v.id}>{v.regNo} ({v.type}) - {v.status}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-mist-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-mist-200 rounded-lg text-sm font-medium text-ink-600 hover:bg-mist-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignModalShipment && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-mist-200">
            <div className="flex justify-between items-center border-b border-mist-200 pb-3">
              <h2 className="text-lg font-bold text-ink-900 font-heading">Assign Convoy Vehicle & Driver</h2>
              <button onClick={() => setAssignModalShipment(null)} className="text-ink-400 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Select Vehicle</label>
                <select
                  value={assignVehicleId}
                  onChange={(e) => setAssignVehicleId(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm bg-white font-mono"
                >
                  <option value="">Choose vehicle...</option>
                  {vehiclesData?.content.map((v) => (
                    <option key={v.id} value={v.id}>{v.regNo} ({v.type}) - {v.status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Driver User ID</label>
                <input
                  type="number"
                  required
                  value={assignDriverUserId}
                  onChange={(e) => setAssignDriverUserId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalShipment(null)}
                  className="px-4 py-2 border border-mist-200 rounded-lg text-sm font-medium text-ink-600 hover:bg-mist-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignMutation.isPending}
                  className="px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {assignMutation.isPending ? 'Assigning...' : 'Assign Convoy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
