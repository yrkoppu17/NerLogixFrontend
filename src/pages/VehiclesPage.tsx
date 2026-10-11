import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVehicles, createVehicle, deleteVehicle, getVehicleTrail, Vehicle, VehiclePosition } from '../api/vehicles';
import { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Truck, Plus, RefreshCw, X, MapPin } from 'lucide-react';
import { GoogleMapEmbed } from '../components/GoogleMapEmbed';

export const VehiclesPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN';

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedVehicleTrail, setSelectedVehicleTrail] = useState<{ vehicle: Vehicle; trail: VehiclePosition[] } | null>(null);

  // New vehicle form
  const [regNo, setRegNo] = useState('');
  const [vType, setVType] = useState<'TRUCK' | 'MEDICAL_VAN' | 'TANKER' | 'MINI_TRUCK'>('TRUCK');
  const [capacityKg, setCapacityKg] = useState('5000');
  const [lat, setLat] = useState('26.1445');
  const [lng, setLng] = useState('91.7362');

  const { data, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['vehicles', statusFilter, typeFilter, search],
    queryFn: () => getVehicles({ status: statusFilter, type: typeFilter, q: search }),
  });

  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      success('Vehicle created successfully');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowAddModal(false);
      setRegNo('');
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      success('Vehicle removed');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      regNo,
      type: vType,
      capacityKg: parseFloat(capacityKg),
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      status: 'IDLE',
    });
  };

  const handleViewTrail = async (v: Vehicle) => {
    try {
      const trail = await getVehicleTrail(v.id);
      setSelectedVehicleTrail({ vehicle: v, trail });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading">Vehicle Fleet</h1>
          <p className="text-sm text-ink-600">Track and manage essential goods logistics vehicles</p>
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
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-river-600 hover:bg-river-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-mist-200 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search registration no..."
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
          <option value="IDLE">IDLE</option>
          <option value="ON_TRIP">ON_TRIP</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 border border-mist-200 rounded-lg text-sm text-ink-900 bg-white"
        >
          <option value="">All Vehicle Types</option>
          <option value="TRUCK">TRUCK</option>
          <option value="MEDICAL_VAN">MEDICAL_VAN</option>
          <option value="TANKER">TANKER</option>
          <option value="MINI_TRUCK">MINI_TRUCK</option>
        </select>
      </div>

      {/* Vehicles Table */}
      {isLoading ? (
        <div className="text-center py-12 text-ink-600">Loading vehicle fleet...</div>
      ) : isError ? (
        <div className="text-center py-12 text-rust-600">
          {getErrorMessage(queryError)} <button onClick={() => refetch()} className="underline ml-2">Retry</button>
        </div>
      ) : data?.content.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-mist-200 text-ink-600">No vehicles found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-mist-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-ink-900">
            <thead className="bg-mist-100 border-b border-mist-200 text-ink-600 font-medium">
              <tr>
                <th className="px-4 py-3">Registration</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Capacity (kg)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Speed (km/h)</th>
                <th className="px-4 py-3">Last Coordinates</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist-200">
              {data?.content.map((v) => (
                <tr key={v.id} className="hover:bg-mist-50 transition">
                  <td className="px-4 py-3 font-mono font-medium">{v.regNo}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-mist-100 text-ink-900">
                      <Truck className="w-3.5 h-3.5 text-river-600" />
                      {v.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {v.ownerName ? (
                      <span className="font-semibold text-river-700">{v.ownerName}</span>
                    ) : (
                      <span className="text-ink-400 italic">Central Fleet</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">{v.capacityKg?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                      v.status === 'ON_TRIP' ? 'bg-tea-100 text-tea-500' :
                      v.status === 'MAINTENANCE' ? 'bg-marigold-100 text-marigold-500' :
                      'bg-mist-200 text-ink-600'
                    }`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono">{v.speedKmph ? Math.round(v.speedKmph) : 0}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-600">
                    {v.lat?.toFixed(4)}, {v.lng?.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleViewTrail(v)}
                      className="px-2.5 py-1 border border-mist-200 rounded text-xs hover:bg-mist-100 text-river-700 font-medium inline-flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      Trail
                    </button>
                    {isModeratorOrAdmin && (
                      <button
                        onClick={() => deleteMutation.mutate(v.id)}
                        className="px-2.5 py-1 border border-rust-100 rounded text-xs hover:bg-rust-100 text-rust-600 font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-mist-200">
            <div className="flex justify-between items-center border-b border-mist-200 pb-3">
              <h2 className="text-lg font-bold text-ink-900 font-heading">Add Vehicle</h2>
              <button onClick={() => setShowAddModal(false)} className="text-ink-400 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Registration Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AS-01-C-9999"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Vehicle Type</label>
                  <select
                    value={vType}
                    onChange={(e) => setVType(e.target.value as 'TRUCK' | 'MEDICAL_VAN' | 'TANKER' | 'MINI_TRUCK')}
                    className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm bg-white"
                  >
                    <option value="TRUCK">TRUCK</option>
                    <option value="MEDICAL_VAN">MEDICAL_VAN</option>
                    <option value="TANKER">TANKER</option>
                    <option value="MINI_TRUCK">MINI_TRUCK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Capacity (kg)</label>
                  <input
                    type="number"
                    required
                    value={capacityKg}
                    onChange={(e) => setCapacityKg(e.target.value)}
                    className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-3 py-2 border border-mist-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-mist-200 rounded-lg text-sm font-medium text-ink-600 hover:bg-mist-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-sm font-medium transition"
                >
                  {createMutation.isPending ? 'Saving...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Trail Modal */}
      {selectedVehicleTrail && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-mist-200 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-mist-200 pb-3">
              <h2 className="text-lg font-bold text-ink-900 font-heading">
                Position Trail - {selectedVehicleTrail.vehicle.regNo}
              </h2>
              <button onClick={() => setSelectedVehicleTrail(null)} className="text-ink-400 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <GoogleMapEmbed
              lat={selectedVehicleTrail.vehicle.lat}
              lng={selectedVehicleTrail.vehicle.lng}
              zoom={14}
              height="180px"
              title={`Google Maps Location - ${selectedVehicleTrail.vehicle.regNo} (${selectedVehicleTrail.vehicle.type})`}
            />
            <div className="overflow-y-auto flex-1 divide-y divide-mist-200 text-xs font-mono">
              {selectedVehicleTrail.trail.length === 0 ? (
                <div className="py-8 text-center text-ink-400 font-sans">No position history recorded yet.</div>
              ) : (
                selectedVehicleTrail.trail.map((pos) => (
                  <div key={pos.id} className="py-2 flex justify-between items-center">
                    <div>
                      <span className="text-ink-900 font-bold">{pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</span>
                      <span className="text-ink-400 ml-2">Heading: {Math.round(pos.heading)}°</span>
                    </div>
                    <div className="text-right">
                      <span className="text-river-700">{Math.round(pos.speedKmph)} km/h</span>
                      <div className="text-ink-400 text-[10px]">{new Date(pos.recordedAt).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
