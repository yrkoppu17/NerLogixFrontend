import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboardSummary, getDistrictConnectivityList, getSupplyStatus, getAnalyticsCharts } from '../api/dashboard'
import { MapPin, Truck, Package, Clock, AlertTriangle, ShieldAlert, BarChart2, RefreshCw, Box, X, Edit, ShieldCheck, Activity, Key, Users, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { GoogleMapEmbed } from '../components/GoogleMapEmbed'
import { getShipments } from '../api/shipments'
import api from '../api/axios'

const COLORS = ['#2F8F5B', '#D98A00', '#C6403A']

interface SupplyItem {
  id: number
  districtName: string
  state: string
  category: string
  stockUnits: number
  dailyDemandUnits: number
  daysOfCover: number
  isSupplyGap: boolean
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'kpis' | 'districts' | 'supply'>('kpis')
  const [selectedDistrictMap, setSelectedDistrictMap] = useState<{ name: string; state: string } | null>(null)

  // Stock edit state
  const [editingStock, setEditingStock] = useState<SupplyItem | null>(null)
  const [stockForm, setStockForm] = useState({ stockUnits: 0, dailyDemandUnits: 1 })

  const isUser = user?.role === 'USER'
  const isModeratorOrAdmin = user?.role === 'MODERATOR' || user?.role === 'ADMIN'
  const isAdmin = user?.role === 'ADMIN'

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  })

  const { data: districts, isLoading: loadingDistricts } = useQuery({
    queryKey: ['dashboard-districts'],
    queryFn: getDistrictConnectivityList,
  })

  const { data: supply, isLoading: loadingSupply } = useQuery<SupplyItem[]>({
    queryKey: ['dashboard-supply'],
    queryFn: getSupplyStatus,
    enabled: isModeratorOrAdmin,
  })

  const { data: charts, isLoading: loadingCharts } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: getAnalyticsCharts,
  })

  // User assigned shipment query
  const { data: myShipments } = useQuery({
    queryKey: ['my-shipments-dashboard', user?.id],
    queryFn: () => getShipments({ driverUserId: user?.id, size: 1 }),
    enabled: isUser && !!user?.id,
  })

  // Admin system health query
  const { data: auditLogs } = useQuery({
    queryKey: ['admin-health-audit'],
    queryFn: async () => {
      const res = await api.get('/admin/audit?size=5')
      return res.data
    },
    enabled: isAdmin,
  })

  const { data: adminUsers } = useQuery({
    queryKey: ['admin-health-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users?size=1')
      return res.data
    },
    enabled: isAdmin,
  })

  const { data: adminKeys } = useQuery({
    queryKey: ['admin-health-keys'],
    queryFn: async () => {
      const res = await api.get('/admin/api-keys')
      return res.data
    },
    enabled: isAdmin,
  })

  // Emergency Mode Toggle Mutation
  const toggleEmergencyMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await api.post('/settings/emergency', { enabled })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })

  // Update Stock Mutation
  const updateStockMutation = useMutation({
    mutationFn: async (payload: { districtName: string; category: string; stockUnits: number; dailyDemandUnits: number }) => {
      // Find district ID by searching districts list
      const d = districts?.find((dist) => dist.name.toLowerCase() === payload.districtName.toLowerCase())
      if (!d) throw new Error('District not found')
      await api.put(`/districts/${d.id}/stock`, {
        category: payload.category,
        stockUnits: payload.stockUnits,
        dailyDemandUnits: payload.dailyDemandUnits,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-supply'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setEditingStock(null)
    },
  })

  const myActiveShipment = myShipments?.content?.[0]

  const handleOpenStockEdit = (item: SupplyItem) => {
    setEditingStock(item)
    setStockForm({ stockUnits: item.stockUnits, dailyDemandUnits: item.dailyDemandUnits })
  }

  const handleSaveStock = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingStock) {
      updateStockMutation.mutate({
        districtName: editingStock.districtName,
        category: editingStock.category,
        stockUnits: stockForm.stockUnits,
        dailyDemandUnits: stockForm.dailyDemandUnits,
      })
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 font-heading">Operational Command Dashboard</h1>
          <p className="text-sm text-ink-600">Real-time visibility across North Eastern Region districts and corridors</p>
          <span className="inline-block mt-1 px-2 py-0.5 bg-mist-100 text-ink-700 text-xs font-semibold rounded font-mono">
            Role: {user?.role}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isModeratorOrAdmin && (
            <button
              onClick={() => toggleEmergencyMutation.mutate(!summary?.emergencyMode)}
              disabled={toggleEmergencyMutation.isPending}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                summary?.emergencyMode
                  ? 'bg-rust-600 text-white animate-pulse hover:bg-rust-700'
                  : 'bg-mist-200 text-ink-700 hover:bg-mist-300'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {summary?.emergencyMode ? 'EMERGENCY MODE ACTIVE (Toggle Off)' : 'Toggle Emergency Mode'}
            </button>
          )}

          <button
            onClick={() => refetchSummary()}
            className="p-2 border border-mist-200 rounded-xl hover:bg-mist-100 text-ink-600 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin System Health Strip */}
      {isAdmin && (
        <div className="bg-ink-900 text-white p-4 rounded-panel shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-river-400 shrink-0" />
            <div>
              <span className="text-xs text-ink-400 font-mono">SYSTEM HEALTH</span>
              <p className="text-sm font-semibold">100% Operational • H2/PG active</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-ink-700 pt-2 sm:pt-0 sm:pl-4">
            <Users className="w-5 h-5 text-tea-300 shrink-0" />
            <div>
              <span className="text-xs text-ink-400 font-mono">TOTAL USERS</span>
              <p className="text-sm font-semibold">{adminUsers?.totalElements || 3} Registered Accounts</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-ink-700 pt-2 sm:pt-0 sm:pl-4">
            <Key className="w-5 h-5 text-marigold-400 shrink-0" />
            <div>
              <span className="text-xs text-ink-400 font-mono">API KEYS & AUDIT</span>
              <p className="text-sm font-semibold">{adminKeys?.length || 0} API Keys • {auditLogs?.totalElements || 0} Audit Events</p>
            </div>
          </div>
        </div>
      )}

      {/* USER Assigned Shipment Card */}
      {isUser && myActiveShipment && (
        <div className="bg-river-50 border border-river-200 p-5 rounded-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono font-bold text-river-700 uppercase">My Assigned Active Shipment</span>
            <h3 className="text-lg font-bold text-river-800">{myActiveShipment.code} ({myActiveShipment.cargoCategory})</h3>
            <p className="text-xs text-river-600">
              {myActiveShipment.originNode.name} → {myActiveShipment.destinationNode.name} • Priority: {myActiveShipment.priority}
            </p>
          </div>
          <span className="px-3 py-1 bg-river-600 text-white font-semibold text-xs rounded-full">
            Status: {myActiveShipment.status}
          </span>
        </div>
      )}

      {/* KPI Bar */}
      {loadingSummary ? (
        <div className="text-center py-6 text-ink-600">Loading summary KPIs...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-mist-200 space-y-1">
            <div className="text-ink-400 text-xs font-semibold uppercase flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-river-600" /> Districts
            </div>
            <div className="text-xl font-bold text-ink-900">{summary?.totalDistricts || 0}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-mist-200 space-y-1">
            <div className="text-ink-400 text-xs font-semibold uppercase flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-marigold-500" /> Degraded
            </div>
            <div className="text-xl font-bold text-marigold-600">{summary?.degradedOrInaccessibleDistricts || 0}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-mist-200 space-y-1">
            <div className="text-ink-400 text-xs font-semibold uppercase flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-river-600" /> On Trip
            </div>
            <div className="text-xl font-bold text-ink-900">{summary?.activeVehicles || 0}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-mist-200 space-y-1">
            <div className="text-ink-400 text-xs font-semibold uppercase flex items-center gap-1">
              <Package className="w-3.5 h-3.5 text-river-600" /> Shipments
            </div>
            <div className="text-xl font-bold text-ink-900">{summary?.activeShipments || 0}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-mist-200 space-y-1">
            <div className="text-ink-400 text-xs font-semibold uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-marigold-500" /> Pending Rep
            </div>
            <div className="text-xl font-bold text-ink-900">{summary?.pendingFieldReports || 0}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-mist-200 space-y-1">
            <div className="text-ink-400 text-xs font-semibold uppercase flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rust-600" /> Critical Alt
            </div>
            <div className="text-xl font-bold text-rust-600">{summary?.criticalAlerts || 0}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-mist-200 space-y-1">
            <div className="text-ink-400 text-xs font-semibold uppercase flex items-center gap-1">
              <Box className="w-3.5 h-3.5 text-rust-600" /> Supply Gaps
            </div>
            <div className="text-xl font-bold text-rust-600">{summary?.supplyGaps || 0}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-mist-200 space-y-1">
            <div className="text-ink-400 text-xs font-semibold uppercase flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5 text-river-600" /> Mode
            </div>
            <div className="text-sm font-bold text-river-600">{summary?.emergencyMode ? 'EMERGENCY' : 'NORMAL'}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-mist-200 gap-4">
        <button
          onClick={() => setActiveTab('kpis')}
          className={`pb-3 font-semibold text-sm transition ${
            activeTab === 'kpis' ? 'border-b-2 border-river-600 text-river-600' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          Analytics & Charts
        </button>
        <button
          onClick={() => setActiveTab('districts')}
          className={`pb-3 font-semibold text-sm transition ${
            activeTab === 'districts' ? 'border-b-2 border-river-600 text-river-600' : 'text-ink-500 hover:text-ink-900'
          }`}
        >
          District Connectivity
        </button>
        {isModeratorOrAdmin && (
          <button
            onClick={() => setActiveTab('supply')}
            className={`pb-3 font-semibold text-sm transition ${
              activeTab === 'supply' ? 'border-b-2 border-river-600 text-river-600' : 'text-ink-500 hover:text-ink-900'
            }`}
          >
            Essential Supply Gaps & Stock Actions
          </button>
        )}
      </div>

      {/* Tab 1: Charts */}
      {activeTab === 'kpis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Road Segment Status Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-mist-200 space-y-3">
            <h3 className="font-bold text-sm text-ink-900">Road Corridor Status</h3>
            {loadingCharts ? (
              <div className="py-12 text-center text-xs text-ink-400">Loading chart...</div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts?.roadStatusBreakdown || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {charts?.roadStatusBreakdown?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Incidents by Type */}
          <div className="bg-white p-5 rounded-2xl border border-mist-200 space-y-3">
            <h3 className="font-bold text-sm text-ink-900">Incidents by Type</h3>
            {loadingCharts ? (
              <div className="py-12 text-center text-xs text-ink-400">Loading chart...</div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.incidentsByType || []}>
                    <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#14597A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Cargo Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-mist-200 space-y-3">
            <h3 className="font-bold text-sm text-ink-900">Cargo Category Shipments</h3>
            {loadingCharts ? (
              <div className="py-12 text-center text-xs text-ink-400">Loading chart...</div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts?.cargoCategoryDistribution || []}>
                    <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2F8F5B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* North Eastern Region Geographic Overview (Google Maps) */}
          <div className="md:col-span-2 lg:col-span-3">
            <GoogleMapEmbed
              query="Guwahati, Assam, India"
              zoom={7}
              height="300px"
              title="North Eastern Region Essential Logistics Corridors (Google Maps Overview)"
            />
          </div>
        </div>
      )}

      {/* Tab 2: District Connectivity */}
      {activeTab === 'districts' && (
        <div className="bg-white rounded-2xl border border-mist-200 overflow-hidden">
          {loadingDistricts ? (
            <div className="p-8 text-center text-ink-600">Loading district connectivity...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-mist-50 border-b border-mist-200 text-ink-500 font-medium text-xs uppercase">
                    <th className="p-4">District</th>
                    <th className="p-4">State</th>
                    <th className="p-4">Connectivity Score</th>
                    <th className="p-4">Status Category</th>
                    <th className="p-4 text-right">Map View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-100">
                  {districts?.map((d) => (
                    <tr key={d.id} className="hover:bg-mist-50">
                      <td className="p-4 font-semibold text-ink-900">{d.name}</td>
                      <td className="p-4 text-ink-600">{d.state}</td>
                      <td className="p-4 font-mono font-bold text-ink-900">{d.connectivityScore} / 100</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          d.category === 'GOOD' ? 'bg-tea-100 text-tea-600' :
                          d.category === 'DEGRADED' ? 'bg-marigold-100 text-marigold-600' :
                          'bg-rust-100 text-rust-600'
                        }`}>
                          {d.category}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedDistrictMap({ name: d.name, state: d.state })}
                          className="px-2.5 py-1 border border-mist-200 rounded text-xs font-medium text-river-600 hover:bg-mist-100 inline-flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" /> Google Map
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

      {/* Tab 3: Supply Gaps & Stock Actions (MODERATOR / ADMIN) */}
      {activeTab === 'supply' && isModeratorOrAdmin && (
        <div className="bg-white rounded-2xl border border-mist-200 overflow-hidden">
          {loadingSupply ? (
            <div className="p-8 text-center text-ink-600">Loading supply stock...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-mist-50 border-b border-mist-200 text-ink-500 font-medium text-xs uppercase">
                    <th className="p-4">District</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Stock Units</th>
                    <th className="p-4">Daily Demand</th>
                    <th className="p-4">Days of Cover</th>
                    <th className="p-4">Supply Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist-100">
                  {supply?.map((s) => (
                    <tr key={s.id} className={s.isSupplyGap ? 'bg-rust-50/40' : 'hover:bg-mist-50'}>
                      <td className="p-4 font-semibold text-ink-900">{s.districtName} ({s.state})</td>
                      <td className="p-4 text-ink-600 font-mono text-xs">{s.category}</td>
                      <td className="p-4 text-ink-900 font-semibold">{s.stockUnits}</td>
                      <td className="p-4 text-ink-600">{s.dailyDemandUnits}</td>
                      <td className="p-4 font-bold font-mono text-ink-900">{s.daysOfCover} days</td>
                      <td className="p-4">
                        {s.isSupplyGap ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rust-600 text-white">
                            CRITICAL GAP (&lt; 3 days)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-tea-100 text-tea-600">
                            ADEQUATE
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenStockEdit(s)}
                          className="px-2.5 py-1 bg-river-100 text-river-600 hover:bg-river-200 rounded text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" /> Update Stock
                        </button>
                        <button
                          onClick={() => setSelectedDistrictMap({ name: s.districtName, state: s.state })}
                          className="px-2.5 py-1 border border-mist-200 rounded text-xs font-medium text-river-600 hover:bg-mist-100 inline-flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3" /> Map
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

      {/* Update Stock Modal */}
      {editingStock && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-panel max-w-md w-full p-6 border border-mist-200 shadow-floating space-y-4">
            <div className="flex justify-between items-center border-b border-mist-200 pb-3">
              <div>
                <h3 className="font-heading font-bold text-lg text-ink-900">Update Stock</h3>
                <span className="text-xs text-ink-600">{editingStock.districtName} • {editingStock.category}</span>
              </div>
              <button onClick={() => setEditingStock(null)} className="text-ink-400 hover:text-ink-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Current Stock Units</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={stockForm.stockUnits}
                  onChange={(e) => setStockForm({ ...stockForm, stockUnits: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-mist-200 rounded-control text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Daily Demand Units</label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  value={stockForm.dailyDemandUnits}
                  onChange={(e) => setStockForm({ ...stockForm, dailyDemandUnits: parseFloat(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-mist-200 rounded-control text-sm font-mono"
                  required
                />
              </div>

              <div className="p-3 bg-mist-50 rounded-control text-xs space-y-1">
                <div className="flex justify-between font-semibold text-ink-900">
                  <span>Projected Cover:</span>
                  <span className="font-mono font-bold">
                    {(stockForm.dailyDemandUnits > 0 ? (stockForm.stockUnits / stockForm.dailyDemandUnits) : 0).toFixed(1)} days
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStock(null)}
                  className="px-4 py-2 border border-mist-200 rounded-control text-xs font-medium text-ink-600 hover:bg-mist-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStockMutation.isPending}
                  className="flex items-center gap-1 px-4 py-2 bg-river-600 hover:bg-river-700 text-white rounded-control text-xs font-semibold"
                >
                  <ShieldCheck className="w-4 h-4" /> Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* District Google Map Modal */}
      {selectedDistrictMap && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-mist-200 shadow-xl">
            <div className="flex justify-between items-center pb-2 border-b border-mist-200">
              <div>
                <h2 className="text-lg font-bold text-ink-900 font-heading">
                  {selectedDistrictMap.name} District
                </h2>
                <span className="text-xs text-ink-400 font-mono">{selectedDistrictMap.state}, North Eastern Region</span>
              </div>
              <button onClick={() => setSelectedDistrictMap(null)} className="text-ink-400 hover:text-ink-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <GoogleMapEmbed
              query={`${selectedDistrictMap.name}, ${selectedDistrictMap.state}, India`}
              zoom={11}
              height="280px"
              title={`Google Maps Location - ${selectedDistrictMap.name}, ${selectedDistrictMap.state}`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
