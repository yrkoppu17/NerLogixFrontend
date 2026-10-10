import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Database, Edit2, Check, X } from 'lucide-react'
import api from '../../api/axios'

interface DistrictItem {
  id: number
  state: string
  name: string
  lat: number
  lng: number
  populationBand: string
  connectivityScore: number
  status: string
}

interface RoadSegmentItem {
  id: number
  name: string
  highwayCode?: string
  assetType: 'ROAD' | 'BRIDGE' | 'PASS'
  baseSpeedKmph: number
  terrainClass: number
  landslideProne: boolean
  floodProne: boolean
  status: string
  riskScore: number
}

export const NetworkDataPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'districts' | 'roads'>('districts')

  const [editingDistrict, setEditingDistrict] = useState<DistrictItem | null>(null)
  const [districtForm, setDistrictForm] = useState({ name: '', state: '', lat: 0, lng: 0, populationBand: '500k-1M' })

  const [editingRoad, setEditingRoad] = useState<RoadSegmentItem | null>(null)
  const [roadForm, setRoadForm] = useState({
    name: '',
    assetType: 'ROAD' as 'ROAD' | 'BRIDGE' | 'PASS',
    baseSpeedKmph: 50,
    terrainClass: 3,
    landslideProne: false,
    floodProne: false,
  })

  const { data: districts = [], isLoading: isLoadingDistricts } = useQuery<DistrictItem[]>({
    queryKey: ['admin-districts'],
    queryFn: async () => {
      const res = await api.get('/admin/districts')
      return res.data
    },
  })

  const { data: roads = [], isLoading: isLoadingRoads } = useQuery<RoadSegmentItem[]>({
    queryKey: ['admin-roads'],
    queryFn: async () => {
      const res = await api.get('/admin/roads')
      return res.data
    },
  })

  const updateDistrictMutation = useMutation({
    mutationFn: async (payload: { id: number; data: typeof districtForm }) => {
      await api.put(`/admin/districts/${payload.id}`, payload.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-districts'] })
      setEditingDistrict(null)
    },
  })

  const updateRoadMutation = useMutation({
    mutationFn: async (payload: { id: number; data: typeof roadForm }) => {
      await api.put(`/admin/roads/${payload.id}`, payload.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roads'] })
      setEditingRoad(null)
    },
  })

  const handleEditDistrict = (d: DistrictItem) => {
    setEditingDistrict(d)
    setDistrictForm({
      name: d.name,
      state: d.state,
      lat: d.lat,
      lng: d.lng,
      populationBand: d.populationBand,
    })
  }

  const handleSaveDistrict = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingDistrict) {
      updateDistrictMutation.mutate({ id: editingDistrict.id, data: districtForm })
    }
  }

  const handleEditRoad = (r: RoadSegmentItem) => {
    setEditingRoad(r)
    setRoadForm({
      name: r.name,
      assetType: r.assetType,
      baseSpeedKmph: r.baseSpeedKmph,
      terrainClass: r.terrainClass,
      landslideProne: r.landslideProne,
      floodProne: r.floodProne,
    })
  }

  const handleSaveRoad = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingRoad) {
      updateRoadMutation.mutate({ id: editingRoad.id, data: roadForm })
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-river-600" />
            Network Data Management
          </h1>
          <p className="text-sm text-ink-600">Admin management of districts and road network infrastructure</p>
        </div>

        <div className="flex bg-mist-100 p-1 rounded-control">
          <button
            onClick={() => setActiveTab('districts')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-control transition ${
              activeTab === 'districts' ? 'bg-white text-river-600 shadow-sm' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            Districts ({districts.length})
          </button>
          <button
            onClick={() => setActiveTab('roads')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-control transition ${
              activeTab === 'roads' ? 'bg-white text-river-600 shadow-sm' : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            Road Segments ({roads.length})
          </button>
        </div>
      </div>

      {activeTab === 'districts' && (
        <div className="bg-white rounded-panel border border-mist-200 overflow-hidden shadow-sm">
          {isLoadingDistricts ? (
            <div className="p-8 text-center text-ink-400">Loading districts...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-ink-900">
                <thead className="bg-mist-100 text-xs text-ink-600 uppercase font-mono border-b border-mist-200">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3">Coordinates</th>
                    <th className="px-4 py-3">Population Band</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-200">
                  {districts.map((d) => (
                    <tr key={d.id} className="hover:bg-mist-50">
                      <td className="px-4 py-3 font-mono text-xs">{d.id}</td>
                      <td className="px-4 py-3 font-semibold">{d.name}</td>
                      <td className="px-4 py-3">{d.state}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {d.lat.toFixed(4)}, {d.lng.toFixed(4)}
                      </td>
                      <td className="px-4 py-3">{d.populationBand}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEditDistrict(d)}
                          className="flex items-center gap-1 text-xs font-medium text-river-600 hover:text-river-700 bg-river-100 px-2.5 py-1 rounded-control"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'roads' && (
        <div className="bg-white rounded-panel border border-mist-200 overflow-hidden shadow-sm">
          {isLoadingRoads ? (
            <div className="p-8 text-center text-ink-400">Loading road segments...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-ink-900">
                <thead className="bg-mist-100 text-xs text-ink-600 uppercase font-mono border-b border-mist-200">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Base Speed</th>
                    <th className="px-4 py-3">Terrain Class</th>
                    <th className="px-4 py-3">Hazards</th>
                    <th className="px-4 py-3">Risk Score</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-200">
                  {roads.map((r) => (
                    <tr key={r.id} className="hover:bg-mist-50">
                      <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                      <td className="px-4 py-3 font-semibold">{r.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.assetType}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.baseSpeedKmph} km/h</td>
                      <td className="px-4 py-3 font-mono text-xs">Class {r.terrainClass}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 text-[10px] font-bold">
                          {r.landslideProne && (
                            <span className="px-1.5 py-0.5 rounded bg-rust-100 text-rust-600">Landslide</span>
                          )}
                          {r.floodProne && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-600">Flood</span>
                          )}
                          {!r.landslideProne && !r.floodProne && (
                            <span className="text-ink-400 font-normal">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{r.riskScore.toFixed(0)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleEditRoad(r)}
                          className="flex items-center gap-1 text-xs font-medium text-river-600 hover:text-river-700 bg-river-100 px-2.5 py-1 rounded-control"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit District Modal */}
      {editingDistrict && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-panel max-w-md w-full p-6 border border-mist-200 shadow-floating space-y-4">
            <div className="flex justify-between items-center border-b border-mist-200 pb-3">
              <h3 className="font-heading font-bold text-lg text-ink-900">Edit District #{editingDistrict.id}</h3>
              <button onClick={() => setEditingDistrict(null)} className="text-ink-400 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDistrict} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">District Name</label>
                <input
                  type="text"
                  value={districtForm.name}
                  onChange={(e) => setDistrictForm({ ...districtForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-mist-200 rounded-control text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">State</label>
                <input
                  type="text"
                  value={districtForm.state}
                  onChange={(e) => setDistrictForm({ ...districtForm, state: e.target.value })}
                  className="w-full px-3 py-2 border border-mist-200 rounded-control text-sm font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={districtForm.lat}
                    onChange={(e) => setDistrictForm({ ...districtForm, lat: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-mist-200 rounded-control text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={districtForm.lng}
                    onChange={(e) => setDistrictForm({ ...districtForm, lng: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-mist-200 rounded-control text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Population Band</label>
                <input
                  type="text"
                  value={districtForm.populationBand}
                  onChange={(e) => setDistrictForm({ ...districtForm, populationBand: e.target.value })}
                  className="w-full px-3 py-2 border border-mist-200 rounded-control text-sm font-medium"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingDistrict(null)}
                  className="px-4 py-2 border border-mist-200 rounded-control text-xs font-medium text-ink-600 hover:bg-mist-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateDistrictMutation.isPending}
                  className="flex items-center gap-1 px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-control text-xs font-semibold"
                >
                  <Check className="w-4 h-4" />
                  Save District
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Road Segment Modal */}
      {editingRoad && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-panel max-w-md w-full p-6 border border-mist-200 shadow-floating space-y-4">
            <div className="flex justify-between items-center border-b border-mist-200 pb-3">
              <h3 className="font-heading font-bold text-lg text-ink-900">Edit Road #{editingRoad.id}</h3>
              <button onClick={() => setEditingRoad(null)} className="text-ink-400 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoad} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Segment Name</label>
                <input
                  type="text"
                  value={roadForm.name}
                  onChange={(e) => setRoadForm({ ...roadForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-mist-200 rounded-control text-sm font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1">Asset Type</label>
                  <select
                    value={roadForm.assetType}
                    onChange={(e) => setRoadForm({ ...roadForm, assetType: e.target.value as 'ROAD' | 'BRIDGE' | 'PASS' })}
                    className="w-full px-3 py-2 border border-mist-200 rounded-control text-sm font-medium"
                  >
                    <option value="ROAD">ROAD</option>
                    <option value="BRIDGE">BRIDGE</option>
                    <option value="PASS">PASS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-600 mb-1">Base Speed (km/h)</label>
                  <input
                    type="number"
                    value={roadForm.baseSpeedKmph}
                    onChange={(e) => setRoadForm({ ...roadForm, baseSpeedKmph: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-mist-200 rounded-control text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Terrain Class (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={roadForm.terrainClass}
                  onChange={(e) => setRoadForm({ ...roadForm, terrainClass: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 border border-mist-200 rounded-control text-sm font-mono"
                  required
                />
              </div>

              <div className="flex gap-6 py-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-ink-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roadForm.landslideProne}
                    onChange={(e) => setRoadForm({ ...roadForm, landslideProne: e.target.checked })}
                    className="rounded text-river-600 focus:ring-river-600"
                  />
                  Landslide Prone
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-ink-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roadForm.floodProne}
                    onChange={(e) => setRoadForm({ ...roadForm, floodProne: e.target.checked })}
                    className="rounded text-river-600 focus:ring-river-600"
                  />
                  Flood Prone
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRoad(null)}
                  className="px-4 py-2 border border-mist-200 rounded-control text-xs font-medium text-ink-600 hover:bg-mist-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateRoadMutation.isPending}
                  className="flex items-center gap-1 px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-control text-xs font-semibold"
                >
                  <Check className="w-4 h-4" />
                  Save Road Segment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
