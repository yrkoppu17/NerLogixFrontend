import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGoogleMapsLoader } from '../utils/googleMapsLoader'
import { Navigation, Clock, MapPin, ChevronRight, ExternalLink, Eye, EyeOff, Layers } from 'lucide-react'
import api from '../api/axios'
import { RouteOptionDto } from '../api/routes'
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const google: any

interface StepInstruction {
  instructions: string
  distance: string
  duration: string
}

export interface RouteDirectionResult {
  summary: string
  distance: string
  duration: string
  steps: StepInstruction[]
}

export interface GoogleDirectionsMapProps {
  originLat?: number | null
  originLng?: number | null
  destLat?: number | null
  destLng?: number | null
  originName?: string
  destName?: string
  routes?: RouteOptionDto[]
  selectedOptionIndex?: number
  onSelectOption?: (optionIndex: number) => void
  hoveredOptionIndex?: number | null
  // Backward compatibility props
  selectedRouteGeometry?: string
  riskCategory?: string
}

const getRiskColor = (riskCategory?: string) => {
  switch (riskCategory) {
    case 'CRITICAL':
      return '#C6403A' // rust-600
    case 'HIGH':
      return '#D98A00' // marigold-600
    case 'MEDIUM':
      return '#B45309' // amber-700
    case 'LOW':
    default:
      return '#14597A' // river-600
  }
}

