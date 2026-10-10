import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, MapPin, Truck, AlertTriangle, Info } from 'lucide-react'
import api from '../api/axios'

interface OverviewData {
  districtsCount: number
  segmentsCount: number
  movingShipmentsCount: number
  openDisruptionsCount: number
}

interface AuthShellProps {
  children: React.ReactNode
  titleKey: string
  welcomeSplash?: { name: string; role: string } | null
}

export const AuthShell: React.FC<AuthShellProps> = ({ children, titleKey, welcomeSplash }) => {
  const { i18n, t } = useTranslation()

  const { data: overview } = useQuery<OverviewData>({
    queryKey: ['public-overview'],
    queryFn: async () => {
      const res = await api.get('/public/overview')
      return res.data
    },
  })

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('nerlogix_lang', lang)
  }

  return (
    <div className="min-h-screen bg-mist-50 flex flex-col md:flex-row overflow-hidden relative select-none">
      {/* Welcome Splash Transition Overlay */}
      <AnimatePresence>
        {welcomeSplash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-river-600 text-white flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-center space-y-4 max-w-md"
            >
              <div className="w-16 h-16 rounded-full bg-white text-river-600 mx-auto flex items-center justify-center font-bold text-2xl shadow-lg">
                {welcomeSplash.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-3xl font-bold font-heading">
                Welcome back, {welcomeSplash.name}
              </h2>
              <span className="inline-block px-3 py-1 bg-river-700 text-river-100 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
                {welcomeSplash.role} SESSION INITIALIZED
              </span>
              <div className="w-full bg-river-700 h-1 rounded-full overflow-hidden mt-6">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                  className="bg-tea-300 h-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Panel: Illustrated Scene (~60%) */}
      <div className="hidden md:flex md:w-[58%] lg:w-[62%] bg-gradient-to-br from-river-700 via-river-600 to-ink-900 text-white flex-col justify-between p-8 lg:p-12 relative overflow-hidden">
        {/* Animated Background Layers */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          {/* Drifting Rain Streaks */}
          <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] animate-pulse" />
        </div>

        {/* Brand Header */}
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-heading font-black text-3xl tracking-tight text-white">NER-Logix</span>
            <span className="px-2 py-0.5 rounded bg-river-500/40 text-river-100 text-xs font-mono font-semibold border border-river-400/30">
              v1.0 Operational
            </span>
          </div>
          <p className="text-river-100 text-base max-w-lg font-medium leading-relaxed">
            {t('taglineFull')}
          </p>
        </div>

        {/* Central Illustrated SVG Scene */}
        <div className="relative z-10 my-auto py-8">
          <svg viewBox="0 0 800 400" className="w-full h-auto max-h-[320px] drop-shadow-2xl">
            {/* Layered Misty Hills */}
            <path d="M0 350 Q 200 280, 400 320 T 800 290 L 800 400 L 0 400 Z" fill="#0F4660" opacity="0.7" />
            <path d="M0 320 Q 250 220, 500 270 T 800 240 L 800 400 L 0 400 Z" fill="#14597A" opacity="0.85" />
            <path d="M0 360 Q 150 310, 350 340 T 800 330 L 800 400 L 0 400 Z" fill="#13211D" opacity="0.9" />

            {/* Winding Road */}
            <path
              id="winding-road"
              d="M 50 380 Q 200 260, 380 310 T 750 220"
              fill="none"
              stroke="#DCE6E2"
              strokeWidth="10"
              strokeDasharray="12 6"
            />

            {/* Moving Truck Icon on Road */}
            <g>
              <circle cx="380" cy="310" r="14" fill="#2F8F5B" />
              <text x="374" y="315" fill="white" fontSize="12" fontWeight="bold">🚚</text>
            </g>

            {/* Pulsing Blocked Road Marker */}
            <g className="animate-bounce">
              <circle cx="560" cy="270" r="16" fill="#C6403A" opacity="0.3" className="animate-ping" />
              <circle cx="560" cy="270" r="12" fill="#C6403A" />
              <text x="554" y="274" fill="white" fontSize="12" fontWeight="bold">⚠️</text>
            </g>
          </svg>
        </div>

        {/* Live Stat Chips & About Link */}
        <div className="relative z-10 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-river-100 font-semibold">
                <MapPin className="w-3.5 h-3.5 text-tea-300" />
                <span>Districts</span>
              </div>
              <span className="text-xl font-bold font-mono">{overview?.districtsCount ?? 35}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-river-100 font-semibold">
                <Truck className="w-3.5 h-3.5 text-sky-300" />
                <span>Active Goods</span>
              </div>
              <span className="text-xl font-bold font-mono">{overview?.movingShipmentsCount ?? 12}</span>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-3 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-river-100 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-marigold-400" />
                <span>Disruptions</span>
              </div>
              <span className="text-xl font-bold font-mono text-marigold-300">{overview?.openDisruptionsCount ?? 4}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-river-200 pt-2 border-t border-white/10">
            <span>Official essential logistics coordination tool</span>
            <Link to="/about" className="hover:text-white underline flex items-center gap-1 font-semibold">
              <Info className="w-3.5 h-3.5" />
              {t('whatIsNerlogix')}
            </Link>
          </div>
        </div>
      </div>

      {/* Right Panel: Form Card (~40%) */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-y-auto">
        {/* Top Header: Language Switcher */}
        <div className="flex justify-between items-center mb-6">
          <div className="md:hidden flex items-center gap-2">
            <span className="font-heading font-bold text-xl text-river-600">NER-Logix</span>
          </div>

          <div className="flex items-center gap-1 bg-mist-100 p-1 rounded-control text-xs ml-auto">
            <Globe className="w-3.5 h-3.5 text-ink-400 ml-1" />
            {['en', 'hi', 'as', 'bn'].map((lang) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`px-2.5 py-1 rounded text-xs font-semibold uppercase transition ${
                  i18n.language === lang
                    ? 'bg-white text-river-600 shadow-sm'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Banner (< md) */}
        <div className="md:hidden mb-6 bg-river-600 text-white p-4 rounded-xl space-y-2">
          <h2 className="font-heading font-bold text-lg">{t('appName')}</h2>
          <p className="text-xs text-river-100">{t('taglineFull')}</p>
        </div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md w-full mx-auto my-auto space-y-6"
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-heading text-ink-900">{t(titleKey)}</h2>
            <p className="text-sm text-ink-600">Enter your operational credentials below</p>
          </div>

          {children}
        </motion.div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-ink-400">
          <span>&copy; 2026 NER-Logix • Conventional Logistics Management</span>
        </div>
      </div>
    </div>
  )
}
