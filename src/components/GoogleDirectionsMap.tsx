import React, { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGoogleMapsLoader } from '../utils/googleMapsLoader'
import { Navigation, Clock, MapPin, ChevronRight, ExternalLink, Eye, EyeOff } from 'lucide-react'
import api from '../api/axios'
import { GoogleMapEmbed } from './GoogleMapEmbed'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const google: any

interface StepInstruction {
  instructions: string
  distance: string
  duration: string
}

interface RouteDirectionResult {
  summary: string
  distance: string
  duration: string
  steps: StepInstruction[]
}

interface GoogleDirectionsMapProps {
  originLat?: number | null
  originLng?: number | null
  destLat?: number | null
  destLng?: number | null
  originName?: string
  destName?: string
  selectedRouteGeometry?: string
  riskCategory?: string
}

/**
 * Route Planner Google Maps Component (Google-Maps-Only by design)
 * Renders the NER-Logix risk-aware route polyline overlaid on Google Maps,
 * with optional Google Driving Directions as a secondary layer.
 */
export const GoogleDirectionsMap: React.FC<GoogleDirectionsMapProps> = ({
  originLat,
  originLng,
  destLat,
  destLng,
  originName = 'Origin',
  destName = 'Destination',
  selectedRouteGeometry,
  riskCategory,
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleMapInstance = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nerPolylineRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const googleDirectionsRendererRef = useRef<any>(null)

  const [directions, setDirections] = useState<RouteDirectionResult | null>(null)
  const [showGoogleRoute, setShowGoogleRoute] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

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
          })
          googleMapInstance.current = map
        }

        const map = googleMapInstance.current

        // Add origin & dest markers
        new google.maps.Marker({
          position: { lat: originLat, lng: originLng },
          map,
          title: `Origin: ${originName}`,
          label: 'A',
        })

        new google.maps.Marker({
          position: { lat: destLat, lng: destLng },
          map,
          title: `Destination: ${destName}`,
          label: 'B',
        })

        // Draw NER-Logix route option polyline
        if (nerPolylineRef.current) {
          nerPolylineRef.current.setMap(null)
        }

        if (selectedRouteGeometry) {
          try {
            const coords: [number, number][] = JSON.parse(selectedRouteGeometry)
            const path = coords.map(([lat, lng]) => ({ lat, lng }))

            const polylineColor =
              riskCategory === 'CRITICAL' ? '#C6403A' :
              riskCategory === 'HIGH' ? '#D98A00' :
              riskCategory === 'MEDIUM' ? '#B45309' : '#14597A'

            const polyline = new google.maps.Polyline({
              path,
              geodesic: true,
              strokeColor: polylineColor,
              strokeOpacity: 0.9,
              strokeWeight: 6,
              map,
            })

            nerPolylineRef.current = polyline

            const bounds = new google.maps.LatLngBounds()
            path.forEach((pt) => bounds.extend(pt))
            map.fitBounds(bounds)
          } catch {
            // ignore
          }
        }

        // Fetch Google driving directions
        const directionsService = new google.maps.DirectionsService()
        if (!googleDirectionsRendererRef.current) {
          googleDirectionsRendererRef.current = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#2F7FD0', strokeOpacity: 0.5, strokeWeight: 4 },
          })
        }

        directionsService.route(
          {
            origin: { lat: originLat, lng: originLng },
            destination: { lat: destLat, lng: destLng },
            travelMode: google.maps.TravelMode.DRIVING,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result: any, status: any) => {
            setLoading(false)
            if (status === google.maps.DirectionsStatus.OK && result && result.routes.length > 0) {
              googleDirectionsRendererRef.current.setDirections(result)
              const mainRoute = result.routes[0]
              const leg = mainRoute.legs[0]

              if (leg) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const steps: StepInstruction[] = leg.steps.map((step: any) => ({
                  instructions: (step.instructions || '').replace(/<[^>]*>/g, ''),
                  distance: step.distance?.text || '',
                  duration: step.duration?.text || '',
                }))

                setDirections({
                  summary: mainRoute.summary || 'Google Driving Route',
                  distance: leg.distance?.text || '',
                  duration: leg.duration?.text || '',
                  steps,
                })
              }
            }
          }
        )
      })
      .catch(() => {
        setLoading(false)
        setLoadError(true)
      })
  }, [apiKey, originLat, originLng, destLat, destLng, selectedRouteGeometry, riskCategory, originName, destName])

  // Toggle Google suggested route visibility
  useEffect(() => {
    if (googleDirectionsRendererRef.current) {
      googleDirectionsRendererRef.current.setMap(showGoogleRoute && googleMapInstance.current ? googleMapInstance.current : null)
    }
  }, [showGoogleRoute])

  // Fallback view when no key or API fails
  if (loadError || !apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-control text-xs text-amber-800 flex items-center justify-between">
          <span>Note: Add Google Maps API key to enable interactive risk overlays. Using Google Embed preview.</span>
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

        <GoogleMapEmbed
          originLat={originLat}
          originLng={originLng}
          destLat={destLat}
          destLng={destLng}
          query={`${destName}, India`}
          height="400px"
          title={`Google Maps Driving Route - ${originName} to ${destName}`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map Header with Controls */}
      <div className="flex justify-between items-center bg-white p-3 rounded-panel border border-mist-200">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-river-600" />
          <span className="text-sm font-bold text-ink-900 font-heading">
            Interactive Google Map (NER-Logix Risk Route Overlay)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGoogleRoute(!showGoogleRoute)}
            className="px-3 py-1 border border-mist-200 rounded text-xs font-medium text-ink-700 hover:bg-mist-100 flex items-center gap-1"
          >
            {showGoogleRoute ? <EyeOff className="w-3.5 h-3.5 text-river-600" /> : <Eye className="w-3.5 h-3.5" />}
            {showGoogleRoute ? 'Hide Google Route' : 'Show Google Suggested Route'}
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

      {/* Google Step-by-Step Directions */}
      {directions && (
        <div className="bg-white p-4 rounded-panel border border-mist-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-mist-100">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-river-600" />
              <span className="font-bold text-sm text-ink-900 font-heading">
                Google Suggested Driving Route: {directions.summary}
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
              Step-by-Step Navigation Instructions
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
