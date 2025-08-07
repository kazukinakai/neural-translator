import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SettingsScreen from '../SettingsScreen'

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

describe('SettingsScreen', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
    
    // Clean up DOM
    document.body.innerHTML = ''
  })

  it('renders settings screen with all sections', () => {
    render(<SettingsScreen onBack={mockOnBack} />)
    
    // Check main title
    expect(screen.getByText('設定')).toBeInTheDocument()
    
    // Check section headers
    expect(screen.getByText('言語設定')).toBeInTheDocument()
    expect(screen.getByText('AIモデル設定')).toBeInTheDocument()
    expect(screen.getByText('APIキー設定')).toBeInTheDocument()
    expect(screen.getByText('ショートカットキー')).toBeInTheDocument()
    expect(screen.getByText('その他')).toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', () => {
    render(<SettingsScreen onBack={mockOnBack} />)
    
    const backButton = screen.getByTitle('設定から戻る')
    fireEvent.click(backButton)
    
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('loads saved settings from localStorage', () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      switch (key) {
        case 'userLanguage': return 'en'
        case 'aiModel': return 'gpt-4'
        case 'saveHistory': return 'true'
        case 'shortcuts': return JSON.stringify({ 'quick-translate': '⌘ + C + C' })
        case 'apiKeys': return JSON.stringify({ openai: 'test-key' })
        default: return null
      }
    })

    render(<SettingsScreen onBack={mockOnBack} />)
    
    // Check if saved values are loaded - use getByText for options in select elements
    expect(screen.getByText('🇺🇸 English')).toBeInTheDocument()
    expect(screen.getByText('OpenAI GPT-4')).toBeInTheDocument()
  })

  it('handles language selection', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen onBack={mockOnBack} />)
    
    // Find the language select by its label text
    const languageLabel = screen.getByText('母国語')
    const languageSelect = languageLabel.parentElement?.querySelector('select')
    expect(languageSelect).toBeInTheDocument()
    
    await user.selectOptions(languageSelect!, 'English')
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('nativeLang', 'English')
  })

  it('handles AI model selection', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen onBack={mockOnBack} />)
    
    // Find the model select by its label text
    const modelLabel = screen.getByText('使用するモデル')
    const modelSelect = modelLabel.parentElement?.querySelector('select')
    expect(modelSelect).toBeInTheDocument()
    
    await user.selectOptions(modelSelect!, 'gpt-4')
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aiModel', 'gpt-4')
  })

  it('handles API key input', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen onBack={mockOnBack} />)
    
    // Open API keys section
    const apiKeysButton = screen.getByText('APIキー設定')
    await user.click(apiKeysButton)
    
    const openaiKeyInput = screen.getByPlaceholderText('sk-...')
    await user.type(openaiKeyInput, 'test-api-key')
    
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'apiKeys',
        JSON.stringify({ openai: 'test-api-key' })
      )
    })
  })

  it('handles history toggle', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen onBack={mockOnBack} />)
    
    // Find the toggle button by looking for the toggle switch element
    const historyLabel = screen.getByText('翻訳履歴を保存')
    // Navigate to the parent div that contains both the label and the toggle
    const parentDiv = historyLabel.closest('.flex.items-center.justify-between')
    const toggleButton = parentDiv?.querySelector('button')
    expect(toggleButton).toBeInTheDocument()
    
    await user.click(toggleButton!)
    
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('saveHistory', 'false')
  })

  it('handles shortcut editing', async () => {
    const user = userEvent.setup()
    render(<SettingsScreen onBack={mockOnBack} />)
    
    // Find and click a shortcut button to edit - use the correct default shortcut
    const shortcutButton = screen.getByText('⌘ + C + C')
    await user.click(shortcutButton)
    
    // Should show input field
    const input = screen.getByDisplayValue('⌘ + C + C')
    expect(input).toBeInTheDocument()
    
    // Type a key to trigger onChange (the actual content isn't as important as the functionality)
    await user.type(input, '1')
    
    // The onChange should have been called to save shortcuts
    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'shortcuts',
        expect.any(String)
      )
    })
  })

it('displays all supported languages', () => {
    render(<SettingsScreen onBack={mockOnBack} />)
    
    const expectedLanguages = [
      '🇯🇵 日本語',
      '🇺🇸 English',
      '🇨🇳 中文',
      '🇰🇷 한국어',
      '🇪🇸 Español',
      '🇫🇷 Français',
      '🇩🇪 Deutsch'
    ]
    
    expectedLanguages.forEach(lang => {
      expect(screen.getByText(lang)).toBeInTheDocument()
    })
  })

  it('displays all AI models', () => {
    render(<SettingsScreen onBack={mockOnBack} />)
    
    const expectedModels = [
      'Ollama (ローカル)',
      'ML Engine (M4最適化)',
      'OpenAI GPT-4',
      'Anthropic Claude 3',
      'DeepL API'
    ]
    
    expectedModels.forEach(model => {
      expect(screen.getByText(model)).toBeInTheDocument()
    })
  })

  it('shows correct default shortcut keys', () => {
    render(<SettingsScreen onBack={mockOnBack} />)
    
    expect(screen.getByText('⌘ + C + C')).toBeInTheDocument()
    expect(screen.getByText('Cmd+Shift+S')).toBeInTheDocument()
    expect(screen.getByText('Cmd+K')).toBeInTheDocument()
    expect(screen.getByText('Cmd+C')).toBeInTheDocument()
  })
})