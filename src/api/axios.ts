import axios from 'axios'

const getNormalizedBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()
  if (!envUrl) {
    return '/api'
  }
  const clean = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean.endsWith('/api') ? clean : `${clean}/api`
  }
  return clean.startsWith('/') ? (clean.endsWith('/api') ? clean : '/api') : `/${clean}`
}

export const apiBaseUrl = getNormalizedBaseUrl()

export const isJwtExpired = (token: string | null): boolean => {
  if (!token) return true
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const payload = JSON.parse(atob(parts[1]))
    if (!payload.exp) return false
    return Date.now() >= (payload.exp * 1000 - 5000)
  } catch {
    return true
  }
}

export const clearAuthStorage = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${accessToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && originalRequest) {
      // Do not attempt refresh on auth endpoints or if already retried
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest._retry
      ) {
        clearAuthStorage()
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken || isJwtExpired(refreshToken)) {
        clearAuthStorage()
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login'
        }
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${apiBaseUrl}/auth/refresh`, { refreshToken }, { timeout: 10000 })
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)

        api.defaults.headers.common['Authorization'] = 'Bearer ' + data.accessToken
        originalRequest.headers['Authorization'] = 'Bearer ' + data.accessToken

        processQueue(null, data.accessToken)
        return api(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        clearAuthStorage()
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api;
