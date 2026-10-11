import axios, { AxiosRequestConfig } from 'axios';

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

const getNormalizedBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  const prodFallback = 'https://nerlogixbackend.onrender.com/api';

  const isBrowser = typeof window !== 'undefined';
  const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // In production / Vercel: never call localhost
  if (isBrowser && !isLocalhost) {
    if (envUrl && (envUrl.startsWith('https://') || envUrl.startsWith('http://')) && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      const clean = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
      return clean.endsWith('/api') ? clean : `${clean}/api`;
    }
    return prodFallback;
  }

  // Local development / preview
  if (!envUrl) {
    return prodFallback;
  }
  const clean = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean.endsWith('/api') ? clean : `${clean}/api`;
  }
  return clean.startsWith('/') ? (clean.endsWith('/api') ? clean : '/api') : `/${clean}`;
};

export const apiBaseUrl = getNormalizedBaseUrl();

export const isJwtExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return Date.now() >= (payload.exp * 1000 - 5000);
  } catch {
    return true;
  }
};

export const clearAuthStorage = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

let warmingUp = false;
let warmUpListeners: Array<(isWarming: boolean) => void> = [];

export const onWarmupChange = (cb: (isWarming: boolean) => void) => {
  warmUpListeners.push(cb);
  cb(warmingUp);
  return () => {
    warmUpListeners = warmUpListeners.filter((l) => l !== cb);
  };
};

const setWarmingUp = (val: boolean) => {
  if (warmingUp !== val) {
    warmingUp = val;
    warmUpListeners.forEach((l) => l(val));
  }
};

// Fire-and-forget warmup request on load
export const triggerWarmup = () => {
  const warmupTimer = setTimeout(() => {
    setWarmingUp(true);
  }, 4000);

  axios
    .get(`${apiBaseUrl}/health`, { timeout: 45000 })
    .catch(() => {})
    .finally(() => {
      clearTimeout(warmupTimer);
      setWarmingUp(false);
    });
};

if (typeof window !== 'undefined') {
  triggerWarmup();
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    setWarmingUp(false);
    // If response is HTML instead of expected JSON (e.g. from an SPA static fallback), reject it
    if (
      typeof response.data === 'string' &&
      (response.data.trim().startsWith('<!DOCTYPE html') ||
        response.data.trim().startsWith('<html') ||
        String(response.headers?.['content-type'] || '').includes('text/html'))
    ) {
      return Promise.reject(new Error(`API received HTML instead of JSON from endpoint ${response.config.url}`));
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    // Retry idempotent GET requests on 502/503/504 or network timeouts (Render cold start)
    const status = error.response?.status;
    const isIdempotent = originalRequest?.method?.toLowerCase() === 'get';
    const isServerError = status === 502 || status === 503 || status === 504 || error.code === 'ECONNABORTED';

    if (originalRequest && isIdempotent && isServerError) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      if (originalRequest._retryCount <= 3) {
        setWarmingUp(true);
        const delay = Math.pow(2, originalRequest._retryCount - 1) * 1000; // 1s, 2s, 4s
        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(originalRequest);
      }
    }

    if (error.response?.status === 401 && originalRequest) {
      // Do not attempt refresh on auth endpoints or if already retried
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest._retry
      ) {
        clearAuthStorage();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken || isJwtExpired(refreshToken)) {
        clearAuthStorage();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${apiBaseUrl}/auth/refresh`, { refreshToken }, { timeout: 15000 });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        api.defaults.headers.common['Authorization'] = 'Bearer ' + data.accessToken;
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = 'Bearer ' + data.accessToken;
        }

        processQueue(null, data.accessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthStorage();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
