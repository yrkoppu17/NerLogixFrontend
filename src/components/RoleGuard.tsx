import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Role, useAuth } from '../context/AuthContext'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: Role[]
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mist-50 flex items-center justify-center">
        <div className="text-ink-600 text-sm font-medium">Loading session...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
