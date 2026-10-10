import React, { useEffect } from 'react'
import { Bell, LogOut, Globe } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useRealtimeStream } from '../hooks/useRealtimeStream'
import { getNotifications } from '../api/notifications'

export const TopBar: React.FC = () => {
  const { user, logout, updateProfile } = useAuth()
  const navigate = useNavigate()
  const { i18n, t } = useTranslation()
  const { isConnected } = useRealtimeStream()

  useEffect(() => {
    if (user?.language && i18n.language !== user.language) {
      i18n.changeLanguage(user.language)
    }
  }, [user?.language, i18n])

  const { data: notifData } = useQuery({
    queryKey: ['notifications-topbar'],
    queryFn: () => getNotifications({ page: 0, size: 50 }),
    enabled: !!user,
    refetchInterval: 15000,
  })

  const unreadCount = notifData?.content ? notifData.content.filter((n) => !n.readAt).length : 0

  if (!user) return null

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('nerlogix_lang', lang)
    updateProfile({ language: lang })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-mist-200 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <span className="text-xs font-medium text-ink-600">
          State: <span className="font-semibold text-ink-900">NER Logistics Network</span>
        </span>

        {/* Live SSE Stream Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-mist-100 text-xs font-semibold">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-tea-500 animate-pulse' : 'bg-rust-500'}`} />
          <span className={isConnected ? 'text-tea-600' : 'text-rust-600'}>
            {isConnected ? 'Realtime Live' : 'Reconnecting...'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-mist-100 p-1 rounded-control text-xs">
          <Globe className="w-3.5 h-3.5 text-ink-400 ml-1" />
          {['en', 'hi', 'as', 'bn'].map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                (user.language || i18n.language) === lang
                  ? 'bg-white text-river-600 shadow-sm'
                  : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-ink-600 hover:text-ink-900 hover:bg-mist-100 rounded-control transition-colors"
          title={t('notifications')}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-rust-600 text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-rust-600 px-2.5 py-1.5 rounded-control hover:bg-rust-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('signOut')}</span>
        </button>
      </div>
    </header>
  )
}
