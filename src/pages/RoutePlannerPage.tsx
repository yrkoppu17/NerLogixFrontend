import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getMapLocations, RoadNodeDto } from '../api/map'
import { planRoutes, RouteOptionDto } from '../api/routes'
import { Navigation, AlertTriangle, Route as RouteIcon, ShieldAlert, ArrowRight, RefreshCw, ExternalLink } from 'lucide-react'
import { GoogleDirectionsMap } from '../components/GoogleDirectionsMap'

// Route Planner is Google-Maps-only by design. Leaflet fallback is intentionally omitted.

export const RoutePlannerPage: React.FC = () => {
  const [originId, setOriginId] = useState<number | ''>('')
  const [destId, setDestId] = useState<number | ''>('')
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(1)

  const { data: nodes = [], isLoading: isLoadingNodes, isError: isErrorNodes, refetch: refetchNodes } = useQuery<RoadNodeDto[]>({
    queryKey: ['mapLocations'],
    queryFn: getMapLocations,
  })

  const planMutation = useMutation({
    mutationFn: planRoutes,
    onSuccess: (data) => {
      if (data.length > 0) {
        setSelectedOptionIndex(data[0].optionIndex)
      }
    },
  })

  const handlePlan = (e: React.FormEvent) => {
    e.preventDefault()
    if (typeof originId === 'number' && typeof destId === 'number') {
      planMutation.mutate({ originNodeId: originId, destinationNodeId: destId })
    }
  }

  const currentOption: RouteOptionDto | undefined = planMutation.data?.find((opt) => opt.optionIndex === selectedOptionIndex)

  const originNode = nodes.find((n) => n.id === originId)
  const destNode = nodes.find((n) => n.id === destId)

  const externalMapUrl = originNode && destNode
    ? `https://www.google.com/maps/dir/?api=1&origin=${originNode.lat},${originNode.lng}&destination=${destNode.lat},${destNode.lng}&travelmode=driving`
    : `https://www.google.com/maps`

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 font-heading">Alternate Routes & Delay Estimator</h1>
        <p className="text-ink-500 text-sm">
          Rule-based Dijkstra routing over accessible corridors with real-time risk penalties and delay predictions. (Google-Maps-Only)
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white p-5 rounded-panel border border-mist-200 shadow-sm">
        <form onSubmit={handlePlan} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase mb-1">Origin Location</label>
            {isLoadingNodes ? (
              <div className="h-10 bg-mist-100 animate-pulse rounded-control" />
            ) : isErrorNodes ? (
              <div className="flex items-center gap-2 text-xs text-rust-600">
                <span>Failed to load nodes</span>
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

          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase mb-1">Destination Location</label>
            {isLoadingNodes ? (
              <div className="h-10 bg-mist-100 animate-pulse rounded-control" />
            ) : isErrorNodes ? (
              <div className="flex items-center gap-2 text-xs text-rust-600">
                <span>Failed to load nodes</span>
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
              disabled={planMutation.isPending || !originId || !destId}
              className="w-full h-10 bg-river-600 text-white font-medium rounded-control hover:bg-river-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {planMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing Routes...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  <span>Calculate Safe Routes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error state */}
      {planMutation.isError && (
        <div className="p-4 bg-rust-50 border border-rust-200 rounded-panel text-rust-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rust-600 shrink-0" />
            <span className="text-sm font-medium">
              {(planMutation.error as unknown as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to compute navigable route for the selected locations.'}
            </span>
          </div>
          <button
            onClick={() => {
              if (typeof originId === 'number' && typeof destId === 'number') {
                planMutation.mutate({ originNodeId: originId, destinationNodeId: destId })
              }
            }}
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
                <span>Available Route Options ({planMutation.data.length})</span>
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
                opt.riskCategory === 'MEDIUM' ? 'bg-marigold-50 text-marigold-700 border-marigold-200' :
                'bg-tea-100 text-tea-700 border-tea-200'

              return (
                <div
                  key={opt.optionIndex}
                  onClick={() => setSelectedOptionIndex(opt.optionIndex)}
                  className={`p-4 rounded-panel border cursor-pointer transition-all ${
                    isSelected ? 'bg-white border-river-500 shadow-md ring-2 ring-river-500/20' : 'bg-white border-mist-200 hover:border-mist-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-ink-900">{opt.name}</span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded border ${riskColor}`}>
                      {opt.riskCategory} RISK ({opt.riskScore})
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

                  <p className="text-xs text-ink-600 italic bg-marigold-50/50 p-2 rounded border border-marigold-100 flex items-start gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-marigold-600 shrink-0 mt-0.5" />
                    <span>{opt.reason}</span>
                  </p>

                  <div className="mt-3 pt-2 border-t border-mist-100 text-[11px] text-ink-400 flex items-center justify-between">
                    <span>{opt.segmentIds.length} road segments</span>
                    {opt.isEmergencyOptimized && (
                      <span className="px-1.5 py-0.5 bg-rust-100 text-rust-800 rounded font-semibold text-[10px]">
                        EMERGENCY MODE
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <GoogleDirectionsMap
              originLat={originNode?.lat}
              originLng={originNode?.lng}
              destLat={destNode?.lat}
              destLng={destNode?.lng}
              originName={originNode?.name}
              destName={destNode?.name}
              selectedRouteGeometry={currentOption?.geometry}
              riskCategory={currentOption?.riskCategory}
            />

            {/* Segment Breakdown */}
            {currentOption && (
              <div className="bg-white p-4 rounded-panel border border-mist-200">
                <h3 className="font-bold text-sm text-ink-900 mb-2 font-heading">Route Segment Breakdown</h3>
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
    </div>
  )
}
