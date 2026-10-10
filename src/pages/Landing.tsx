import React, { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll } from 'framer-motion'
import Lenis from '@studio-freight/lenis'
import {
  ShieldAlert, MapPin, Truck, CloudRain, Navigation,
  Activity, ArrowRight, UserCheck, ShieldCheck, UserCog, CheckCircle2
} from 'lucide-react'
import { api } from '../api/axios'
import { GoogleMapEmbed } from '../components/GoogleMapEmbed'

interface OverviewData {
  districtsMonitored: number
  segmentsTracked: number
  shipmentsMoving: number
  disruptionsOpen: number
}

export const Landing: React.FC = () => {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [activeStep, setActiveStep] = useState<number>(1)
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  // Fetch public overview
  useEffect(() => {
    api.get<OverviewData>('/public/overview')
      .then((res) => setOverview(res.data))
      .catch(() => {})
  }, [])

  // Scroll listener for pipeline steps
  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (val) => {
      const step = Math.min(6, Math.max(1, Math.ceil(val * 6)))
      setActiveStep(step)
    })
    return () => unsubscribe()
  }, [scrollYProgress])

  const pipelineSteps = [
    { num: 1, title: 'Field Event / GPS Created', desc: 'Local report of a landslide or live GPS ping from convoy vehicle.' },
    { num: 2, title: 'Data Upload / Offline Sync', desc: 'Field data uploaded directly or queued offline in IndexedDB and synced on reconnect.' },
    { num: 3, title: 'Central DB Processing', desc: 'Server validates report, stores history log, and applies rule engine status changes.' },
    { num: 4, title: 'GIS Map & Dashboard Update', desc: 'Updates pushed live to open screens via Server-Sent Events.' },
    { num: 5, title: 'Alerts Sent to Stakeholders', desc: 'In-app alert notifications delivered to drivers, operators, and authorities in their language.' },
    { num: 6, title: 'Route Action / Response', desc: 'Safer alternate route proposed, accepted by driver, and convoy proceeds without delay.' },
  ]

  const objectives = [
    { icon: MapPin, title: 'Monitor Accessibility', desc: 'Track road, bridge, and mountain pass status across all terrain classes and districts.' },
    { icon: Truck, title: 'Track Essential Goods', desc: 'Real-time GPS visibility for convoys delivering medical, food, and emergency supplies.' },
    { icon: ShieldAlert, title: 'Field Incident Reporting', desc: 'Geo-tagged reports and photos submitted from remote valley locations, offline ready.' },
    { icon: Activity, title: 'Information Transparency', desc: 'Unified real-time visibility across authorities and logistics coordinators.' },
    { icon: CloudRain, title: 'Multi-lingual Alerts', desc: 'Instant notifications generated automatically in English, Hindi, Assamese, and Bengali.' },
    { icon: Navigation, title: 'Alternate Routes & Delay Estimates', desc: 'Rule-based Dijkstra routing recalculates around blocked segments with delay reasons.' },
  ]

  return (
    <div className="min-h-screen bg-mist-50 text-ink-900 font-body">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-mist-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-heading font-bold text-xl text-river-600">NER-Logix</span>
          <span className="text-xs bg-river-100 text-river-700 font-semibold px-2 py-0.5 rounded">Platform Demo</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-semibold text-river-600 hover:text-river-700 transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/map"
            className="px-4 py-2 bg-river-600 text-white text-sm font-semibold rounded-control hover:bg-river-700 transition-colors shadow-sm"
          >
            View live map
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-8 pt-16 pb-20 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold font-heading text-ink-900 leading-tight mb-6">
            Know which roads are open before your convoy leaves.
          </h1>
          <p className="text-ink-600 text-lg mb-8 leading-relaxed">
            NER-Logix provides rule-based logistics coordination, real-time GPS tracking, and instant route diversions across the North Eastern Region of India.
          </p>
          <div className="flex flex-wrap gap-4 mb-12">
            <Link
              to="/login"
              className="px-6 py-3 bg-river-600 text-white font-semibold text-base rounded-control hover:bg-river-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <span>Sign in</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/map"
              className="px-6 py-3 bg-white border border-mist-200 text-ink-900 font-semibold text-base rounded-control hover:bg-mist-100 transition-colors"
            >
              View the live map
            </Link>
          </div>

          {/* Live Count-ups */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white border border-mist-200 rounded-panel shadow-sm">
            <div>
              <span className="block text-2xl font-bold font-heading text-river-600">
                {overview ? overview.districtsMonitored : 32}
              </span>
              <span className="text-xs text-ink-600 font-medium">Districts monitored</span>
            </div>
            <div>
              <span className="block text-2xl font-bold font-heading text-river-600">
                {overview ? overview.segmentsTracked : 65}
              </span>
              <span className="text-xs text-ink-600 font-medium">Segments tracked</span>
            </div>
            <div>
              <span className="block text-2xl font-bold font-heading text-river-600">
                {overview ? overview.shipmentsMoving : 4}
              </span>
              <span className="text-xs text-ink-600 font-medium">Shipments moving</span>
            </div>
            <div>
              <span className="block text-2xl font-bold font-heading text-rust-600">
                {overview ? overview.disruptionsOpen : 4}
              </span>
              <span className="text-xs text-ink-600 font-medium">Disruptions open</span>
            </div>
          </div>
        </div>

        {/* Home Screen Google Maps Live Regional Network */}
        <div className="bg-white border border-mist-200 rounded-panel p-6 shadow-floating space-y-4" data-lenis-prevent>
          <div className="text-xs font-semibold text-ink-600 flex items-center justify-between">
            <span>NER Logistics Corridors & Accessibility Overview</span>
            <span className="inline-flex items-center gap-1.5 text-tea-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-tea-500 animate-pulse" /> Live System
            </span>
          </div>

          <GoogleMapEmbed
            query="Guwahati, Assam, India"
            zoom={7}
            height="360px"
            title="North Eastern Region Essential Logistics Network (Google Maps View)"
          />
        </div>
      </section>

      {/* How it Works - Scroll Driven Section */}
      <section ref={containerRef} className="py-20 bg-white border-y border-mist-200 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold text-river-600 uppercase tracking-wider">Operational Pipeline</span>
            <h2 className="text-3xl font-bold font-heading text-ink-900 mt-2">
              From field report to route diversion in seconds.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              {pipelineSteps.map((step) => {
                const isActive = activeStep === step.num
                return (
                  <motion.div
                    key={step.num}
                    animate={{ scale: isActive ? 1.02 : 1 }}
                    className={`p-6 rounded-panel border transition-all ${
                      isActive
                        ? 'border-river-600 bg-river-100/30 shadow-sm'
                        : 'border-mist-200 bg-mist-50 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center ${
                        isActive ? 'bg-river-600 text-white' : 'bg-mist-200 text-ink-600'
                      }`}>
                        {step.num}
                      </span>
                      <h3 className="font-heading font-bold text-lg text-ink-900">{step.title}</h3>
                    </div>
                    <p className="text-ink-600 text-sm pl-10">{step.desc}</p>
                  </motion.div>
                )
              })}
            </div>

            <div className="sticky top-24 bg-mist-50 border border-mist-200 rounded-panel p-6" data-lenis-prevent>
              <h3 className="text-sm font-bold text-ink-900 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-river-600" />
                Pipeline Active Stage: Step {activeStep} of 6
              </h3>
              <p className="text-ink-600 text-sm mb-6">
                {pipelineSteps[activeStep - 1].desc}
              </p>
              <div className="space-y-3">
                {pipelineSteps.map((s) => (
                  <div key={s.num} className="flex items-center gap-3">
                    <CheckCircle2 className={`w-4 h-4 ${s.num <= activeStep ? 'text-tea-500' : 'text-mist-200'}`} />
                    <span className={`text-xs font-medium ${s.num === activeStep ? 'text-ink-900 font-bold' : 'text-ink-400'}`}>
                      {s.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Objectives Section */}
      <section className="py-20 px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-river-600 uppercase tracking-wider">Core Capabilities</span>
          <h2 className="text-3xl font-bold font-heading text-ink-900 mt-2">
            Built for mountain terrain, harsh monsoons, and remote field teams.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {objectives.map((obj) => {
            const Icon = obj.icon
            return (
              <div key={obj.title} className="p-6 bg-white border border-mist-200 rounded-panel flex items-start gap-4 shadow-sm">
                <div className="p-3 bg-river-100 text-river-600 rounded-control">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-ink-900 mb-1">{obj.title}</h3>
                  <p className="text-ink-600 text-sm leading-relaxed">{obj.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-16 bg-white border-t border-mist-200 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-river-600 uppercase tracking-wider">Access Control</span>
            <h2 className="text-2xl font-bold font-heading text-ink-900 mt-1">
              Three clear roles for field officers, operators, and central owners.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-mist-50 border border-mist-200 rounded-panel">
              <div className="flex items-center gap-3 mb-3">
                <UserCheck className="w-5 h-5 text-river-600" />
                <h3 className="font-heading font-bold text-base text-ink-900">User (Field / Driver)</h3>
              </div>
              <p className="text-ink-600 text-xs leading-relaxed">
                View map and weather, submit field incident reports offline, receive notifications. Driver mode for assigned shipments.
              </p>
            </div>

            <div className="p-6 bg-mist-50 border border-mist-200 rounded-panel">
              <div className="flex items-center gap-3 mb-3">
                <ShieldCheck className="w-5 h-5 text-river-600" />
                <h3 className="font-heading font-bold text-base text-ink-900">Moderator (Logistics Ops)</h3>
              </div>
              <p className="text-ink-600 text-xs leading-relaxed">
                Everything USER can, plus verify reports, resolve incidents, set road status, manage shipments/vehicles, broadcast alerts.
              </p>
            </div>

            <div className="p-6 bg-mist-50 border border-mist-200 rounded-panel">
              <div className="flex items-center gap-3 mb-3">
                <UserCog className="w-5 h-5 text-river-600" />
                <h3 className="font-heading font-bold text-base text-ink-900">Admin (Central Mgmt)</h3>
              </div>
              <p className="text-ink-600 text-xs leading-relaxed">
                Everything MODERATOR can, plus user role management, rule thresholds, API keys, audit logs, and demo simulation tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-mist-200 px-8 text-center text-xs text-ink-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-ink-900">NER-Logix Platform</span> — Logistics and Accessibility Management Platform for the North Eastern Region.
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-river-600 font-semibold">Sign in</Link>
            <Link to="/register" className="hover:text-river-600 font-semibold">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
