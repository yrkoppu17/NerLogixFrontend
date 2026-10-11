import React from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin, LayoutDashboard, CloudRain, Navigation,
  AlertTriangle, ShieldAlert, Truck, Package,
  FileText, Clock, Users, Sliders, Key, History, Wrench, Settings, Database, Compass
} from 'lucide-react'
import { useAuth, Role } from '../context/AuthContext'
import api from '../api/axios'

interface NavItem {
  key: string
  to: string
  icon: React.ElementType
  roles?: Role[]
  badge?: number | null
}

interface NavGroup {
  titleKey: string
  items: NavItem[]
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth()
  const { t } = useTranslation()

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary-sidebar'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary')
      return res.data
    },
    enabled: !!user && (user.role === 'MODERATOR' || user.role === 'ADMIN'),
    refetchInterval: 15000,
  })

  if (!user) return null

  const userRole = user.role
  const pendingCount = summary?.pendingFieldReports || 0

  const groups: NavGroup[] = [
    {
      titleKey: 'overview',
      items: [
        { key: 'liveMap', to: '/map', icon: MapPin },
        { key: 'dashboard', to: '/dashboard', icon: LayoutDashboard },
        { key: 'weather', to: '/weather', icon: CloudRain },
        { key: 'routePlanner', to: '/planner', icon: Navigation },
      ],
    },
    {
      titleKey: 'operations',
      items: [
        { key: 'dispatchBoard', to: '/dispatch', icon: Compass, roles: ['MODERATOR', 'ADMIN'] },
        { key: 'roadStatus', to: '/roads', icon: AlertTriangle, roles: ['MODERATOR', 'ADMIN'] },
        { key: 'incidentsLog', to: '/incidents', icon: ShieldAlert, roles: ['MODERATOR', 'ADMIN'] },
        { key: 'shipments', to: '/shipments', icon: Package, roles: ['MODERATOR', 'ADMIN'] },
        { key: 'myDeliveries', to: '/shipments', icon: Package, roles: ['USER'] },
        { key: 'vehicles', to: '/vehicles', icon: Truck, roles: ['MODERATOR', 'ADMIN'] },
        { key: 'drivers', to: '/drivers', icon: Users, roles: ['MODERATOR', 'ADMIN'] },
        { key: 'alerts', to: '/alerts', icon: AlertTriangle },
        { key: 'driverMode', to: '/driver', icon: Truck, roles: ['USER'] },
      ],
    },
    {
      titleKey: 'fieldUser',
      items: [
        { key: 'fieldReport', to: '/field-report', icon: FileText },
        { key: 'verificationQueue', to: '/pending-reports', icon: Clock, roles: ['MODERATOR', 'ADMIN'], badge: pendingCount > 0 ? pendingCount : null },
        { key: 'settings', to: '/settings', icon: Settings },
      ],
    },
    {
      titleKey: 'admin',
      items: [
        { key: 'userManagement', to: '/admin/users', icon: Users, roles: ['ADMIN'] },
        { key: 'networkData', to: '/admin/network', icon: Database, roles: ['ADMIN'] },
        { key: 'ruleConfig', to: '/admin/rules', icon: Sliders, roles: ['ADMIN'] },
        { key: 'apiKeys', to: '/admin/api-keys', icon: Key, roles: ['ADMIN'] },
        { key: 'auditLog', to: '/admin/audit', icon: History, roles: ['ADMIN'] },
        { key: 'demoTools', to: '/admin/demo', icon: Wrench, roles: ['ADMIN'] },
      ],
    },
  ]

  return (
    <aside className="w-64 bg-white border-r border-mist-200 flex flex-col h-screen sticky top-0 select-none">
      <div className="p-4 border-b border-mist-200 flex items-center justify-between">
        <div>
          <span className="font-heading font-bold text-lg text-river-600">{t('appName')}</span>
          <span className="block text-xs text-ink-400 font-mono">Platform v1.0</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {groups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.roles || item.roles.includes(userRole)
          )
          if (visibleItems.length === 0) return null

          return (
            <div key={group.titleKey}>
              <div className="px-3 text-xs font-semibold text-ink-400 uppercase tracking-wider mb-2">
                {t(group.titleKey)}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to + item.key}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-control text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-river-100 text-river-600 font-semibold'
                            : 'text-ink-600 hover:bg-mist-100 hover:text-ink-900'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{t(item.key)}</span>
                      </div>
                      {item.badge !== undefined && item.badge !== null && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-marigold-100 text-marigold-700">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      <div className="p-4 border-t border-mist-200 bg-mist-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-river-600 text-white font-bold flex items-center justify-center text-xs">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink-900 truncate">{user.name}</p>
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-bold rounded bg-mist-200 text-ink-600">
              {user.role}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
