import React, { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getMapLocations, RoadNodeDto } from '../api/map'
import { planRoutes, RouteOptionDto } from '../api/routes'
import { getErrorMessage } from '../api/axios'
import { useRealtime } from '../hooks/useRealtime'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  Navigation,
  AlertTriangle,
  Route as RouteIcon,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  PackagePlus,
  CheckCircle2,
  ArrowLeftRight,
  MapPin,
  Compass,
} from 'lucide-react'
import { GoogleDirectionsMap } from '../components/GoogleDirectionsMap'
import { GoogleMapEmbed } from '../components/GoogleMapEmbed'

const KNOWN_CITIES: Record<string, { lat: number; lng: number }> = {
  hyderabad: { lat: 17.385, lng: 78.4867 },
  guwahati: { lat: 26.1445, lng: 91.7362 },
  shillong: { lat: 25.5788, lng: 91.8933 },
  silchar: { lat: 24.817, lng: 92.7926 },
  imphal: { lat: 24.817, lng: 93.9368 },
  aizawl: { lat: 23.7271, lng: 92.7176 },
  agartala: { lat: 23.8315, lng: 91.2868 },
  kohima: { lat: 25.6751, lng: 94.1086 },
  itanagar: { lat: 27.0844, lng: 93.6053 },
  dimapur: { lat: 25.9095, lng: 93.7266 },
  dibrugarh: { lat: 27.4728, lng: 94.912 },
  jorhat: { lat: 26.7509, lng: 94.2037 },
  tezpur: { lat: 26.6528, lng: 92.7926 },
  nagaon: { lat: 26.3463, lng: 92.6841 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  delhi: { lat: 28.6139, lng: 77.209 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  pune: { lat: 18.5204, lng: 73.8567 },
}

function findCoords(place: string, nodes: RoadNodeDto[]): { lat: number; lng: number } | null {
  const clean = place.toLowerCase().trim()
  for (const [key, coords] of Object.entries(KNOWN_CITIES)) {
    if (clean.includes(key)) return coords
  }
  const matchedNode = nodes.find(
    (n) => clean.includes(n.name.toLowerCase()) || (n.districtName && clean.includes(n.districtName.toLowerCase()))
  )
  if (matchedNode) {
    return { lat: matchedNode.lat, lng: matchedNode.lng }
  }
  return null
}

function computeHaversineKm(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

export const RoutePlannerPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { error: toastError } = useToast()
  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN'

  // Planner mode: 'NETWORK' (risk-aware Dijkstra) vs 'ANY_PLACE' (arbitrary Google Maps routing)
  const [plannerMode, setPlannerMode] = useState<'NETWORK' | 'ANY_PLACE'>('NETWORK')

  // Network mode state
  const [originId, setOriginId] = useState<number | ''>('')
  const [destId, setDestId] = useState<number | ''>('')
  const [vehicleType, setVehicleType] = useState<'TRUCK' | 'MEDICAL_VAN' | 'TANKER' | 'MINI_TRUCK'>('TRUCK')
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'EMERGENCY'>('NORMAL')
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(1)
  const [hoveredOptionIndex, setHoveredOptionIndex] = useState<number | null>(null)
  const [conditionsChanged, setConditionsChanged] = useState<boolean>(false)

  // Any-Place mode state
  const [customOrigin, setCustomOrigin] = useState<string>('Guwahati, Assam')
  const [customDest, setCustomDest] = useState<string>('Hyderabad, Telangana')
  const [submittedCustomOrigin, setSubmittedCustomOrigin] = useState<string>('Guwahati, Assam')
  const [submittedCustomDest, setSubmittedCustomDest] = useState<string>('Hyderabad, Telangana')
  const [hasPreviewedAnyPlace, setHasPreviewedAnyPlace] = useState<boolean>(true)

  const { data: nodes = [], isLoading: isLoadingNodes, isError: isErrorNodes, error: errorNodes, refetch: refetchNodes } = useQuery<RoadNodeDto[]>({
    queryKey: ['mapLocations'],
    queryFn: getMapLocations,
  })

  const planMutation = useMutation({
    mutationFn: planRoutes,
    onSuccess: (data) => {
      setConditionsChanged(false)
      if (data.length > 0) {
        const exists = data.some((d) => d.optionIndex === selectedOptionIndex)
        if (!exists) {
          setSelectedOptionIndex(data[0].optionIndex)
        }
      }
    },
    onError: (err) => {
      toastError(getErrorMessage(err))
    },
  })

  // Realtime notification when conditions change on the ground
  useRealtime(
    useCallback(
      (event: string) => {
        if (['road.updated', 'incident.created', 'incident.updated', 'weather.updated', 'alert.created'].includes(event)) {
          if (planMutation.data && planMutation.data.length > 0) {
            setConditionsChanged(true)
          }
        }
      },
      [planMutation.data]
    )
  )

  const handlePlan = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (typeof originId === 'number' && typeof destId === 'number') {
      if (originId === destId) {
        toastError('Origin and Destination cannot be the same node.')
        return
      }
      planMutation.mutate({
        originNodeId: originId,
        destinationNodeId: destId,
        vehicleType,
        priority,
      })
    }
  }

  const handleSwapNetworkNodes = () => {
    const temp = originId
    setOriginId(destId)
    setDestId(temp)
  }

  const handleSwapCustomPlaces = () => {
    const temp = customOrigin
    setCustomOrigin(customDest)
    setCustomDest(temp)
    setSubmittedCustomOrigin(customDest)
    setSubmittedCustomDest(temp)
  }

  const handleCalculateAnyPlace = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customOrigin.trim() || !customDest.trim()) {
      toastError('Please enter both origin and destination places.')
      return
    }
    if (customOrigin.trim().toLowerCase() === customDest.trim().toLowerCase()) {
      toastError('Origin and destination place names are identical.')
      return
    }
    setSubmittedCustomOrigin(customOrigin.trim())
    setSubmittedCustomDest(customDest.trim())
    setHasPreviewedAnyPlace(true)
  }

  // Any-Place Haversine straight-line distance
  const straightLineDistance = useMemo(() => {
    const p1 = findCoords(submittedCustomOrigin, nodes)
    const p2 = findCoords(submittedCustomDest, nodes)
    if (p1 && p2) {
      return computeHaversineKm(p1, p2)
    }
    return null
  }, [submittedCustomOrigin, submittedCustomDest, nodes])

  const currentOption: RouteOptionDto | undefined =
    planMutation.data?.find((opt) => opt.optionIndex === selectedOptionIndex) || planMutation.data?.[0]

  const originNode = nodes.find((n) => n.id === originId)
  const destNode = nodes.find((n) => n.id === destId)

  const externalMapUrl = originNode && destNode
    ? `https://www.google.com/maps/dir/?api=1&origin=${originNode.lat},${originNode.lng}&destination=${destNode.lat},${destNode.lng}&travelmode=driving`
    : `https://www.google.com/maps`

  const externalAnyPlaceMapUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(submittedCustomOrigin)}&destination=${encodeURIComponent(submittedCustomDest)}&travelmode=driving`

  const handleCreateShipmentWithRoute = () => {
    if (!currentOption || !originNode || !destNode) return
    navigate('/shipments', {
      state: {
        createWithRoute: true,
        originNodeId: originId,
        destinationNodeId: destId,
        priority,
        vehicleType,
        selectedRoute: currentOption,
      },
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading">Alternate Routes & Delay Estimator</h1>
          <p className="text-ink-500 text-sm">
            Risk-aware multi-corridor Dijkstra routing with real-time road hazard penalties and Google Maps previews.
          </p>
        </div>

        {/* Mode Toggle Pills */}
        <div className="inline-flex p-1 bg-mist-100 rounded-lg border border-mist-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPlannerMode('NETWORK')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              plannerMode === 'NETWORK'
                ? 'bg-white text-river-700 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <RouteIcon className="w-3.5 h-3.5" />
            <span>Safe Network Routes (Risk-Aware)</span>
          </button>
          <button
            type="button"
            onClick={() => setPlannerMode('ANY_PLACE')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              plannerMode === 'ANY_PLACE'
                ? 'bg-white text-river-700 shadow-sm'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Any-Place Route Preview (Google Maps)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: NETWORK ROUTES (RISK-AWARE DIJKSTRA)                             */}
      {/* ========================================================================= */}
      {plannerMode === 'NETWORK' && (
        <>
          {/* Input Form */}
          <div className="bg-white p-5 rounded-panel border border-mist-200 shadow-sm">
            <form onSubmit={handlePlan} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-ink-600 uppercase mb-1">Origin Location</label>
                {isLoadingNodes ? (
                  <div className="h-10 bg-mist-100 animate-pulse rounded-control" />
                ) : isErrorNodes ? (
                  <div className="flex items-center gap-2 text-xs text-rust-600">
                    <span>{getErrorMessage(errorNodes)}</span>
                    <button type="button" onClick={() => refetchNodes()} className="underline font-semibold">Retry</button>
                  </div>
                ) : (
                  <select
                    value={originId}
                    onChange={(e) => setOriginId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full h-10 px-3 border border-mist-300 rounded-control text-sm focus:outline-none focus:border-river-500 bg-white"
                    required
                  >
                    <option value="">Select origin node...</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id} disabled={n.id === destId}>
                        {n.name} ({n.kind}) {n.districtName ? `- ${n.districtName}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex items-center justify-center lg:mb-1">
                <button
                  type="button"
                  onClick={handleSwapNetworkNodes}
                  disabled={!originId && !destId}
                  title="Swap Origin and Destination"
                  className="p-2 border border-mist-300 rounded-control hover:bg-mist-100 text-ink-600 transition disabled:opacity-40"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-ink-600 uppercase mb-1">Destination Location</label>
                {isLoadingNodes ? (
                  <div className="h-10 bg-mist-100 animate-pulse rounded-control" />
                ) : isErrorNodes ? (
                  <div className="flex items-center gap-2 text-xs text-rust-600">
                    <span>{getErrorMessage(errorNodes)}</span>
                    <button type="button" onClick={() => refetchNodes()} className="underline font-semibold">Retry</button>
                  </div>
                ) : (
                  <select
                    value={destId}
                    onChange={(e) => setDestId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full h-10 px-3 border border-mist-300 rounded-control text-sm focus:outline-none focus:border-river-500 bg-white"
                    required
                  >
                    <option value="">Select destination node...</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id} disabled={n.id === originId}>
                        {n.name} ({n.kind}) {n.districtName ? `- ${n.districtName}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={planMutation.isPending || !originId || !destId || originId === destId}
                  className="w-full h-10 bg-river-600 text-white font-medium rounded-control hover:bg-river-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  {planMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Computing Routes...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      <span>Calculate Routes</span>
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 uppercase mb-1">Vehicle Type</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as any)}
                  className="w-full h-10 px-3 border border-mist-300 rounded-control text-sm focus:outline-none focus:border-river-500 bg-white"
                >
                  <option value="TRUCK">Heavy Truck (10T)</option>
                  <option value="MEDICAL_VAN">Medical / Emergency Van</option>
                  <option value="TANKER">Fuel / Liquid Tanker</option>
                  <option value="MINI_TRUCK">Mini Truck (3T)</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-ink-600 uppercase mb-1">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full h-10 px-3 border border-mist-300 rounded-control text-sm focus:outline-none focus:border-river-500 bg-white"
                >
                  <option value="NORMAL">Standard Transit</option>
                  <option value="HIGH">High Priority</option>
                  <option value="EMERGENCY">Emergency Relief</option>
                </select>
              </div>
            </form>
          </div>

          {/* Conditions Changed Realtime Banner */}
          {conditionsChanged && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-panel text-amber-900 flex items-center justify-between shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 animate-bounce" />
                <div>
                  <span className="font-bold text-sm block">Live Road Conditions Changed</span>
                  <span className="text-xs text-amber-800">
                    A recent road status update, incident, or weather report was received for this regional network.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePlan()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-control text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recalculate Routes
              </button>
            </div>
          )}

          {/* Error state */}
          {planMutation.isError && (
            <div className="p-4 bg-rust-50 border border-rust-200 rounded-panel text-rust-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rust-600 shrink-0" />
                <span className="text-sm font-medium">
                  {getErrorMessage(planMutation.error)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handlePlan()}
                className="px-3 py-1 bg-rust-600 text-white rounded text-xs font-semibold hover:bg-rust-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Results Section */}
          {planMutation.data && planMutation.data.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Options List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-ink-900 font-heading flex items-center gap-2">
                    <RouteIcon className="w-5 h-5 text-river-600" />
                    <span>Available Routes ({planMutation.data.length})</span>
                  </h2>
                  <a
                    href={externalMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-river-100 text-river-700 hover:bg-river-200 text-xs font-semibold rounded inline-flex items-center gap-1"
                    title="Start phone navigation"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Maps
                  </a>
                </div>

                {planMutation.data.map((opt) => {
                  const isSelected = opt.optionIndex === selectedOptionIndex
                  const riskColor =
                    opt.riskCategory === 'CRITICAL' ? 'bg-rust-100 text-rust-700 border-rust-300' :
                    opt.riskCategory === 'HIGH' ? 'bg-marigold-100 text-marigold-800 border-marigold-300' :
                    opt.riskCategory === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                    'bg-tea-100 text-tea-700 border-tea-200'

                  return (
                    <div
                      key={opt.optionIndex}
                      onClick={() => setSelectedOptionIndex(opt.optionIndex)}
                      onMouseEnter={() => setHoveredOptionIndex(opt.optionIndex)}
                      onMouseLeave={() => setHoveredOptionIndex(null)}
                      className={`p-4 rounded-panel border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-white border-river-500 shadow-md ring-2 ring-river-500/20'
                          : 'bg-white border-mist-200 hover:border-river-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-ink-900">{opt.name}</span>
                          {opt.label && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-river-50 text-river-700 border border-river-200 uppercase">
                              {opt.label}
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${riskColor}`}>
                          {opt.riskCategory} ({opt.riskScore})
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-ink-600 mb-3 bg-mist-50 p-2 rounded">
                        <div>
                          <span className="block text-[10px] text-ink-400 uppercase font-semibold">Distance</span>
                          <span className="font-bold text-ink-900 text-sm">{opt.distanceKm} km</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-ink-400 uppercase font-semibold">Est. Total Time</span>
                          <span className="font-bold text-ink-900 text-sm">{opt.etaMinutes} min</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-ink-400 uppercase font-semibold">Expected Delay</span>
                          <span className={`font-bold text-sm ${opt.expectedDelayMin > 0 ? 'text-marigold-700' : 'text-tea-600'}`}>
                            +{opt.expectedDelayMin} min
                          </span>
                        </div>
                      </div>

                      {/* Highlights pills */}
                      {opt.highlights && opt.highlights.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {opt.highlights.map((h, hIdx) => (
                            <span key={hIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-mist-100 text-[10px] font-semibold text-ink-700">
                              <CheckCircle2 className="w-3 h-3 text-tea-600" />
                              <span>{h}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-ink-600 italic bg-marigold-50/50 p-2 rounded border border-marigold-100 flex items-start gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-marigold-600 shrink-0 mt-0.5" />
                        <span>{opt.reason}</span>
                      </p>

                      <div className="mt-3 pt-2 border-t border-mist-100 text-[11px] text-ink-400 flex items-center justify-between">
                        <span>{opt.segmentIds.length} road corridors</span>
                        {opt.isEmergencyOptimized && (
                          <span className="px-1.5 py-0.5 bg-rust-100 text-rust-800 rounded font-semibold text-[10px]">
                            EMERGENCY MODE
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Moderator/Admin shortcut */}
                {isModeratorOrAdmin && currentOption && (
                  <button
                    type="button"
                    onClick={handleCreateShipmentWithRoute}
                    className="w-full py-3 bg-tea-600 hover:bg-tea-700 text-white rounded-panel font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                  >
                    <PackagePlus className="w-4 h-4" />
                    <span>Create Shipment With Selected Route</span>
                  </button>
                )}
              </div>

              <div className="lg:col-span-2 space-y-4">
                <GoogleDirectionsMap
                  originLat={originNode?.lat}
                  originLng={originNode?.lng}
                  destLat={destNode?.lat}
                  destLng={destNode?.lng}
                  originName={originNode?.name}
                  destName={destNode?.name}
                  routes={planMutation.data}
                  selectedOptionIndex={selectedOptionIndex}
                  onSelectOption={(idx) => setSelectedOptionIndex(idx)}
                  hoveredOptionIndex={hoveredOptionIndex}
                  selectedRouteGeometry={currentOption?.geometry}
                  riskCategory={currentOption?.riskCategory}
                />

                {/* Segment Breakdown */}
                {currentOption && (
                  <div className="bg-white p-4 rounded-panel border border-mist-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm text-ink-900 font-heading">
                        Corridor Segment Sequence ({currentOption.segmentNames.length} segments)
                      </h3>
                      <span className="text-xs text-ink-500 font-mono">
                        Total: {currentOption.distanceKm} km
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentOption.segmentNames.map((name, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-mist-100 text-ink-800 text-xs rounded-control font-medium">
                          <span>{name}</span>
                          {idx < currentOption.segmentNames.length - 1 && <ArrowRight className="w-3 h-3 text-ink-400 ml-1" />}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: ANY-PLACE ROUTE PREVIEW (GOOGLE MAPS)                            */}
      {/* ========================================================================= */}
      {plannerMode === 'ANY_PLACE' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="bg-white p-5 rounded-panel border border-mist-200 shadow-sm">
            <form onSubmit={handleCalculateAnyPlace} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-ink-600 uppercase mb-1">
                  Origin Place / City
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-river-600 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={customOrigin}
                    onChange={(e) => setCustomOrigin(e.target.value)}
                    placeholder="e.g. Guwahati, Assam"
                    required
                    className="w-full h-10 pl-9 pr-3 border border-mist-300 rounded-control text-sm focus:outline-none focus:border-river-500 bg-white font-medium"
                  />
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex items-center justify-center lg:mb-1">
                <button
                  type="button"
                  onClick={handleSwapCustomPlaces}
                  title="Swap Origin and Destination"
                  className="p-2 border border-mist-300 rounded-control hover:bg-mist-100 text-ink-600 transition"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-ink-600 uppercase mb-1">
                  Destination Place / City
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-tea-600 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={customDest}
                    onChange={(e) => setCustomDest(e.target.value)}
                    placeholder="e.g. Hyderabad, Telangana"
                    required
                    className="w-full h-10 pl-9 pr-3 border border-mist-300 rounded-control text-sm focus:outline-none focus:border-river-500 bg-white font-medium"
                  />
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-mist-100">
                <div className="text-xs text-ink-500">
                  Type any city, town, or address across India (e.g. <em>Hyderabad to Guwahati</em>). Preview uses Google Maps directions.
                </div>
                <button
                  type="submit"
                  className="px-6 h-10 bg-river-600 hover:bg-river-700 text-white font-semibold rounded-control transition-colors flex items-center gap-2 text-sm shadow-sm"
                >
                  <Compass className="w-4 h-4" />
                  <span>Calculate Distance & Preview Route</span>
                </button>
              </div>
            </form>
          </div>

          {/* Any-Place Overview Cards */}
          {hasPreviewedAnyPlace && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-panel border border-mist-200 shadow-sm flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-river-50 text-river-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-400 uppercase font-semibold block">Origin</span>
                    <span className="text-sm font-bold text-ink-900">{submittedCustomOrigin}</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-panel border border-mist-200 shadow-sm flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-tea-50 text-tea-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-400 uppercase font-semibold block">Destination</span>
                    <span className="text-sm font-bold text-ink-900">{submittedCustomDest}</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-panel border border-mist-200 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-ink-400 uppercase font-semibold block">Calculated Distance</span>
                    <span className="text-lg font-bold text-ink-900">
                      {straightLineDistance ? `~${straightLineDistance.toLocaleString()} km` : 'Google Road Route'}
                    </span>
                    <span className="text-[11px] text-ink-500 block">
                      {straightLineDistance ? 'Straight-line distance' : 'Road route preview'}
                    </span>
                  </div>
                  <a
                    href={externalAnyPlaceMapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-river-600 text-white rounded-control text-xs font-semibold hover:bg-river-700 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Google Maps</span>
                  </a>
                </div>
              </div>

              {/* Explicit Distance Distinction Notice */}
              <div className="p-3 bg-river-50/70 border border-river-200 rounded-panel text-xs text-river-900 flex items-center justify-between">
                <span>
                  <strong>Note:</strong> Straight-line distance
                  {straightLineDistance ? `: ~${straightLineDistance.toLocaleString()} km. ` : ' calculated where coordinates are known. '}
                  Road distance & driving duration previewed via Google Maps below.
                </span>
                <span className="text-[11px] text-river-700 font-mono">
                  Driving directions mode
                </span>
              </div>

              {/* Large Responsive Google Map Embed */}
              <div className="w-full">
                <GoogleMapEmbed
                  origin={submittedCustomOrigin}
                  destination={submittedCustomDest}
                  height="500px"
                  title={`${submittedCustomOrigin} to ${submittedCustomDest}`}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
