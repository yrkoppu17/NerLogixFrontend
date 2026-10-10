import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

vi.mock('./api/axios', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (url === '/public/overview') {
        return Promise.resolve({ data: { districtsMonitored: 32, segmentsTracked: 65, shipmentsMoving: 4, disruptionsOpen: 4 } })
      }
      return Promise.resolve({ data: {} })
    }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  },
}))

describe('App', () => {
  it('renders application title', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'UP', database: 'UP' }),
    }))
    render(<App />)
    expect(screen.getAllByText('NER-Logix').length).toBeGreaterThan(0)
  })
})
