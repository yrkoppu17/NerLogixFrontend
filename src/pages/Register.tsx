import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthShell } from '../components/AuthShell'
import { User, Mail, Lock, Globe, ArrowRight } from 'lucide-react'

export const Register: React.FC = () => {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [language, setLanguage] = useState('en')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await register(email, password, name, language)
      navigate('/map')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string } } }).response
        setError(res?.data?.message || 'Registration failed. Check details and password policy.')
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell titleKey="fieldUser">
      {error && (
        <div className="p-3 bg-rust-100 border border-rust-200 text-rust-700 text-xs rounded-control font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-ink-600">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Das"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-ink-600">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-ink-600">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ chars with uppercase, number & symbol"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-ink-600">Preferred System Language</label>
          <div className="relative">
            <Globe className="w-4 h-4 text-ink-400 absolute left-3 top-3 pointer-events-none" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="as">Assamese (অসমীয়া)</option>
              <option value="bn">Bengali (বাংলা)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-river-600 hover:bg-river-700 text-white font-semibold text-sm rounded-control transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="pt-4 border-t border-mist-200 text-center text-xs">
        <Link to="/login" className="text-river-600 font-semibold hover:underline">
          Already have an account? Sign in
        </Link>
      </div>
    </AuthShell>
  )
}
