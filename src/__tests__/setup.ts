import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as unknown as Storage

// Mock fetch
global.fetch = vi.fn()

// Mock window.location
delete (window as { location?: Location }).location
window.location = {
  href: '',
  pathname: '/',
  search: '',
  hash: '',
  hostname: 'localhost',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  port: '3000',
  assign: vi.fn(),
  reload: vi.fn(),
  replace: vi.fn(),
} as unknown as Location
