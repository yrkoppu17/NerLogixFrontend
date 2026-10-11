import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMapSegments, getMapVehicles, getMapIncidents, getMapDistricts } from '../api/map';
import { getRoadDetail, updateRoadStatus } from '../api/roads';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import { getGoogleMapsLoader } from '../utils/googleMapsLoader';
import { GoogleMapEmbed } from '../components/GoogleMapEmbed';
import { Layers, X, AlertCircle, Map, ExternalLink, MapPin } from 'lucide-react';
import api from '../api/axios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const google: any;

const getSegmentColor = (status: string) => {
  switch (status) {
    case 'OPEN':
      return '#2F8F5B'; // tea-500
    case 'RESTRICTED':
      return '#D98A00'; // marigold-500
    case 'BLOCKED':
      return '#C6403A'; // rust-600
    default:
      return '#8F9995'; // mist-400
  }
};

const REGIONAL_HUBS = [
  { name: 'Guwahati, Assam', query: 'Guwahati, Assam, India' },
  { name: 'Shillong, Meghalaya', query: 'Shillong, Meghalaya, India' },
  { name: 'Silchar, Assam', query: 'Silchar, Assam, India' },
  { name: 'Imphal, Manipur', query: 'Imphal, Manipur, India' },
  { name: 'Agartala, Tripura', query: 'Agartala, Tripura, India' },
  { name: 'Aizawl, Mizoram', query: 'Aizawl, Mizoram, India' },
  { name: 'Kohima, Nagaland', query: 'Kohima, Nagaland, India' },
  { name: 'Itanagar, Arunachal', query: 'Itanagar, Arunachal Pradesh, India' },
];

