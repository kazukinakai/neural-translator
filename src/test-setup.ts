// Test setup for Tauri mocking
import '@testing-library/jest-dom'

// Mock Tauri API
const mockTauri = {
  invoke: vi.fn().mockResolvedValue({}),
  event: {
    listen: vi.fn().mockResolvedValue(() => {}),
    emit: vi.fn().mockResolvedValue(undefined),
  },
  window: {
    getCurrent: vi.fn().mockReturnValue({
      show: vi.fn().mockResolvedValue(undefined),
      hide: vi.fn().mockResolvedValue(undefined),
    }),
  },
  os: {
    type: vi.fn().mockResolvedValue('Darwin'),
    arch: vi.fn().mockResolvedValue('aarch64'),
  },
}

// Create global Tauri mock
Object.defineProperty(window, '__TAURI__', {
  value: mockTauri,
  writable: true,
})

// Mock system metrics for SettingsScreen
const mockSystemMetrics = {
  system: {
    os: 'macos',
    arch: 'aarch64',
  },
  memory: {
    app_memory_mb: 150,
  },
}

// Global fetch mock for API calls
global.fetch = vi.fn()

// Mock performance metrics
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn().mockReturnValue(Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
  },
  writable: true,
})

// Export mock data for use in tests
export { mockTauri, mockSystemMetrics }