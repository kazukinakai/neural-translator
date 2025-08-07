import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
})

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd, args) => {
    switch (cmd) {
      case 'process_file_content':
        return Promise.resolve('Mocked file content extracted from ' + (args?.fileName || 'unknown file'))
      case 'get_system_metrics':
        return Promise.resolve({
          system: {
            os: 'macos',
            arch: 'aarch64'
          },
          memory: { 
            total_mb: 8192, 
            used_mb: 4096, 
            usage_percent: 50,
            app_memory_mb: 150
          },
          cpu: { count: 8, usage_percent: 25.5 },
          gpu: { available: true, status: 'Metal GPU Available' }
        })
      case 'validate_file_type':
        const fileName = args?.file_path || ''
        if (fileName.endsWith('.txt')) return Promise.resolve('text')
        if (fileName.endsWith('.docx')) return Promise.resolve('docx')
        if (fileName.endsWith('.pdf')) return Promise.resolve('pdf')
        return Promise.reject('Unsupported file type')
      default:
        return Promise.resolve(`Mocked result for ${cmd}`)
    }
  })
}))

// Mock Tauri event API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockImplementation(() => Promise.resolve(() => {}))
}))

// React 19 compatibility - suppress legacy warnings
const originalError = console.error
const originalWarn = console.warn

beforeEach(() => {
  vi.clearAllMocks()
  
  // Clean up DOM between tests
  document.body.innerHTML = ''
  
  // Suppress React 19 act() warnings and legacy warnings
  console.error = (...args: any[]) => {
    if (
      args[0] &&
      typeof args[0] === 'string' &&
      (args[0].includes('not configured to support act') ||
       args[0].includes('was not wrapped in act') ||
       args[0].includes('Warning: An update to'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
  
  console.warn = (...args: any[]) => {
    if (
      args[0] &&
      typeof args[0] === 'string' &&
      args[0].includes('act')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

// Restore console functions after each test
afterEach(() => {
  console.error = originalError
  console.warn = originalWarn
})