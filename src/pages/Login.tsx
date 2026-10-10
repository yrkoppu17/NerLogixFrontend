import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../context/AuthContext'
import { AuthShell } from '../components/AuthShell'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Lock, Mail, Truck, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export const Login: React.FC = () => {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [welcomeSplash, setWelcomeSplash] = useState<{ name: string; role: string } | null>(null)
  const [selectedRoleTile, setSelectedRoleTile] = useState<string>('USER')

  // If already signed in, redirect straight to role home
  useEffect(() => {
    if (user) {
      const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname
      if (fromPath && fromPath !== '/login' && fromPath !== '/register' && fromPath !== '/') {
        navigate(fromPath, { replace: true })
      } else {
        const homePath = user.role === 'USER' ? '/map' : '/dashboard'
        navigate(homePath, { replace: true })
      }
    }
  }, [user, navigate, location])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'user@nerlogix.com',
      password: 'Demo@1234',
    },
  })

  const fillDemoRole = (email: string, roleKey: string) => {
    setSelectedRoleTile(roleKey)
    setValue('email', email, { shouldValidate: true })
    setValue('password', 'Demo@1234', { shouldValidate: true })
  }

  const onSubmit = async (data: LoginFormData) => {
    setErrorMessage(null)
    try {
      await login(data.email, data.password)
      // Read current logged in user from localstorage / state
      const saved = localStorage.getItem('user')
      const loggedUser = saved ? JSON.parse(saved) : null
      const uName = loggedUser?.name || data.email.split('@')[0]
      const uRole = loggedUser?.role || selectedRoleTile

      setWelcomeSplash({ name: uName, role: uRole })

      // Trigger ~1s splash transition then navigate
      setTimeout(() => {
        const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname
        if (fromPath && fromPath !== '/login' && fromPath !== '/register' && fromPath !== '/') {
          navigate(fromPath, { replace: true })
        } else {
          const homePath = uRole === 'USER' ? '/map' : '/dashboard'
          navigate(homePath, { replace: true })
        }
      }, 1000)
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const status = (err as { response?: { status?: number; data?: { message?: string } } }).response?.status
        if (status === 429) {
          setErrorMessage(t('tooManyAttempts'))
        } else {
          setErrorMessage(t('invalidCredentials'))
        }
      } else {
        setErrorMessage('Failed to sign in. Please check your credentials.')
      }
    }
  }

  return (
    <AuthShell titleKey="signInTitle" welcomeSplash={welcomeSplash}>
      {/* Role Selector Radiogroup Tiles */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider">
          Demo Role Pre-fill
        </label>
        <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Tile 1: Field User / Driver */}
          <button
            type="button"
            role="radio"
            aria-checked={selectedRoleTile === 'USER'}
            onClick={() => fillDemoRole('user@nerlogix.com', 'USER')}
            className={`p-3 rounded-control text-left border transition ${
              selectedRoleTile === 'USER'
                ? 'bg-river-100/60 border-river-600 ring-2 ring-river-600/20'
                : 'bg-white border-mist-200 hover:border-mist-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Truck className="w-4 h-4 text-river-600 shrink-0" />
              <span className="text-xs font-bold text-ink-900">User / Driver</span>
            </div>
            <p className="text-[11px] text-ink-600 line-clamp-2 leading-tight">
              Reports, weather & navigation
            </p>
          </button>

          {/* Tile 2: Operator */}
          <button
            type="button"
            role="radio"
            aria-checked={selectedRoleTile === 'MODERATOR'}
            onClick={() => fillDemoRole('moderator@nerlogix.com', 'MODERATOR')}
            className={`p-3 rounded-control text-left border transition ${
              selectedRoleTile === 'MODERATOR'
                ? 'bg-river-100/60 border-river-600 ring-2 ring-river-600/20'
                : 'bg-white border-mist-200 hover:border-mist-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-tea-600 shrink-0" />
              <span className="text-xs font-bold text-ink-900">Operator</span>
            </div>
            <p className="text-[11px] text-ink-600 line-clamp-2 leading-tight">
              Verify, stock & fleet control
            </p>
          </button>

          {/* Tile 3: Admin */}
          <button
            type="button"
            role="radio"
            aria-checked={selectedRoleTile === 'ADMIN'}
            onClick={() => fillDemoRole('admin@nerlogix.com', 'ADMIN')}
            className={`p-3 rounded-control text-left border transition ${
              selectedRoleTile === 'ADMIN'
                ? 'bg-river-100/60 border-river-600 ring-2 ring-river-600/20'
                : 'bg-white border-mist-200 hover:border-mist-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-marigold-600 shrink-0" />
              <span className="text-xs font-bold text-ink-900">Central Admin</span>
            </div>
            <p className="text-[11px] text-ink-600 line-clamp-2 leading-tight">
              Full access & rules thresholds
            </p>
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-3 bg-rust-100 border border-rust-200 text-rust-700 text-xs rounded-control font-medium">
          {errorMessage}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-ink-600">{t('email')}</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
            <input
              type="email"
              {...register('email')}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
              placeholder="user@nerlogix.com"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-rust-600 font-medium">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-ink-600">{t('password')}</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              className="w-full pl-9 pr-10 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-ink-400 hover:text-ink-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rust-600 font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-river-600 hover:bg-river-700 text-white font-semibold text-sm rounded-control transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>{isSubmitting ? t('signingIn') : t('signIn')}</span>
          {!isSubmitting && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      {/* Register & About Links */}
      <div className="pt-4 border-t border-mist-200 flex items-center justify-between text-xs">
        <Link to="/register" className="text-river-600 font-semibold hover:underline">
          Don't have an account? Register
        </Link>
        <Link to="/about" className="text-ink-600 hover:text-ink-900 underline font-medium">
          {t('whatIsNerlogix')}
        </Link>
      </div>
    </AuthShell>
  )
}