export const MapPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlaysRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoWindowRef = useRef<any>(null);

  // Map view mode: 'standard' (keyless GoogleMapEmbed used throughout the site) vs 'gis' (vector overlays)
  const [mapMode, setMapMode] = useState<'standard' | 'gis'>('standard');
  const [selectedHub, setSelectedHub] = useState<string>('Guwahati, Assam, India');

  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [googleKeyError, setGoogleKeyError] = useState(false);

  // Layer toggles (for GIS mode)
  const [layers, setLayers] = useState({
    roadStatus: true,
    bridgesAndPasses: true,
    vehicles: true,
    incidents: true,
    districts: true,
  });

  // Status update modal inside detail sheet
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<'OPEN' | 'RESTRICTED' | 'BLOCKED'>('OPEN');
  const [reason, setReason] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Queries
  const { data: rawSegments } = useQuery({ queryKey: ['mapSegments'], queryFn: getMapSegments });
  const { data: rawVehicles } = useQuery({ queryKey: ['mapVehicles'], queryFn: getMapVehicles });
  const { data: rawIncidents } = useQuery({ queryKey: ['mapIncidents'], queryFn: getMapIncidents });
  const { data: rawDistricts } = useQuery({ queryKey: ['mapDistricts'], queryFn: getMapDistricts });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segments = useMemo(() => (Array.isArray(rawSegments) ? rawSegments : []), [rawSegments]) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vehicles = useMemo(() => (Array.isArray(rawVehicles) ? rawVehicles : []), [rawVehicles]) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incidents = useMemo(() => (Array.isArray(rawIncidents) ? rawIncidents : []), [rawIncidents]) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const districts = useMemo(() => (Array.isArray(rawDistricts) ? rawDistricts : []), [rawDistricts]) as any[];

  const { data: selectedSegmentDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['roadDetail', selectedSegmentId],
    queryFn: () => getRoadDetail(selectedSegmentId!),
    enabled: !!selectedSegmentId,
  });

  // Fetch Google Maps API Key
  const { data: publicConfig } = useQuery({
    queryKey: ['public-config'],
    queryFn: async () => {
      const res = await api.get('/public/config');
      return res.data;
    },
    staleTime: Infinity,
  });

  const envKey = (import.meta as unknown as { env?: { VITE_GOOGLE_MAPS_API_KEY?: string } }).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  const apiKey = publicConfig?.googleMapsApiKey || envKey;

  // Real-time invalidations
  useRealtime((event) => {
    if (
      event === 'road.updated' ||
      event === 'vehicle.update' ||
      event === 'incident.updated' ||
      event === 'vehicles.positions'
    ) {
      queryClient.invalidateQueries({ queryKey: ['mapSegments'] });
      queryClient.invalidateQueries({ queryKey: ['mapVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['mapIncidents'] });
      if (selectedSegmentId) refetchDetail();
    }
  });

  // Initialize Google Maps JavaScript instance (for GIS mode when key is present)
  useEffect(() => {
    if (!apiKey) {
      setGoogleKeyError(true);
      return;
    }
    setGoogleKeyError(false);

    let isMounted = true;
    const loader = getGoogleMapsLoader(apiKey);

    loader
      .load()
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;
        if (!mapInstanceRef.current) {
          const map = new google.maps.Map(mapContainerRef.current, {
            center: { lat: 26.1445, lng: 91.7362 }, // Guwahati center
            zoom: 7,
            mapTypeId: 'terrain',
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
          });
          mapInstanceRef.current = map;
          infoWindowRef.current = new google.maps.InfoWindow();
        }
      })
      .catch((err) => {
        console.warn('Google Maps Load Error on MapPage:', err);
        if (isMounted) setGoogleKeyError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Trigger resize if switching to GIS mode
  useEffect(() => {
    if (mapMode === 'gis' && mapInstanceRef.current && typeof google !== 'undefined') {
      setTimeout(() => {
        google.maps.event.trigger(mapInstanceRef.current, 'resize');
      }, 100);
    }
  }, [mapMode]);

  // Update GIS map overlays when data or layers change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof google === 'undefined') return;

    // Clear existing overlays
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newOverlays: any[] = [];
    const infoWindow = infoWindowRef.current;

    // 1. Road Status Segments
    if (layers.roadStatus) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      segments.forEach((seg: any) => {
        const poly = new google.maps.Polyline({
          path: [
            { lat: seg.fromLat, lng: seg.fromLng },
            { lat: seg.toLat, lng: seg.toLng },
          ],
          geodesic: true,
          strokeColor: getSegmentColor(seg.status),
          strokeOpacity: 0.85,
          strokeWeight: 5,
          map,
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        poly.addListener('click', (e: any) => {
          setSelectedSegmentId(seg.id);
          setIsUpdatingStatus(false);
          if (infoWindow && e.latLng) {
            infoWindow.setContent(`
              <div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
                <strong>${seg.name}</strong><br/>
                Status: <span style="font-weight:bold; color:${getSegmentColor(seg.status)}">${seg.status}</span><br/>
                Length: ${seg.distanceKm || '—'} km
              </div>
            `);
            infoWindow.setPosition(e.latLng);
            infoWindow.open(map);
          }
        });

        newOverlays.push(poly);
      });
    }

    // 2. Bridges & Passes
    if (layers.bridgesAndPasses) {
      segments
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((s: any) => s.assetType === 'BRIDGE' || s.assetType === 'PASS')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .forEach((s: any) => {
          const midLat = (s.fromLat + s.toLat) / 2;
          const midLng = (s.fromLng + s.toLng) / 2;
          const marker = new google.maps.Marker({
            position: { lat: midLat, lng: midLng },
            map,
            title: `${s.name} (${s.assetType})`,
            label: {
              text: s.assetType === 'BRIDGE' ? '🌉' : '⛰️',
              fontSize: '14px',
            },
          });

          marker.addListener('click', () => {
            setSelectedSegmentId(s.id);
            setIsUpdatingStatus(false);
            if (infoWindow) {
              infoWindow.setContent(`
                <div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
                  <strong>${s.name}</strong> (${s.assetType})<br/>
                  Status: <span style="font-weight:bold; color:${getSegmentColor(s.status)}">${s.status}</span>
                </div>
              `);
              infoWindow.open(map, marker);
            }
          });

          newOverlays.push(marker);
        });
    }

    // 3. Vehicles
    if (layers.vehicles) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vehicles.forEach((v: any) => {
        const marker = new google.maps.Marker({
          position: { lat: v.lat, lng: v.lng },
          map,
          title: `Vehicle ${v.regNo}`,
          label: {
            text: '🚚',
            fontSize: '14px',
          },
        });

        marker.addListener('click', () => {
          if (infoWindow) {
            infoWindow.setContent(`
              <div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
                <strong>Vehicle: ${v.regNo}</strong><br/>
                Type: ${v.type}<br/>
                Status: ${v.status}
              </div>
            `);
            infoWindow.open(map, marker);
          }
        });

        newOverlays.push(marker);
      });
    }

    // 4. Incidents
    if (layers.incidents) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      incidents.forEach((inc: any) => {
        const marker = new google.maps.Marker({
          position: { lat: inc.lat, lng: inc.lng },
          map,
          title: `Incident: ${inc.title || inc.type}`,
          label: {
            text: '⚠️',
            fontSize: '14px',
          },
        });

        marker.addListener('click', () => {
          if (infoWindow) {
            infoWindow.setContent(`
              <div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
                <strong>Hazard: ${inc.type}</strong><br/>
                Severity: Level ${inc.severity}<br/>
                ${inc.description ? `<p style="margin:2px 0 0;">${inc.description}</p>` : ''}
              </div>
            `);
            infoWindow.open(map, marker);
          }
        });

        newOverlays.push(marker);
      });
    }

    // 5. Districts
    if (layers.districts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      districts.forEach((d: any) => {
        const circle = new google.maps.Circle({
          strokeColor: '#14597A',
          strokeOpacity: 0.5,
          strokeWeight: 1.5,
          fillColor: '#14597A',
          fillOpacity: 0.08,
          map,
          center: { lat: d.lat, lng: d.lng },
          radius: 20000,
        });

        const labelMarker = new google.maps.Marker({
          position: { lat: d.lat, lng: d.lng },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0,
          },
          label: {
            text: d.name,
            color: '#1A2421',
            fontSize: '11px',
            fontWeight: 'bold',
          },
        });

        newOverlays.push(circle, labelMarker);
      });
    }

    overlaysRef.current = newOverlays;
  }, [layers, segments, vehicles, incidents, districts]);

  useEffect(() => {
    return () => {
      overlaysRef.current.forEach((overlay) => overlay.setMap(null));
      overlaysRef.current = [];
    };
  }, []);

  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSegmentId) return;
    setUpdateError(null);

    try {
      await updateRoadStatus(selectedSegmentId, { status: newStatus, reason });
      setIsUpdatingStatus(false);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['mapSegments'] });
      refetchDetail();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setUpdateError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const externalMapLink = selectedSegmentDetail
    ? `https://www.google.com/maps/dir/?api=1&origin=${selectedSegmentDetail.fromLat},${selectedSegmentDetail.fromLng}&destination=${selectedSegmentDetail.toLat},${selectedSegmentDetail.toLng}&travelmode=driving`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedHub)}`;

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] overflow-hidden bg-mist-100 flex flex-col">
      {/* ========================================================================= */}
      {/* 1. STANDARD GOOGLE MAPS VIEWPORT (Normal keyless Google Maps embed)      */}
      {/* ========================================================================= */}
      {mapMode === 'standard' && (
        <div className="w-full h-full flex-1 relative">
          <GoogleMapEmbed
            query={selectedSegmentDetail ? undefined : selectedHub}
            originLat={selectedSegmentDetail ? selectedSegmentDetail.fromLat : undefined}
            originLng={selectedSegmentDetail ? selectedSegmentDetail.fromLng : undefined}
            destLat={selectedSegmentDetail ? selectedSegmentDetail.toLat : undefined}
            destLng={selectedSegmentDetail ? selectedSegmentDetail.toLng : undefined}
            zoom={selectedSegmentDetail ? 11 : 8}
            height="100%"
            title={selectedSegmentDetail ? `Corridor: ${selectedSegmentDetail.name}` : `Google Maps: ${selectedHub}`}
            className="w-full h-full flex flex-col rounded-none border-0 shadow-none"
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE GIS LAYERS VIEWPORT (Google Maps JS API with vectors)      */}
      {/* ========================================================================= */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full flex-1 min-h-[500px] ${mapMode === 'gis' ? 'block' : 'hidden'}`}
      />

      {/* Warning banner if in GIS mode but no API key is present */}
      {mapMode === 'gis' && googleKeyError && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-marigold-50 border-b border-marigold-200 text-marigold-900 px-4 py-2.5 text-xs font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-marigold-700 shrink-0" />
            <span>Google Maps API key not detected for vector GIS layer rendering.</span>
          </div>
          <button
            onClick={() => setMapMode('standard')}
            className="px-2.5 py-1 bg-river-600 hover:bg-river-700 text-white rounded font-semibold text-xs transition"
          >
            Switch to Standard Google Map
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING CONTROLS PANEL (Top-Left)                                       */}
      {/* ========================================================================= */}
      <div
        data-lenis-prevent
        className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md border border-mist-200 rounded-xl shadow-lg p-3 max-w-xs w-full transition-all"
      >
        {/* Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-mist-100 rounded-lg mb-2.5">
          <button
            type="button"
            onClick={() => setMapMode('standard')}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-semibold transition flex items-center justify-center gap-1.5 ${
              mapMode === 'standard'
                ? 'bg-white text-river-700 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Normal Google Map</span>
          </button>
          <button
            type="button"
            onClick={() => setMapMode('gis')}
            className={`flex-1 py-1 px-2 rounded-md text-[11px] font-semibold transition flex items-center justify-center gap-1.5 ${
              mapMode === 'gis'
                ? 'bg-white text-river-700 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>GIS Overlays</span>
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-mist-200 pb-2 mb-2">
          <div className="flex items-center gap-1.5 text-ink-900 font-semibold text-xs">
            {mapMode === 'standard' ? <MapPin className="w-3.5 h-3.5 text-river-600" /> : <Layers className="w-3.5 h-3.5 text-river-600" />}
            <span>{mapMode === 'standard' ? 'Location & Corridor Focus' : 'Map Layer Controls'}</span>
          </div>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="text-ink-400 hover:text-ink-900 text-xs"
          >
            {panelOpen ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {panelOpen && (
          <div className="space-y-3">
            {/* Standard Map Controls */}
            {mapMode === 'standard' ? (
              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-ink-400 uppercase mb-1">
                    Select Road Corridor
                  </label>
                  <select
                    value={selectedSegmentId || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setSelectedSegmentId(val);
                    }}
                    className="w-full px-2 py-1.5 border border-mist-200 rounded text-xs bg-white text-ink-900 font-medium"
                  >
                    <option value="">Regional Overview (Select a corridor...)</option>
                    {segments.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-ink-400 uppercase mb-1">
                    Quick Center on Hub
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {REGIONAL_HUBS.map((hub) => (
                      <button
                        key={hub.name}
                        type="button"
                        onClick={() => {
                          setSelectedHub(hub.query);
                          setSelectedSegmentId(null);
                        }}
                        className={`px-2 py-1 text-[11px] rounded text-left truncate transition ${
                          selectedHub === hub.query && !selectedSegmentId
                            ? 'bg-river-50 text-river-700 font-semibold border border-river-200'
                            : 'bg-mist-50 text-ink-700 hover:bg-mist-100 border border-mist-200'
                        }`}
                      >
                        {hub.name.split(',')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-mist-100 flex items-center justify-between">
                  <span className="text-[10px] text-ink-400">Google Maps Embed</span>
                  <a
                    href={externalMapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-river-600 hover:text-river-800 text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open Maps
                  </a>
                </div>
              </div>
            ) : (
              /* GIS Layer Toggles */
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
        )}
      </div>

      {/* Bottom-left Map Legend (when in GIS mode) */}
      {mapMode === 'gis' && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md border border-mist-200 rounded-xl shadow-md p-3 text-xs text-ink-600 space-y-1.5">
          <div className="font-semibold text-ink-900 mb-1">Status Legend</div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-tea-500 rounded" />
            <span>OPEN (Safe)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-marigold-500 rounded" />
            <span>RESTRICTED (High Risk)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-rust-600 rounded" />
            <span>BLOCKED (Impasse)</span>
          </div>
        </div>
      )}

      {/* Right Detail Sheet */}
      {selectedSegmentDetail && (
        <div
          data-lenis-prevent
          className="absolute top-4 right-4 bottom-4 z-20 bg-white border border-mist-200 rounded-2xl shadow-xl p-5 w-80 sm:w-96 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
        >
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-mist-200 pb-3">
              <div>
                <span className="text-xs font-mono text-river-600 font-bold">
                  {selectedSegmentDetail.highwayCode || 'Corridor'}
                </span>
                <h3 className="text-lg font-bold text-ink-900 font-heading">
                  {selectedSegmentDetail.name}
                </h3>
                <p className="text-xs text-ink-600">{selectedSegmentDetail.state} State</p>
              </div>
              <button
                onClick={() => setSelectedSegmentId(null)}
                className="p-1 hover:bg-mist-100 rounded-full text-ink-400 hover:text-ink-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embedded Google Map Route for the Selected Segment */}
            <div className="rounded-xl overflow-hidden border border-mist-200 shadow-sm">
              <GoogleMapEmbed
                originLat={selectedSegmentDetail.fromLat}
                originLng={selectedSegmentDetail.fromLng}
                destLat={selectedSegmentDetail.toLat}
                destLng={selectedSegmentDetail.toLng}
                height="190px"
                title={selectedSegmentDetail.name}
              />
            </div>

            {/* Current Status Box */}
            <div className="p-3 bg-mist-50 rounded-xl border border-mist-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-600 font-medium">Status</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-xs ${
                    selectedSegmentDetail.status === 'OPEN'
                      ? 'bg-tea-100 text-tea-700'
                      : selectedSegmentDetail.status === 'RESTRICTED'
                      ? 'bg-marigold-100 text-marigold-800'
                      : 'bg-rust-100 text-rust-700'
                  }`}
                >
                  {selectedSegmentDetail.status}
                </span>
              </div>
              {selectedSegmentDetail.statusReason && (
                <p className="text-xs text-ink-600 italic">"{selectedSegmentDetail.statusReason}"</p>
              )}
            </div>

            {/* Corridor Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-mist-50 rounded-lg border border-mist-100">
                <span className="text-ink-400 block mb-0.5">Length</span>
                <span className="font-semibold text-ink-800">{selectedSegmentDetail.lengthKm} km</span>
              </div>
              <div className="p-2.5 bg-mist-50 rounded-lg border border-mist-100">
                <span className="text-ink-400 block mb-0.5">Base Speed</span>
                <span className="font-semibold text-ink-800">{selectedSegmentDetail.baseSpeedKmph} km/h</span>
              </div>
            </div>

            {/* Moderator Status Update Form */}
            {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
              <div className="border-t border-mist-200 pt-3">
                {!isUpdatingStatus ? (
                  <button
                    onClick={() => {
                      setNewStatus(selectedSegmentDetail.status);
                      setIsUpdatingStatus(true);
                    }}
                    className="w-full py-2 bg-river-600 hover:bg-river-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    Update Road Corridor Status
                  </button>
                ) : (
                  <form onSubmit={handleUpdateStatusSubmit} className="space-y-3">
                    <span className="text-xs font-bold text-ink-900 block">Update Status</span>
                    {updateError && (
                      <p className="text-xs text-rust-600 bg-rust-50 p-2 rounded">{updateError}</p>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-ink-600 mb-1">New Condition</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as any)}
                        className="w-full px-2 py-1.5 border border-mist-200 rounded text-xs bg-white text-ink-900 font-semibold"
                      >
                        <option value="OPEN">OPEN (Accessible)</option>
                        <option value="RESTRICTED">RESTRICTED (Hazardous)</option>
                        <option value="BLOCKED">BLOCKED (Closed)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-600 mb-1">Official Reason</label>
                      <textarea
                        required
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Landslide cleared / Heavy flood warning"
                        rows={2}
                        className="w-full px-2 py-1.5 border border-mist-200 rounded text-xs bg-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-river-600 hover:bg-river-700 text-white rounded text-xs font-semibold"
                      >
                        Save Status
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsUpdatingStatus(false)}
                        className="px-3 py-1.5 border border-mist-200 rounded text-xs text-ink-600 hover:bg-mist-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-mist-200 pt-3 flex justify-between items-center text-xs text-ink-500">
            <span className="font-mono">ID #{selectedSegmentDetail.id}</span>
            <div className="flex items-center gap-2">
              <a
                href={externalMapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 text-river-600 hover:text-river-800 rounded font-semibold inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Maps
              </a>
              <button
                onClick={() => setSelectedSegmentId(null)}
                className="px-3 py-1 border border-mist-200 hover:bg-mist-100 rounded text-ink-700"
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