export const GoogleDirectionsMap: React.FC<GoogleDirectionsMapProps> = ({
  originLat,
  originLng,
  destLat,
  destLng,
  originName = 'Origin',
  destName = 'Destination',
  routes = [],
  selectedOptionIndex = 1,
  onSelectOption,
  hoveredOptionIndex,
  selectedRouteGeometry,
  riskCategory,
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleMapInstance = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<{ origin?: any; dest?: any }>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylinesRef = useRef<Map<number, any>>(new Map())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleDirectionsRendererRef = useRef<any>(null)
  const directionsCacheRef = useRef<Map<number, RouteDirectionResult>>(new Map())

  const [directions, setDirections] = useState<RouteDirectionResult | null>(null)
  const [googleAltSummary, setGoogleAltSummary] = useState<string | null>(null)
  const [showGoogleRoute, setShowGoogleRoute] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [isGoogleReady, setIsGoogleReady] = useState<boolean>(false)

  // Fetch browser key from GET /api/public/config
  const { data: publicConfig } = useQuery({
    queryKey: ['public-config'],
    queryFn: async () => {
      const res = await api.get('/public/config')
      return res.data
    },
    staleTime: Infinity,
  })

  const envKey = (import.meta as unknown as { env?: { VITE_GOOGLE_MAPS_API_KEY?: string } }).env?.VITE_GOOGLE_MAPS_API_KEY || ''
  const apiKey = publicConfig?.googleMapsApiKey || envKey

  const externalMapUrl = originLat && originLng && destLat && destLng
    ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`
    : `https://www.google.com/maps`

  // Current selected route object
  const currentOption = useMemo(() => {
    if (routes.length > 0) {
      return routes.find((r) => r.optionIndex === selectedOptionIndex) || routes[0]
    }
    return undefined
  }, [routes, selectedOptionIndex])

  // EFFECT A: Initialize Google Map once
  useEffect(() => {
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setLoadError(true)
      return
    }

    if (
      originLat == null ||
      originLng == null ||
      destLat == null ||
      destLng == null ||
      isNaN(originLat) ||
      isNaN(originLng) ||
      isNaN(destLat) ||
      isNaN(destLng)
    ) {
      return
    }

    setLoading(true)
    setLoadError(false)

    const loader = getGoogleMapsLoader(apiKey)
    loader
      .importLibrary('maps')
      .then(() => loader.importLibrary('routes'))
      .then(() => {
        if (!mapRef.current) return

        if (!googleMapInstance.current) {
          const map = new google.maps.Map(mapRef.current, {
            center: { lat: (originLat + destLat) / 2, lng: (originLng + destLng) / 2 },
            zoom: 8,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            streetViewControl: false,
          })
          googleMapInstance.current = map
        }
        setIsGoogleReady(true)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        setLoadError(true)
      })

    return () => {
      // Clean up polylines
      polylinesRef.current.forEach((p) => p.setMap(null))
      polylinesRef.current.clear()
    }
  }, [apiKey])

  // EFFECT B: Manage A / B Markers (never duplicate)
  useEffect(() => {
    if (!isGoogleReady || !googleMapInstance.current) return
    if (originLat == null || originLng == null || destLat == null || destLng == null) return

    const map = googleMapInstance.current

    // Origin marker
    const originMarker: any = markersRef.current.origin
    if (!originMarker) {
      markersRef.current.origin = new google.maps.Marker({
        position: { lat: originLat, lng: originLng },
        map,
        title: `Origin: ${originName}`,
        label: { text: 'A', color: 'white', fontWeight: 'bold' },
      })
    } else {
      originMarker.setPosition({ lat: originLat, lng: originLng })
      if (typeof originMarker.setTitle === 'function') {
        originMarker.setTitle(`Origin: ${originName}`)
      }
    }

    // Destination marker
    const destMarker: any = markersRef.current.dest
    if (!destMarker) {
      markersRef.current.dest = new google.maps.Marker({
        position: { lat: destLat, lng: destLng },
        map,
        title: `Destination: ${destName}`,
        label: { text: 'B', color: 'white', fontWeight: 'bold' },
      })
    } else {
      destMarker.setPosition({ lat: destLat, lng: destLng })
      if (typeof destMarker.setTitle === 'function') {
        destMarker.setTitle(`Destination: ${destName}`)
      }
    }
  }, [isGoogleReady, originLat, originLng, destLat, destLng, originName, destName])

  // EFFECT C: Draw all route polylines at once
  useEffect(() => {
    if (!isGoogleReady || !googleMapInstance.current) return

    const map = googleMapInstance.current

    // Clean up existing polylines
    polylinesRef.current.forEach((polyline) => polyline.setMap(null))
    polylinesRef.current.clear()

    const activeRoutes = routes.length > 0
      ? routes
      : selectedRouteGeometry
        ? [{
            optionIndex: 1,
            name: 'Primary Route',
            distanceKm: 0,
            etaMinutes: 0,
            riskScore: 0,
            riskCategory: (riskCategory as any) || 'LOW',
            expectedDelayMin: 0,
            reason: '',
            geometry: selectedRouteGeometry,
            segmentIds: [],
            segmentNames: [],
            isEmergencyOptimized: false,
          }]
        : []

    if (activeRoutes.length === 0) return

    const bounds = new google.maps.LatLngBounds()
    if (originLat && originLng) bounds.extend({ lat: originLat, lng: originLng })
    if (destLat && destLng) bounds.extend({ lat: destLat, lng: destLng })

    activeRoutes.forEach((route) => {
      try {
        const coords: [number, number][] = JSON.parse(route.geometry)
        const path = coords.map(([lat, lng]) => ({ lat, lng }))
        path.forEach((pt) => bounds.extend(pt))

        const isSelected = route.optionIndex === selectedOptionIndex
        const color = isSelected ? getRiskColor(route.riskCategory) : '#94A3B8'
        const weight = isSelected ? 6 : 4
        const opacity = isSelected ? 0.95 : 0.45
        const zIndex = isSelected ? 100 : 10

        const polyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: opacity,
          strokeWeight: weight,
          zIndex,
          map,
        })

        // Click on polyline selects route card (< 100 ms)
        polyline.addListener('click', () => {
          if (onSelectOption) {
            onSelectOption(route.optionIndex)
          }
        })

        // Hover styling
        polyline.addListener('mouseover', () => {
          if (route.optionIndex !== selectedOptionIndex) {
            polyline.setOptions({ strokeOpacity: 0.85, strokeWeight: 5, strokeColor: '#475569', zIndex: 50 })
          }
        })
        polyline.addListener('mouseout', () => {
          if (route.optionIndex !== selectedOptionIndex) {
            polyline.setOptions({ strokeOpacity: 0.45, strokeWeight: 4, strokeColor: '#94A3B8', zIndex: 10 })
          }
        })

        polylinesRef.current.set(route.optionIndex, polyline)
      } catch {
        // ignore parse error
      }
    })

    // Fit map bounds once per new route set
    map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
  }, [isGoogleReady, routes, selectedRouteGeometry, originLat, originLng, destLat, destLng])

  // EFFECT D: Fast update of polyline selection styles without re-creating polylines (< 100 ms)
  useEffect(() => {
    polylinesRef.current.forEach((polyline, optIndex) => {
      const route = routes.find((r) => r.optionIndex === optIndex)
      const isSelected = optIndex === selectedOptionIndex
      const isHovered = optIndex === hoveredOptionIndex

      if (isSelected) {
        polyline.setOptions({
          strokeColor: getRiskColor(route?.riskCategory),
          strokeOpacity: 0.95,
          strokeWeight: 6,
          zIndex: 100,
        })
      } else if (isHovered) {
        polyline.setOptions({
          strokeColor: '#475569',
          strokeOpacity: 0.85,
          strokeWeight: 5,
          zIndex: 50,
        })
      } else {
        polyline.setOptions({
          strokeColor: '#94A3B8',
          strokeOpacity: 0.45,
          strokeWeight: 4,
          zIndex: 10,
        })
      }
    })
  }, [selectedOptionIndex, hoveredOptionIndex, routes])

  // EFFECT E: Fetch or retrieve cached directions for selected option
  useEffect(() => {
    if (!currentOption) return

    // 1. Check in-memory cache first (instant switch)
    if (directionsCacheRef.current.has(currentOption.optionIndex)) {
      setDirections(directionsCacheRef.current.get(currentOption.optionIndex)!)
      return
    }

    // Fallback step generation from segment names
    const generateFallbackSteps = (): RouteDirectionResult => {
      const steps: StepInstruction[] = currentOption.segmentNames && currentOption.segmentNames.length > 0
        ? currentOption.segmentNames.map((seg) => ({
            instructions: `Proceed along corridor: ${seg}`,
            distance: `${Math.round(currentOption.distanceKm / currentOption.segmentNames.length)} km`,
            duration: `~${Math.round(currentOption.etaMinutes / currentOption.segmentNames.length)} min`,
          }))
        : [
            {
              instructions: `Navigate from ${originName} towards ${destName} via risk-assessed safe route`,
              distance: `${currentOption.distanceKm} km`,
              duration: `${currentOption.etaMinutes} min`,
            },
          ]

      return {
        summary: `${currentOption.name} (${currentOption.label || 'Safe Path'})`,
        distance: `${currentOption.distanceKm} km`,
        duration: `${currentOption.etaMinutes} min`,
        steps,
      }
    }

    if (!isGoogleReady || typeof google === 'undefined' || !originLat || !destLat) {
      const fallback = generateFallbackSteps()
      directionsCacheRef.current.set(currentOption.optionIndex, fallback)
      setDirections(fallback)
      return
    }

    // Call Google DirectionsService with waypoints from option geometry
    try {
      const coords: [number, number][] = JSON.parse(currentOption.geometry)
      const waypoints: any[] = []
      if (coords.length > 2) {
        const intermediate = coords.slice(1, -1)
        const step = Math.max(1, Math.floor(intermediate.length / 20))
        for (let i = 0; i < intermediate.length && waypoints.length < 23; i += step) {
          waypoints.push({
            location: new google.maps.LatLng(intermediate[i][0], intermediate[i][1]),
            stopover: false,
          })
        }
      }

      const directionsService = new google.maps.DirectionsService()
      directionsService.route(
        {
          origin: { lat: originLat, lng: originLng },
          destination: { lat: destLat, lng: destLng },
          waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === google.maps.DirectionsStatus.OK && result?.routes?.[0]?.legs?.[0]) {
            const leg = result.routes[0].legs[0]
            const steps: StepInstruction[] = leg.steps.map((st: any) => ({
              instructions: (st.instructions || '').replace(/<[^>]*>/g, ''),
              distance: st.distance?.text || '',
              duration: st.duration?.text || '',
            }))
            const resObj: RouteDirectionResult = {
              summary: `${currentOption.name} (Road-matched)`,
              distance: leg.distance?.text || `${currentOption.distanceKm} km`,
              duration: leg.duration?.text || `${currentOption.etaMinutes} min`,
              steps,
            }
            directionsCacheRef.current.set(currentOption.optionIndex, resObj)
            setDirections(resObj)
          } else {
            const fallback = generateFallbackSteps()
            directionsCacheRef.current.set(currentOption.optionIndex, fallback)
            setDirections(fallback)
          }
        }
      )
    } catch {
      const fallback = generateFallbackSteps()
      directionsCacheRef.current.set(currentOption.optionIndex, fallback)
      setDirections(fallback)
    }
  }, [currentOption, isGoogleReady, originLat, originLng, destLat, destLng, originName, destName])

  // EFFECT F: Optional Google suggested driving route overlay
  useEffect(() => {
    if (!isGoogleReady || !googleMapInstance.current) return
    const map = googleMapInstance.current

    if (!googleDirectionsRendererRef.current) {
      googleDirectionsRendererRef.current = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#0284C7', strokeOpacity: 0.65, strokeWeight: 4 },
      })
    }

    if (showGoogleRoute && originLat && destLat) {
      googleDirectionsRendererRef.current.setMap(map)
      const directionsService = new google.maps.DirectionsService()
      directionsService.route(
        {
          origin: { lat: originLat, lng: originLng },
          destination: { lat: destLat, lng: destLng },
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true,
        },
        (result: any, status: any) => {
          if (status === google.maps.DirectionsStatus.OK && result?.routes?.[0]) {
            googleDirectionsRendererRef.current.setDirections(result)
            setGoogleAltSummary(result.routes[0].summary || 'Standard Highway')
          }
        }
      )
    } else {
      googleDirectionsRendererRef.current.setMap(null)
      setGoogleAltSummary(null)
    }
  }, [showGoogleRoute, isGoogleReady, originLat, originLng, destLat, destLng])

  // Fallback: Leaflet Interactive Map when Google API is not loaded or key is missing
  if (loadError || !apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    const centerLat = originLat && destLat ? (originLat + destLat) / 2 : 26.2006
    const centerLng = originLng && destLng ? (originLng + destLng) / 2 : 92.9376

    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-control text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Interactive OpenStreetMap Routing Active (Google Key Standby)</span>
          </div>
          <a
            href={externalMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-river-600 text-white rounded text-xs font-semibold hover:bg-river-700 flex items-center gap-1 shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Google Maps
          </a>
        </div>

        {/* Leaflet Multi-Route Map */}
        <div className="bg-white p-3 rounded-panel border border-mist-200 shadow-sm h-[420px] relative">
          <MapContainer
            center={[centerLat, centerLng]}
            zoom={8}
            style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {originLat && originLng && (
              <Marker position={[originLat, originLng]}>
                <Popup>Origin: {originName}</Popup>
              </Marker>
            )}

            {destLat && destLng && (
              <Marker position={[destLat, destLng]}>
                <Popup>Destination: {destName}</Popup>
              </Marker>
            )}

            {routes.map((route) => {
              try {
                const coords: [number, number][] = JSON.parse(route.geometry)
                const isSelected = route.optionIndex === selectedOptionIndex
                const color = isSelected ? getRiskColor(route.riskCategory) : '#94A3B8'
                const weight = isSelected ? 6 : 4
                const opacity = isSelected ? 0.95 : 0.45

                return (
                  <Polyline
                    key={route.optionIndex}
                    positions={coords}
                    pathOptions={{ color, weight, opacity }}
                    eventHandlers={{
                      click: () => onSelectOption && onSelectOption(route.optionIndex),
                    }}
                  >
                    <Popup>
                      <strong>{route.name}</strong> ({route.label})<br />
                      Distance: {route.distanceKm} km • ETA: {route.etaMinutes} min<br />
                      Risk: {route.riskCategory} ({route.riskScore})
                    </Popup>
                  </Polyline>
                )
              } catch {
                return null
              }
            })}
          </MapContainer>
        </div>

        {/* Directions Step List */}
        {directions && (
          <div className="bg-white p-4 rounded-panel border border-mist-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-mist-100">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-river-600" />
                <span className="font-bold text-sm text-ink-900 font-heading">
                  {directions.summary}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-ink-700">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-river-500" />
                  {directions.distance}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  {directions.duration}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              <h4 className="text-xs font-bold text-ink-500 uppercase tracking-wider">
                Corridor Navigation Breakdown
              </h4>
              {directions.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-ink-700 p-2 bg-mist-50 rounded border border-mist-100"
                >
                  <span className="w-5 h-5 rounded-full bg-river-100 text-river-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p>{step.instructions}</p>
                  </div>
                  <div className="text-[11px] text-ink-400 font-medium shrink-0 flex items-center gap-1">
                    <span>{step.distance}</span>
                    <ChevronRight className="w-3 h-3 text-ink-300" />
                    <span>{step.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map Header with Controls */}
      <div className="flex flex-wrap justify-between items-center bg-white p-3 rounded-panel border border-mist-200 gap-2">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-river-600" />
          <span className="text-sm font-bold text-ink-900 font-heading">
            Interactive Multi-Route Map ({routes.length} options displayed)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGoogleRoute(!showGoogleRoute)}
            className={`px-3 py-1 border rounded text-xs font-medium flex items-center gap-1 transition ${
              showGoogleRoute
                ? 'bg-river-50 border-river-300 text-river-700 font-semibold'
                : 'border-mist-200 text-ink-700 hover:bg-mist-100'
            }`}
          >
            {showGoogleRoute ? <EyeOff className="w-3.5 h-3.5 text-river-600" /> : <Eye className="w-3.5 h-3.5" />}
            {showGoogleRoute ? 'Hide Google Default Route' : "Show Google's Suggested Route"}
          </button>
          <a
            href={externalMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-river-600 text-white rounded text-xs font-semibold hover:bg-river-700 flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open in Google Maps
          </a>
        </div>
      </div>

      {showGoogleRoute && googleAltSummary && (
        <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-control text-xs text-sky-900 flex items-center justify-between">
          <span className="font-semibold">Google Suggested Driving Route: {googleAltSummary}</span>
          <span className="text-sky-700 text-[11px]">Rendered as cyan secondary layer for comparison</span>
        </div>
      )}

      {/* Map Container */}
      <div className="bg-white p-3 rounded-panel border border-mist-200 shadow-sm h-[420px] relative">
        <div ref={mapRef} className="w-full h-full rounded-lg" />
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2 text-sm font-semibold text-river-700">
              <Navigation className="w-5 h-5 animate-spin" />
              <span>Loading Google Maps & Routes...</span>
            </div>
          </div>
        )}
      </div>

      {/* Step-by-Step Directions */}
      {directions && (
        <div className="bg-white p-4 rounded-panel border border-mist-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-mist-100">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-river-600" />
              <span className="font-bold text-sm text-ink-900 font-heading">
                Step-by-Step Directions: {directions.summary}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-ink-700">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-river-500" />
                {directions.distance}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {directions.duration}
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            <h4 className="text-xs font-bold text-ink-500 uppercase tracking-wider">
              Navigation Instructions for Selected Route
            </h4>
            {directions.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs text-ink-700 p-2 bg-mist-50 rounded border border-mist-100"
              >
                <span className="w-5 h-5 rounded-full bg-river-100 text-river-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p>{step.instructions}</p>
                </div>
                <div className="text-[11px] text-ink-400 font-medium shrink-0 flex items-center gap-1">
                  <span>{step.distance}</span>
                  <ChevronRight className="w-3 h-3 text-ink-300" />
                  <span>{step.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
