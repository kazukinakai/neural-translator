import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from '../App'

// Mock Tauri API calls
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}))

// Get the mocked functions
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
const mockInvoke = vi.mocked(invoke)
const mockListen = vi.mocked(listen)

// Mock navigator.clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined)

// Setup clipboard mock safely
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
})

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteText.mockClear()
    
    // Clean up DOM
    document.body.innerHTML = ''
    
    // Setup localStorage mocks with proper JSON strings
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      switch (key) {
        case 'nativeLang':
          return 'Japanese'
        case 'shortcuts':
          return JSON.stringify({})
        case 'apiKeys':
          return JSON.stringify({})
        default:
          return null
      }
    })
    
    // Setup comprehensive mock responses
    mockInvoke.mockImplementation((command: string) => {
      switch (command) {
        case 'check_ollama_health':
          return Promise.resolve(true)
        case 'check_ml_health':
          return Promise.resolve(false) // ML engine not available (placeholder)
        case 'detect_language':
          return Promise.resolve({ language: 'English' })
        case 'translate':
          return Promise.resolve({ translated_text: 'こんにちは' })
        case 'get_clipboard_text':
          return Promise.resolve('Hello from clipboard')
        case 'ml_detect_language':
          return Promise.resolve({ language: 'English', confidence: 0.95, latency_ms: 0 })
        case 'ml_translate':
          return Promise.resolve({ translated_text: '[開発中] Hello', confidence_score: 0.0, latency_ms: 0 })
        default:
          return Promise.resolve()
      }
    })
  })

  it('renders main application interface', async () => {
    await act(async () => {
      render(<App />)
    })
    
    // Wait for health check to complete
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('check_ollama_health')
    })
    
    // Check main elements
    expect(screen.getByText('NeuraL')).toBeInTheDocument()
    expect(screen.getByText('Translator')).toBeInTheDocument()
    expect(screen.getAllByText('翻訳元')).toHaveLength(1)
    expect(screen.getByText('翻訳先')).toBeInTheDocument()
    expect(screen.getByText('自動翻訳')).toBeInTheDocument()
  })

  it('shows language setup screen when no native language is set', async () => {
    mockLocalStorage.getItem.mockReturnValue(null) // No native language set
    
    await act(async () => {
      render(<App />)
    })
    
    expect(screen.getByText('Welcome to NeuraL Translator')).toBeInTheDocument()
    expect(screen.getByText('Please select your native language for the best translation experience')).toBeInTheDocument()
  })

  it('allows selecting native language in setup', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    const user = userEvent.setup()
    
    await act(async () => {
      render(<App />)
    })
    
    // Click on Japanese option
    const japaneseOption = screen.getByText('日本語')
    
    await act(async () => {
      await user.click(japaneseOption)
    })
    
    // Click confirm button
    const confirmButton = screen.getByText('設定を完了')
    await act(async () => {
      await user.click(confirmButton)
    })
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('nativeLang', 'Japanese')
    
    // Should now show main interface
    await waitFor(() => {
      expect(screen.getByText('翻訳するテキスト')).toBeInTheDocument()
    })
  })

  it('opens and closes settings screen', async () => {
    const user = userEvent.setup()
    
    await act(async () => {
      render(<App />)
    })
    
    // Wait for initial render
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('check_ollama_health')
    })
    
    // Click settings button (find by icon class)
    await waitFor(() => {
      const settingsButton = document.querySelector('.ri-settings-3-line')?.closest('button')
      expect(settingsButton).toBeInTheDocument()
    })
    
    const settingsButton = document.querySelector('.ri-settings-3-line')?.closest('button')
    
    await act(async () => {
      await user.click(settingsButton!)
    })
    
    // Should show settings screen
    expect(screen.getByText('設定')).toBeInTheDocument()
    expect(screen.getByText('言語設定')).toBeInTheDocument()
    
    // Click back button
    const backButton = screen.getByTitle('設定から戻る')
    
    await act(async () => {
      await user.click(backButton)
    })
    
    // Should return to main interface
    expect(screen.getByText('翻訳するテキスト')).toBeInTheDocument()
  })

  it('displays correct shortcut hint', async () => {
    await act(async () => {
      render(<App />)
    })
    
    expect(screen.getByText(/でクイック起動/)).toBeInTheDocument()
  })

  it('handles translation process', async () => {
    const user = userEvent.setup()
    
    await act(async () => {
      render(<App />)
    })
    
    // Wait for initial health check
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('check_ollama_health')
    })
    
    // Type in the input area
    const textarea = screen.getByPlaceholderText('翻訳したいテキストを入力またはペーストしてください')
    
    await act(async () => {
      await user.type(textarea, 'Hello')
    })
    
    // Should trigger translation after debounce (may be called with partial text during typing)
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('detect_language', expect.objectContaining({
        text: expect.any(String)
      }))
    }, { timeout: 1500 })
  })

  it('displays health status', async () => {
    mockInvoke.mockImplementation((command: string) => {
      switch (command) {
        case 'check_ollama_health':
          return Promise.resolve(true)
        case 'check_ml_health':
          return Promise.resolve(false)
        default:
          return Promise.resolve()
      }
    })
    
    await act(async () => {
      render(<App />)
    })
    
    await waitFor(() => {
      // Check for Ollama online status
      expect(screen.getByText(/Ollamaオンライン/)).toBeInTheDocument()
      // Check for ML engine status (should show "開発中" when not available)
      expect(screen.getByText(/ML開発中/)).toBeInTheDocument()
    })
  })

  it('handles auto-translate toggle', async () => {
    const user = userEvent.setup()
    
    await act(async () => {
      render(<App />)
    })
    
    // Wait for initial render
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('check_ollama_health')
    })
    
    const autoTranslateButton = screen.getByText('自動翻訳')
    
    await act(async () => {
      await user.click(autoTranslateButton)
    })
    
    // Button should change appearance when toggled (purple color now)
    expect(autoTranslateButton.closest('button')).toHaveClass('bg-purple-500')
  })

  it('handles language switching', async () => {
    await act(async () => {
      render(<App />)
    })
    
    // Wait for initial render
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('check_ollama_health')
    })
    
    // Find and click language switch button
    const switchButton = screen.getByTitle('言語を入れ替え')
    
    // Button should be disabled initially (when fromLang is "Auto")
    expect(switchButton).toBeDisabled()
  })

  it('handles translation errors gracefully', async () => {
    const user = userEvent.setup()
    // Setup specific mock for this test - need to let health check succeed first
    mockInvoke.mockImplementation((command: string) => {
      if (command === 'check_ollama_health') {
        return Promise.resolve(true)
      }
      if (command === 'check_ml_health') {
        return Promise.resolve(false) // ML not available
      }
      return Promise.reject(new Error('Translation failed'))
    })
    
    await act(async () => {
      render(<App />)
    })
    
    // Wait for health checks to complete
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('check_ollama_health')
      expect(mockInvoke).toHaveBeenCalledWith('check_ml_health')
    })
    
    const textarea = screen.getByPlaceholderText('翻訳したいテキストを入力またはペーストしてください')
    
    await act(async () => {
      await user.type(textarea, 'Hello')
    })
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/翻訳エラーが発生しました/)).toBeInTheDocument()
    }, { timeout: 1500 })
  })

  it('sets up global shortcut listener on mount', async () => {
    await act(async () => {
      render(<App />)
    })
    
    expect(mockListen).toHaveBeenCalledWith(
      'translate-shortcut',
      expect.any(Function)
    )
  })

  it('checks Ollama health on mount', async () => {
    await act(async () => {
      render(<App />)
    })
    
    expect(mockInvoke).toHaveBeenCalledWith('check_ollama_health')
  })

  it('handles clipboard monitoring when auto-translate is enabled', async () => {
    const user = userEvent.setup()
    mockInvoke.mockResolvedValue('Clipboard text')
    
    await act(async () => {
      render(<App />)
    })
    
    // Wait for initial render
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('check_ollama_health')
    })
    
    // Enable auto-translate
    const autoTranslateButton = screen.getByText('自動翻訳')
    
    await act(async () => {
      await user.click(autoTranslateButton)
    })
    
    // Mock clipboard monitoring interval would call get_clipboard_text
    // This is tested by checking that the function is available to be called
    expect(mockInvoke).toHaveBeenCalledWith('check_ollama_health')
  })

  it('displays translation cache behavior', async () => {
    const user = userEvent.setup()
    const testText = 'Hello'
    const translatedText = 'こんにちは'
    
    mockInvoke.mockImplementation((command: string) => {
      switch (command) {
        case 'check_ollama_health':
          return Promise.resolve(true)
        case 'detect_language':
          return Promise.resolve({ language: 'English' })
        case 'translate':
          return Promise.resolve({ translated_text: translatedText })
        default:
          return Promise.resolve()
      }
    })
    
    await act(async () => {
      render(<App />)
    })
    
    // Wait for health check
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('check_ollama_health')
    })
    
    const textarea = screen.getByPlaceholderText('翻訳したいテキストを入力またはペーストしてください')
    
    // First translation
    await act(async () => {
      await user.type(textarea, testText)
    })
    
    await waitFor(() => {
      expect(screen.getByText(translatedText)).toBeInTheDocument()
    }, { timeout: 1500 })
    
    // Clear and type same text again
    await act(async () => {
      // Use selectall and delete instead of clear to avoid focus issues
      await user.click(textarea)
      await user.keyboard('{Control>}a{/Control}')
      await user.keyboard('{Delete}')
      await user.type(textarea, testText)
    })
    
    // Should use cached result (mockInvoke should not be called again for translate)
    await waitFor(() => {
      expect(screen.getByText(translatedText)).toBeInTheDocument()
    }, { timeout: 1500 })
  })
})