import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMapSegments, getMapVehicles, getMapIncidents, getMapDistricts } from '../api/map';
import { getRoadDetail, updateRoadStatus } from '../api/roads';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import { Layers, X } from 'lucide-react';
import { GoogleMapEmbed } from '../components/GoogleMapEmbed';

// Custom SVG Markers
const createBridgeIcon = () =>
  L.divIcon({
    className: 'custom-map-icon',
    html: `<div style="background:#14597A; color:white; padding:4px; rounded-full; border:1px solid white; display:flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; font-size:12px;" title="Bridge">🌉</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

const createPassIcon = () =>
  L.divIcon({
    className: 'custom-map-icon',
    html: `<div style="background:#D98A00; color:white; padding:4px; rounded-full; border:1px solid white; display:flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:50%; font-size:12px;" title="Pass">⛰️</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

const createVehicleIcon = (type: string, heading: number = 0) =>
  L.divIcon({
    className: 'custom-vehicle-icon',
    html: `<div style="transform: rotate(${heading}deg); background:#14597A; color:white; border:2px solid white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 2px 6px rgba(0,0,0,0.3);" title="${type}">🚚</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

const createIncidentIcon = (severity: number) => {
  const bg = severity >= 3 ? '#C6403A' : '#D98A00';
  return L.divIcon({
    className: 'custom-incident-icon',
    html: `<div style="background:${bg}; color:white; border:2px solid white; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; box-shadow:0 2px 6px rgba(0,0,0,0.3);" title="Incident">⚠️</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
};

export const MapPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Layer toggles state
  const [layers, setLayers] = useState({
    roadStatus: true,
    bridgesAndPasses: true,
    vehicles: true,
    incidents: true,
    districts: true,
    locations: false
  });

  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);

  // Status update modal inside detail sheet
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<'OPEN' | 'RESTRICTED' | 'BLOCKED'>('OPEN');
  const [reason, setReason] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Queries
  const { data: segments = [] } = useQuery({ queryKey: ['mapSegments'], queryFn: getMapSegments });
  const { data: vehicles = [] } = useQuery({ queryKey: ['mapVehicles'], queryFn: getMapVehicles });
  const { data: incidents = [] } = useQuery({ queryKey: ['mapIncidents'], queryFn: getMapIncidents });
  const { data: districts = [] } = useQuery({ queryKey: ['mapDistricts'], queryFn: getMapDistricts });
  const [mapMode, setMapMode] = useState<'LEAFLET' | 'GOOGLE'>('GOOGLE');
  const [googleMapQuery, setGoogleMapQuery] = useState<string>('Guwahati, Assam, India');

  const { data: selectedSegmentDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['roadDetail', selectedSegmentId],
    queryFn: () => getRoadDetail(selectedSegmentId!),
    enabled: !!selectedSegmentId
  });

  // Listen to realtime SSE updates
  useRealtime((event) => {
    if (event === 'road.updated' || event === 'vehicle.update' || event === 'incident.updated') {
      queryClient.invalidateQueries({ queryKey: ['mapSegments'] });
      queryClient.invalidateQueries({ queryKey: ['mapVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['mapIncidents'] });
      if (selectedSegmentId) refetchDetail();
    }
  });

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSegmentId) return;
    try {
      setUpdateError(null);
      await updateRoadStatus(selectedSegmentId, { status: newStatus, reason });
      setIsUpdatingStatus(false);
      queryClient.invalidateQueries({ queryKey: ['mapSegments'] });
      refetchDetail();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setUpdateError(errorObj.response?.data?.message || 'Failed to update road status');
    }
  };

  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN';

  // Helper for status line color
  const getPolylineOptions = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { color: '#2F8F5B', weight: 4, opacity: 0.85 };
      case 'RESTRICTED':
        return { color: '#D98A00', weight: 5, opacity: 0.9, dashArray: '8, 8' };
      case 'BLOCKED':
        return { color: '#C6403A', weight: 6, opacity: 0.95 };
      default:
        return { color: '#14597A', weight: 4 };
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Map Engine Switcher Bar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-md p-2 rounded-xl border border-mist-200 shadow-md">
        <button
          onClick={() => setMapMode('LEAFLET')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            mapMode === 'LEAFLET'
              ? 'bg-river-600 text-white shadow-xs'
              : 'text-ink-600 hover:bg-mist-100'
          }`}
        >
          📍 Interactive GIS Map
        </button>
        <button
          onClick={() => setMapMode('GOOGLE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
            mapMode === 'GOOGLE'
              ? 'bg-river-600 text-white shadow-xs'
              : 'text-ink-600 hover:bg-mist-100'
          }`}
        >
          🗺️ Google Maps Satellite & Terrain View
        </button>
      </div>

      {mapMode === 'GOOGLE' ? (
        <div className="w-full h-full pt-16 p-4 flex flex-col space-y-3 bg-mist-100">
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-mist-200 shadow-sm text-xs">
            <span className="font-bold text-ink-900">Quick Focus Region:</span>
            {[
              'Guwahati, Assam, India',
              'Shillong, Meghalaya, India',
              'Silchar, Assam, India',
              'Imphal, Manipur, India',
              'Agartala, Tripura, India',
              'Dimapur, Nagaland, India',
              'Itanagar, Arunachal Pradesh, India',
              'Gangtok, Sikkim, India',
            ].map((loc) => {
              const label = loc.split(',')[0];
              return (
                <button
                  key={loc}
                  onClick={() => setGoogleMapQuery(loc)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    googleMapQuery === loc
                      ? 'bg-river-600 text-white font-bold'
                      : 'bg-mist-50 hover:bg-mist-100 text-ink-700 border border-mist-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex-1 w-full rounded-xl overflow-hidden shadow-md">
            <GoogleMapEmbed
              query={googleMapQuery}
              zoom={10}
              height="100%"
              title={`Google Maps Satellite View - ${googleMapQuery}`}
              className="h-full"
            />
          </div>
        </div>
      ) : (
        /* Leaflet Map */
        <MapContainer
          center={[26.1445, 91.7362]}
          zoom={7}
          className="w-full h-full z-0"
          scrollWheelZoom={true}
        >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Road Status Polylines */}
        {layers.roadStatus &&
          segments.map((seg) => {
            const positions: [number, number][] = [
              [seg.fromLat, seg.fromLng],
              [seg.toLat, seg.toLng]
            ];

            return (
              <Polyline
                key={`seg-${seg.id}`}
                positions={positions}
                pathOptions={getPolylineOptions(seg.status)}
                eventHandlers={{
                  click: () => {
                    setSelectedSegmentId(seg.id);
                    setIsUpdatingStatus(false);
                  }
                }}
              />
            );
          })}

        {/* Bridges and Passes Markers */}
        {layers.bridgesAndPasses &&
          segments
            .filter((s) => s.assetType === 'BRIDGE' || s.assetType === 'PASS')
            .map((s) => {
              const midLat = (s.fromLat + s.toLat) / 2;
              const midLng = (s.fromLng + s.toLng) / 2;
              const icon = s.assetType === 'BRIDGE' ? createBridgeIcon() : createPassIcon();

              return (
                <Marker
                  key={`asset-${s.id}`}
                  position={[midLat, midLng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      setSelectedSegmentId(s.id);
                      setIsUpdatingStatus(false);
                    }
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <strong>{s.name}</strong> ({s.assetType})<br />
                      Status: <span className="font-semibold">{s.status}</span>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

        {/* Vehicles */}
        {layers.vehicles &&
          vehicles.map((v) => (
            <Marker
              key={`veh-${v.id}`}
              position={[v.lat, v.lng]}
              icon={createVehicleIcon(v.type, v.heading)}
            >
              <Popup>
                <div className="text-xs">
                  <strong>Vehicle {v.regNo}</strong> ({v.type})<br />
                  Status: {v.status} | Speed: {v.speedKmph} km/h
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Incidents */}
        {layers.incidents &&
          incidents.map((inc) => (
            <Marker
              key={`inc-${inc.id}`}
              position={[inc.lat, inc.lng]}
              icon={createIncidentIcon(inc.severity)}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-rust-600">{inc.type}</strong> (Severity {inc.severity})<br />
                  {inc.description}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* District Connectivity Circle Markers */}
        {layers.districts &&
          districts.map((d) => (
            <CircleMarker
              key={`dist-${d.id}`}
              center={[d.lat, d.lng]}
              radius={10}
              pathOptions={{
                color: d.connectivityScore >= 75 ? '#2F8F5B' : d.connectivityScore >= 40 ? '#D98A00' : '#C6403A',
                fillColor: d.connectivityScore >= 75 ? '#2F8F5B' : d.connectivityScore >= 40 ? '#D98A00' : '#C6403A',
                fillOpacity: 0.3
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong>{d.name} District</strong> ({d.state})<br />
                  Connectivity: {Math.round(d.connectivityScore)}% ({d.status})
                </div>
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
      )}

      {/* Floating Layer Control Panel */}
      <div
        data-lenis-prevent
        className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md border border-mist-200 rounded-xl shadow-lg p-3 max-w-xs w-full transition-all"
      >
        <div className="flex items-center justify-between border-b border-mist-200 pb-2 mb-2">
          <div className="flex items-center gap-2 text-ink-900 font-semibold text-xs">
            <Layers className="w-4 h-4 text-river-600" />
            <span>Map Layer Controls</span>
          </div>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="text-ink-400 hover:text-ink-900 text-xs"
          >
            {panelOpen ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {panelOpen && (
          <div className="space-y-2 text-xs text-ink-600">
            <label className="flex items-center gap-2 cursor-pointer hover:text-ink-900">
              <input
                type="checkbox"
                checked={layers.roadStatus}
                onChange={(e) => setLayers({ ...layers, roadStatus: e.target.checked })}
                className="accent-river-600 rounded"
              />
              <span>Road Status Corridor Lines</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-ink-900">
              <input
                type="checkbox"
                checked={layers.bridgesAndPasses}
                onChange={(e) => setLayers({ ...layers, bridgesAndPasses: e.target.checked })}
                className="accent-river-600 rounded"
              />
              <span>Bridges & Mountain Passes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-ink-900">
              <input
                type="checkbox"
                checked={layers.vehicles}
                onChange={(e) => setLayers({ ...layers, vehicles: e.target.checked })}
                className="accent-river-600 rounded"
              />
              <span>Live Essential Vehicles</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-ink-900">
              <input
                type="checkbox"
                checked={layers.incidents}
                onChange={(e) => setLayers({ ...layers, incidents: e.target.checked })}
                className="accent-river-600 rounded"
              />
              <span>Field & Road Incidents</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:text-ink-900">
              <input
                type="checkbox"
                checked={layers.districts}
                onChange={(e) => setLayers({ ...layers, districts: e.target.checked })}
                className="accent-river-600 rounded"
              />
              <span>District Accessibility Status</span>
            </label>
          </div>
        )}
      </div>

      {/* Bottom-left Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md border border-mist-200 rounded-xl shadow-md p-3 text-xs text-ink-600 space-y-1.5">
        <div className="font-semibold text-ink-900 mb-1">Status Legend</div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-tea-500 rounded"></span>
          <span>OPEN (Safe)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-marigold-500 rounded border-dashed"></span>
          <span>RESTRICTED (High Risk)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-1 bg-rust-600 rounded"></span>
          <span>BLOCKED (Impasse)</span>
        </div>
      </div>

      {/* Right Detail Sheet */}
      {selectedSegmentDetail && (
        <div
          data-lenis-prevent
          className="absolute top-4 right-4 bottom-4 z-20 bg-white border border-mist-200 rounded-2xl shadow-xl p-5 w-80 sm:w-96 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-mist-200 pb-3">
              <div>
                <span className="text-xs font-mono text-river-600 font-bold">{selectedSegmentDetail.highwayCode || 'Corridor'}</span>
                <h3 className="text-lg font-bold text-ink-900 font-heading">{selectedSegmentDetail.name}</h3>
                <p className="text-xs text-ink-600">{selectedSegmentDetail.state} State</p>
              </div>
              <button
                onClick={() => setSelectedSegmentId(null)}
                className="p-1 hover:bg-mist-100 rounded-full text-ink-400 hover:text-ink-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status Box */}
            <div className="p-3 bg-mist-50 rounded-xl border border-mist-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-600 font-medium">Status</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-xs ${
                    selectedSegmentDetail.status === 'OPEN'
                      ? 'bg-tea-100 text-tea-500'
                      : selectedSegmentDetail.status === 'RESTRICTED'
                      ? 'bg-marigold-100 text-marigold-500'
                      : 'bg-rust-100 text-rust-600'
                  }`}
                >
                  {selectedSegmentDetail.status}
                </span>
              </div>
              {selectedSegmentDetail.statusReason && (
                <p className="text-xs text-ink-600 italic">"{selectedSegmentDetail.statusReason}"</p>
              )}
            </div>

            {/* Google Maps Route Corridor View */}
            <GoogleMapEmbed
              originLat={selectedSegmentDetail.fromLat}
              originLng={selectedSegmentDetail.fromLng}
              destLat={selectedSegmentDetail.toLat}
              destLng={selectedSegmentDetail.toLng}
              height="180px"
              title={`Google Maps Driving Route - ${selectedSegmentDetail.name}`}
            />

            {/* Risk Breakdown Panel: Why is this risky? */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wide">
                Risk Score Breakdown ({Math.round(selectedSegmentDetail.riskScore)}/100)
              </h4>
              {selectedSegmentDetail.riskFactors.length === 0 ? (
                <p className="text-xs text-ink-400">No active risk factors recorded for this segment.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedSegmentDetail.riskFactors.map((rf, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 bg-mist-50 rounded border border-mist-200">
                      <span className="text-ink-600">{rf.label}</span>
                      <span className="font-mono font-bold text-marigold-500">+{rf.points} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Segment Specs */}
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-mist-200 pt-3">
              <div>
                <span className="text-ink-400">Asset Type:</span> <strong className="text-ink-900">{selectedSegmentDetail.assetType}</strong>
              </div>
              <div>
                <span className="text-ink-400">Length:</span> <strong className="text-ink-900 font-mono">{selectedSegmentDetail.lengthKm} km</strong>
              </div>
              <div>
                <span className="text-ink-400">Terrain Class:</span> <strong className="text-ink-900">{selectedSegmentDetail.terrainClass}</strong>
              </div>
              <div>
                <span className="text-ink-400">Base Speed:</span> <strong className="text-ink-900 font-mono">{selectedSegmentDetail.baseSpeedKmph} km/h</strong>
              </div>
            </div>

            {/* History Timeline */}
            {selectedSegmentDetail.history.length > 0 && (
              <div className="space-y-2 border-t border-mist-200 pt-3">
                <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wide">Status History Log</h4>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {selectedSegmentDetail.history.map((h) => (
                    <div key={h.id} className="text-xs border-l-2 border-river-600 pl-2 space-y-0.5">
                      <div className="flex items-center justify-between text-ink-900 font-medium">
                        <span>{h.oldStatus} → {h.newStatus}</span>
                        <span className="text-[10px] text-ink-400 font-mono">
                          {new Date(h.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-600">{h.reason}</p>
                      <p className="text-[10px] text-ink-400">By: {h.changedByName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer for Moderator / Admin */}
          {isModeratorOrAdmin && (
            <div className="border-t border-mist-200 pt-3 mt-4">
              {!isUpdatingStatus ? (
                <button
                  onClick={() => {
                    setIsUpdatingStatus(true);
                    setNewStatus(selectedSegmentDetail.status);
                    setReason(selectedSegmentDetail.statusReason || '');
                  }}
                  className="w-full py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Update Road Status Override
                </button>
              ) : (
                <form onSubmit={handleUpdateStatusSubmit} className="space-y-3">
                  {updateError && <p className="text-xs text-rust-600">{updateError}</p>}
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-600 mb-1">Set Status</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as 'OPEN' | 'RESTRICTED' | 'BLOCKED')}
                      className="w-full text-xs p-2 rounded border border-mist-200 bg-mist-50"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="RESTRICTED">RESTRICTED</option>
                      <option value="BLOCKED">BLOCKED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-600 mb-1">Reason</label>
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for change..."
                      className="w-full text-xs p-2 rounded border border-mist-200 bg-mist-50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsUpdatingStatus(false)}
                      className="w-1/2 py-1.5 text-xs text-ink-600 border border-mist-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-1.5 text-xs bg-river-600 text-white rounded font-medium"
                    >
                      Save Status
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default MapPage;
