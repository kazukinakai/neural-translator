import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SettingsButton from '../SettingsButton'

describe('SettingsButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Clean up DOM
    document.body.innerHTML = ''
  })
  it('renders settings button with correct icon', () => {
    const mockOnSettingsClick = vi.fn()
    render(<SettingsButton onSettingsClick={mockOnSettingsClick} />)
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    
    // Check if Remix icon class is present
    const icon = button.querySelector('.ri-settings-3-line')
    expect(icon).toBeInTheDocument()
  })

  it('calls onSettingsClick when button is clicked', () => {
    const mockOnSettingsClick = vi.fn()
    render(<SettingsButton onSettingsClick={mockOnSettingsClick} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockOnSettingsClick).toHaveBeenCalledTimes(1)
  })

  it('has correct CSS classes for styling', () => {
    const mockOnSettingsClick = vi.fn()
    render(<SettingsButton onSettingsClick={mockOnSettingsClick} />)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass(
      'p-2',
      'rounded-full',
      'hover:bg-gray-100',
      'transition-colors',
      'duration-200',
      'cursor-pointer'
    )
  })

  it('has proper accessibility attributes', () => {
    const mockOnSettingsClick = vi.fn()
    render(<SettingsButton onSettingsClick={mockOnSettingsClick} />)
    
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })
})