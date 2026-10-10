import { useState, useEffect } from 'react'
import api from '../api/axios'

export function useAuthImage(src?: string | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(Boolean(src))

  useEffect(() => {
    if (!src) {
      setObjectUrl(null)
      setLoading(false)
      return
    }

    if (src.startsWith('data:') || src.startsWith('blob:')) {
      setObjectUrl(src)
      setLoading(false)
      return
    }

    let active = true
    let createdUrl: string | null = null

    setLoading(true)
    api.get(src, { responseType: 'blob' })
      .then(res => {
        if (!active) return
        createdUrl = URL.createObjectURL(res.data)
        setObjectUrl(createdUrl)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setObjectUrl(null)
        setLoading(false)
      })

    return () => {
      active = false
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [src])

  return { objectUrl, loading }
}
