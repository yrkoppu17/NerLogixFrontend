import React, { Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { ToastProvider } from './context/ToastContext'
import { RealtimeProvider } from './realtime/RealtimeProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error: any) => {
        if (error?.response?.status && error.response.status >= 400 && error.response.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
})
import { AuthProvider } from './context/AuthContext'
import { RoleGuard } from './components/RoleGuard'
import { AppShell } from './components/AppShell'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const MapPage = React.lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })))
const RoadsPage = React.lazy(() => import('./pages/RoadsPage').then(m => ({ default: m.RoadsPage })))
const WeatherPage = React.lazy(() => import('./pages/WeatherPage').then(m => ({ default: m.WeatherPage })))
const RoutePlannerPage = React.lazy(() => import('./pages/RoutePlannerPage').then(m => ({ default: m.RoutePlannerPage })))
const VehiclesPage = React.lazy(() => import('./pages/VehiclesPage').then(m => ({ default: m.VehiclesPage })))
const ShipmentsPage = React.lazy(() => import('./pages/ShipmentsPage').then(m => ({ default: m.ShipmentsPage })))
const FieldReportPage = React.lazy(() => import('./pages/FieldReportPage').then(m => ({ default: m.FieldReportPage })))
const PendingReportsPage = React.lazy(() => import('./pages/PendingReportsPage').then(m => ({ default: m.PendingReportsPage })))
const IncidentsPage = React.lazy(() => import('./pages/IncidentsPage').then(m => ({ default: m.IncidentsPage })))
const AlertsPage = React.lazy(() => import('./pages/AlertsPage').then(m => ({ default: m.AlertsPage })))
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const DriverPage = React.lazy(() => import('./pages/DriverPage').then(m => ({ default: m.DriverPage })))
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

const UserManagementPage = React.lazy(() => import('./pages/admin/UserManagementPage').then(m => ({ default: m.UserManagementPage })))
const NetworkDataPage = React.lazy(() => import('./pages/admin/NetworkDataPage').then(m => ({ default: m.NetworkDataPage })))
const RuleConfigPage = React.lazy(() => import('./pages/admin/RuleConfigPage').then(m => ({ default: m.RuleConfigPage })))
const ApiKeysPage = React.lazy(() => import('./pages/admin/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })))
const AuditLogPage = React.lazy(() => import('./pages/admin/AuditLogPage').then(m => ({ default: m.AuditLogPage })))
const DemoToolsPage = React.lazy(() => import('./pages/admin/DemoToolsPage').then(m => ({ default: m.DemoToolsPage })))

function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-river-600" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <RealtimeProvider>
              <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/about" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/dashboard"
              element={
                <RoleGuard>
                  <AppShell>
                    <Dashboard />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/map"
              element={
                <RoleGuard>
                  <AppShell>
                    <MapPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/roads"
              element={
                <RoleGuard allowedRoles={['MODERATOR', 'ADMIN']}>
                  <AppShell>
                    <RoadsPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/weather"
              element={
                <RoleGuard>
                  <AppShell>
                    <WeatherPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/planner"
              element={
                <RoleGuard>
                  <AppShell>
                    <RoutePlannerPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/vehicles"
              element={
                <RoleGuard allowedRoles={['MODERATOR', 'ADMIN']}>
                  <AppShell>
                    <VehiclesPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/shipments"
              element={
                <RoleGuard>
                  <AppShell>
                    <ShipmentsPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/field-report"
              element={
                <RoleGuard>
                  <AppShell>
                    <FieldReportPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/pending-reports"
              element={
                <RoleGuard allowedRoles={['MODERATOR', 'ADMIN']}>
                  <AppShell>
                    <PendingReportsPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/incidents"
              element={
                <RoleGuard allowedRoles={['MODERATOR', 'ADMIN']}>
                  <AppShell>
                    <IncidentsPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/alerts"
              element={
                <RoleGuard>
                  <AppShell>
                    <AlertsPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/notifications"
              element={
                <RoleGuard>
                  <AppShell>
                    <NotificationsPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/driver"
              element={
                <RoleGuard allowedRoles={['USER']}>
                  <AppShell>
                    <DriverPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/settings"
              element={
                <RoleGuard>
                  <AppShell>
                    <SettingsPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/admin/users"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <AppShell>
                    <UserManagementPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/admin/network"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <AppShell>
                    <NetworkDataPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/admin/rules"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <AppShell>
                    <RuleConfigPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/admin/api-keys"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <AppShell>
                    <ApiKeysPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/admin/audit"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <AppShell>
                    <AuditLogPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route
              path="/admin/demo"
              element={
                <RoleGuard allowedRoles={['ADMIN']}>
                  <AppShell>
                    <DemoToolsPage />
                  </AppShell>
                </RoleGuard>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
            </RealtimeProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
