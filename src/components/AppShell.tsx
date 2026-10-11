import React from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { OfflineBanner } from './OfflineBanner'
import { ErrorBoundary } from './ErrorBoundary'
import { useLenis } from '../hooks/useLenis'

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useLenis()

  return (
    <div className="flex min-h-screen bg-mist-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <OfflineBanner />
        <TopBar />
        <main className="flex-1 p-6 overflow-y-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
