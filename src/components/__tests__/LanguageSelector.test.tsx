import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LanguageSelector from '../LanguageSelector'

const mockLanguages = [
  { code: 'Auto', name: '言語を検出', flag: '🌐' },
  { code: 'Japanese', name: '日本語', flag: '🇯🇵' },
  { code: 'English', name: 'English', flag: '🇺🇸' },
  { code: 'Chinese', name: '中文', flag: '🇨🇳' },
]

describe('LanguageSelector', () => {
  const mockOnLanguageChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Clean up DOM
    document.body.innerHTML = ''
  })

  it('renders with correct label and selected language', () => {
    render(
      <LanguageSelector
        selectedLanguage="Japanese"
        onLanguageChange={mockOnLanguageChange}
        languages={mockLanguages}
        label="翻訳元"
      />
    )
    
    expect(screen.getByText('翻訳元')).toBeInTheDocument()
    expect(screen.getByText('日本語')).toBeInTheDocument()
    expect(screen.getByText('🇯🇵')).toBeInTheDocument()
  })

  it('shows dropdown arrow and toggles on click', async () => {
    const user = userEvent.setup()
    render(
      <LanguageSelector
        selectedLanguage="Japanese"
        onLanguageChange={mockOnLanguageChange}
        languages={mockLanguages}
        label="翻訳元"
      />
    )
    
    // Find the button by its content instead of role
    const button = screen.getByText('日本語').closest('button')
    expect(button).toBeInTheDocument()
    
    // Initially, dropdown should be closed
    expect(screen.queryByText('言語を検出')).not.toBeInTheDocument()
    
    // Click to open dropdown
    await user.click(button!)
    expect(screen.getByText('言語を検出')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('中文')).toBeInTheDocument()
  })

  it('calls onLanguageChange when language is selected', async () => {
    const user = userEvent.setup()
    render(
      <LanguageSelector
        selectedLanguage="Japanese"
        onLanguageChange={mockOnLanguageChange}
        languages={mockLanguages}
        label="翻訳元"
      />
    )
    
    // Open dropdown - find the main button, not the dropdown option
    const allJapaneseElements = screen.getAllByText('日本語')
    const mainButton = allJapaneseElements[0].closest('button')
    await user.click(mainButton!)
    
    // Select English
    const englishOption = screen.getByText('English')
    await user.click(englishOption)
    
    expect(mockOnLanguageChange).toHaveBeenCalledWith('English')
  })

  it('closes dropdown after selection', async () => {
    const user = userEvent.setup()
    render(
      <LanguageSelector
        selectedLanguage="Japanese"
        onLanguageChange={mockOnLanguageChange}
        languages={mockLanguages}
        label="翻訳元"
      />
    )
    
    // Open dropdown - find the main button, not the dropdown option
    const allJapaneseElements = screen.getAllByText('日本語')
    const mainButton = allJapaneseElements[0].closest('button')
    await user.click(mainButton!)
    
    // Select a language
    const englishOption = screen.getByText('English')
    await user.click(englishOption)
    
    // Dropdown should be closed
    expect(screen.queryByText('言語を検出')).not.toBeInTheDocument()
  })

  it('shows checkmark for selected language', async () => {
    const user = userEvent.setup()
    render(
      <LanguageSelector
        selectedLanguage="Japanese"
        onLanguageChange={mockOnLanguageChange}
        languages={mockLanguages}
        label="翻訳元"
      />
    )
    
    // Open dropdown - find the main button, not the dropdown option
    const allJapaneseElements = screen.getAllByText('日本語')
    const mainButton = allJapaneseElements[0].closest('button')
    await user.click(mainButton!)
    
    // Check if checkmark is present for selected language (Japanese displays as 日本語)
    // Look for the checkmark icon (ri-check-line class)
    const checkmark = document.querySelector('.ri-check-line')
    expect(checkmark).toBeTruthy()
  })

  it('handles unknown selected language gracefully', () => {
    render(
      <LanguageSelector
        selectedLanguage="Unknown"
        onLanguageChange={mockOnLanguageChange}
        languages={mockLanguages}
        label="翻訳元"
      />
    )
    
    // Should show default values
    expect(screen.getByText('言語を選択')).toBeInTheDocument()
    expect(screen.getByText('🌐')).toBeInTheDocument()
  })

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <LanguageSelector
          selectedLanguage="Japanese"
          onLanguageChange={mockOnLanguageChange}
          languages={mockLanguages}
          label="翻訳元"
        />
        <div data-testid="outside">Outside element</div>
      </div>
    )
    
    // Open dropdown - find the main button, not the dropdown option
    const allJapaneseElements = screen.getAllByText('日本語')
    const mainButton = allJapaneseElements[0].closest('button')
    await user.click(mainButton!)
    expect(screen.getByText('言語を検出')).toBeInTheDocument()
    
    // Click outside
    const outsideElement = screen.getByTestId('outside')
    fireEvent.mouseDown(outsideElement)
    
    // Dropdown should be closed
    expect(screen.queryByText('言語を検出')).not.toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(
      <LanguageSelector
        selectedLanguage="Japanese"
        onLanguageChange={mockOnLanguageChange}
        languages={mockLanguages}
        label="翻訳元"
      />
    )
    
    const button = screen.getByText('日本語').closest('button')
    expect(button).toBeInTheDocument()
    
    const label = screen.getByText('翻訳元')
    expect(label.tagName).toBe('LABEL')
  })

  it('displays all languages in dropdown', async () => {
    const user = userEvent.setup()
    render(
      <LanguageSelector
        selectedLanguage="Japanese"
        onLanguageChange={mockOnLanguageChange}
        languages={mockLanguages}
        label="翻訳元"
      />
    )
    
    // Open dropdown - find the main button, not the dropdown option
    const allJapaneseElements = screen.getAllByText('日本語')
    const mainButton = allJapaneseElements[0].closest('button')
    await user.click(mainButton!)
    
    // Check all languages are present - use getAllByText for languages that might appear multiple times
    mockLanguages.forEach(lang => {
      const languageElements = screen.getAllByText(lang.name)
      expect(languageElements.length).toBeGreaterThan(0)
      const flagElements = screen.getAllByText(lang.flag)
      expect(flagElements.length).toBeGreaterThan(0)
    })
  })
})