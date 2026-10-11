import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShipments, startShipment, deliverShipment, getRouteProposal, acceptRouteProposal, rejectRouteProposal, Shipment } from '../api/shipments';
import { postDriverPosition } from '../api/vehicles';
import { createIncident } from '../api/incidents';
import { getPendingAssignments, acceptAssignment, declineAssignment, DispatchAssignment } from '../api/dispatch';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Truck, MapPin, Play, CheckCircle, Navigation, RefreshCw, AlertTriangle, ShieldAlert, Sparkles, Check } from 'lucide-react';
import { GoogleMapEmbed } from '../components/GoogleMapEmbed';

export const DriverPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [gpsStatusText, setGpsStatusText] = useState<string>('GPS Standby');

  const { data: shipmentsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['driver-shipments', user?.id],
    queryFn: () => getShipments({ driverUserId: user?.id, size: 5 }),
    enabled: !!user?.id,
  });

  const { data: pendingAssignments = [], refetch: refetchPending } = useQuery<DispatchAssignment[]>({
    queryKey: ['pendingAssignments', user?.id],
    queryFn: getPendingAssignments,
    enabled: !!user?.id,
  });

  const acceptMutation = useMutation({
    mutationFn: acceptAssignment,
    onSuccess: (data) => {
      refetchPending();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['driver-shipments'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch'] });
      success(`Accepted shipment ${data.shipmentCode}! Trip ready to start.`);
    },
    onError: (err: any) => {
      toastError(err?.response?.data?.message || 'Failed to accept assignment');
    },
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => declineAssignment(id, reason),
    onSuccess: () => {
      refetchPending();
      queryClient.invalidateQueries({ queryKey: ['dispatch'] });
      success('Assignment declined.');
    },
    onError: (err: any) => {
      toastError(err?.response?.data?.message || 'Failed to decline assignment');
    },
  });

  const activeShipment: Shipment | undefined = shipmentsData?.content.find(
    (s) => s.status === 'IN_TRANSIT' || s.status === 'DELAYED' || s.status === 'ASSIGNED'
  ) || shipmentsData?.content[0];

  const { data: proposal, refetch: refetchProposal } = useQuery({
    queryKey: ['route-proposal', activeShipment?.id],
    queryFn: () => (activeShipment ? getRouteProposal(activeShipment.id) : null),
    enabled: !!activeShipment,
  });

  const startMutation = useMutation({
    mutationFn: startShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-shipments'] });
    },
  });

  const deliverMutation = useMutation({
    mutationFn: deliverShipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-shipments'] });
    },
  });

  const acceptProposalMutation = useMutation({
    mutationFn: acceptRouteProposal,
    onSuccess: () => {
      refetchProposal();
      queryClient.invalidateQueries({ queryKey: ['driver-shipments'] });
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: rejectRouteProposal,
    onSuccess: () => {
      refetchProposal();
    },
  });

  const handleToggleGps = () => {
    if (!activeShipment?.vehicle?.id) {
      setGpsStatusText('No assigned vehicle for GPS');
      return;
    }

    if (!gpsActive) {
      if ('geolocation' in navigator) {
        setGpsActive(true);
        setGpsStatusText('Sharing Live GPS...');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            postDriverPosition([{ lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading || 0, speedKmph: pos.coords.speed || 45 }])
              .then(() => setGpsStatusText('GPS position updated'))
              .catch(() => setGpsStatusText('GPS sync failed'));
          },
          () => setGpsStatusText('GPS permission denied')
        );
      } else {
        setGpsStatusText('Geolocation API unavailable');
      }
    } else {
      setGpsActive(false);
      setGpsStatusText('GPS Standby');
    }
  };

  const handleReportEmergency = async () => {
    if (!activeShipment) return;
    try {
      await createIncident({
        type: 'ACCIDENT',
        severity: 4,
        lat: activeShipment.originNode.lat,
        lng: activeShipment.originNode.lng,
        description: `EMERGENCY reported by driver ${user?.name} on shipment ${activeShipment.code}`,
        status: 'REPORTED',
      });
      alert('Emergency reported! Dispatcher notified.');
    } catch {
      alert('Failed to send emergency report.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-river-600 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-river-100 font-mono font-bold">Driver Navigation Mode</span>
          <h1 className="text-2xl font-bold font-heading">{user?.name}</h1>
          <p className="text-sm text-river-100">{user?.email}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-3 bg-river-500 hover:bg-river-400 rounded-xl transition text-white flex items-center gap-2 text-sm font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Trip
        </button>
      </div>

      {/* Pending Dispatch Offers */}
      {pendingAssignments.length > 0 && (
        <div className="space-y-3">
          {pendingAssignments.map((pa) => (
            <div
              key={pa.id}
              className="p-5 bg-river-50 border-2 border-river-500 rounded-2xl shadow-md space-y-3 animate-slide-up"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-river-600 animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-wider text-river-700">
                    New Dispatch Assignment Received!
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-ink-700">{pa.shipmentCode}</span>
              </div>

              <div className="text-sm font-semibold text-ink-900">
                {pa.cargoDescription || 'Cargo Delivery'} ({pa.weightKg} kg)
              </div>

              <div className="text-xs text-ink-600 flex flex-wrap gap-x-4 gap-y-1">
                <span>Route: <strong>{pa.originName} → {pa.destinationName}</strong></span>
                <span>Assigned Vehicle: <strong>{pa.vehicleRegNo}</strong></span>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => acceptMutation.mutate(pa.id)}
                  disabled={acceptMutation.isPending}
                  className="flex-1 py-2.5 bg-tea-700 hover:bg-tea-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept & Start Delivery</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reason = window.prompt('Reason for declining this assignment (optional):') || 'Unavailable';
                    declineMutation.mutate({ id: pa.id, reason });
                  }}
                  disabled={declineMutation.isPending}
                  className="px-4 py-2.5 border border-mist-300 hover:bg-mist-100 text-ink-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      {isLoading ? (
        <div className="text-center py-12 text-ink-600">Loading driver details...</div>
      ) : isError || !activeShipment ? (
        <div className="bg-white p-8 rounded-2xl border border-mist-200 text-center space-y-3">
          <Truck className="w-12 h-12 text-ink-400 mx-auto" />
          <h3 className="text-lg font-bold text-ink-900">No Active Shipment Assigned</h3>
          <p className="text-sm text-ink-600">You are currently standby. Contact dispatcher for shipment assignment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Trip Summary Card */}
          <div className="bg-white p-6 rounded-2xl border border-mist-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-mist-100">
              <div>
                <span className="text-xs font-mono text-ink-400">SHIPMENT CODE</span>
                <div className="text-xl font-bold text-ink-900">{activeShipment.code}</div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                activeShipment.status === 'IN_TRANSIT' ? 'bg-river-100 text-river-600' :
                activeShipment.status === 'DELAYED' ? 'bg-marigold-100 text-marigold-600' :
                'bg-tea-100 text-tea-600'
              }`}>
                {activeShipment.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-river-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-ink-900">Origin</div>
                  <div className="text-ink-600">{activeShipment.originNode.name}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Navigation className="w-5 h-5 text-tea-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-ink-900">Destination</div>
                  <div className="text-ink-600">{activeShipment.destinationNode.name}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-marigold-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-ink-900">Vehicle</div>
                  <div className="text-ink-600">{activeShipment.vehicle?.regNo || 'Unassigned'} ({activeShipment.vehicle?.type})</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rust-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-ink-900">Cargo & Priority</div>
                  <div className="text-ink-600">{activeShipment.cargoCategory} • {activeShipment.weightKg} kg • {activeShipment.priority}</div>
                </div>
              </div>
            </div>

            {/* Google Maps Driving Route View */}
            <div className="pt-2">
              <GoogleMapEmbed
                originLat={activeShipment.originNode.lat}
                originLng={activeShipment.originNode.lng}
                destLat={activeShipment.destinationNode.lat}
                destLng={activeShipment.destinationNode.lng}
                height="240px"
                title={`Google Maps Driving Route - ${activeShipment.originNode.name} to ${activeShipment.destinationNode.name}`}
              />
            </div>

            {/* GPS Tracker status bar */}
            <div className="pt-4 border-t border-mist-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${gpsActive ? 'bg-tea-500 animate-pulse' : 'bg-ink-300'}`} />
                <span className="text-sm font-medium text-ink-700">{gpsStatusText}</span>
              </div>
              <button
                onClick={handleToggleGps}
                className={`px-4 py-2 rounded-xl font-semibold text-xs transition ${
                  gpsActive ? 'bg-rust-100 text-rust-600 border border-rust-200' : 'bg-river-50 text-river-600 border border-river-200'
                }`}
              >
                {gpsActive ? 'Stop Live GPS Sharing' : 'Start Live GPS Sharing'}
              </button>
            </div>
          </div>

          {/* Reroute Proposal Banner if available */}
          {proposal && proposal.status === 'PROPOSED' && (
            <div className="bg-marigold-50 border-2 border-marigold-400 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-marigold-700">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <div>
                  <h3 className="font-bold text-base">Safer Alternative Route Proposed</h3>
                  <p className="text-xs text-marigold-800">Dispatch has flagged a road disruption along your original path.</p>
                </div>
              </div>
              <p className="text-sm text-ink-800 font-medium">{proposal.reason}</p>
              <div className="flex gap-3 text-xs font-mono text-ink-600">
                <span>Distance: {proposal.distanceKm} km</span>
                <span>•</span>
                <span>ETA: ~{proposal.etaMin} mins</span>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => acceptProposalMutation.mutate(activeShipment.id)}
                  disabled={acceptProposalMutation.isPending}
                  className="flex-1 py-3 bg-tea-500 hover:bg-tea-600 text-white rounded-xl font-bold text-sm transition"
                >
                  Accept Safer Route
                </button>
                <button
                  onClick={() => rejectProposalMutation.mutate(activeShipment.id)}
                  disabled={rejectProposalMutation.isPending}
                  className="px-4 py-3 border border-mist-300 hover:bg-mist-100 text-ink-700 rounded-xl font-semibold text-sm transition"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {/* Driver Actions Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeShipment.status === 'ASSIGNED' && (
              <button
                onClick={() => startMutation.mutate(activeShipment.id)}
                disabled={startMutation.isPending}
                className="py-4 bg-river-600 hover:bg-river-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-md transition"
              >
                <Play className="w-6 h-6 fill-white" />
                Start Trip
              </button>
            )}

            {(activeShipment.status === 'IN_TRANSIT' || activeShipment.status === 'DELAYED') && (
              <button
                onClick={() => deliverMutation.mutate(activeShipment.id)}
                disabled={deliverMutation.isPending}
                className="py-4 bg-tea-500 hover:bg-tea-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-md transition"
              >
                <CheckCircle className="w-6 h-6" />
                Mark Delivered
              </button>
            )}

            <button
              onClick={handleReportEmergency}
              className="py-4 bg-rust-600 hover:bg-rust-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-md transition"
            >
              <AlertTriangle className="w-6 h-6" />
              Report Emergency
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
