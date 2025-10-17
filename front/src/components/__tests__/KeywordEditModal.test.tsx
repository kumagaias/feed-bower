import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KeywordEditModal from '../KeywordEditModal'

// Mock the app context
const mockUseApp = {
  language: 'ja' as const,
  user: null,
  setLanguage: jest.fn(),
  setUser: jest.fn(),
}

jest.mock('@/contexts/AppContext', () => ({
  useApp: () => mockUseApp
}))

// Mock the colors module
jest.mock('@/lib/colors', () => ({
  KEYWORD_COLORS: ['#14b8a6', '#4ECDC4', '#45B7D1'],
  getKeywordColor: (keyword: string) => '#14b8a6'
}))

describe('KeywordEditModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSave = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when closed', () => {
    render(
      <KeywordEditModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    expect(screen.queryByText('キーワード編集')).not.toBeInTheDocument()
  })

  it('should render when open', () => {
    render(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('キーワード編集')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/AI、プログラミング、デザイン/)).toBeInTheDocument()
  })

  it('should display initial keywords', () => {
    render(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialKeywords={['AI', 'プログラミング']}
      />
    )

    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('プログラミング')).toBeInTheDocument()
  })

  it('should add keywords from input', async () => {
    const user = userEvent.setup()
    
    render(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const input = screen.getByPlaceholderText(/AI、プログラミング、デザイン/)
    await user.type(input, 'AI, プログラミング')
    await user.click(screen.getByText('>'))

    // Keywords should appear in the nest area
    await waitFor(() => {
      expect(screen.getByText('AI')).toBeInTheDocument()
      expect(screen.getByText('プログラミング')).toBeInTheDocument()
    })
  })

  it('should add keywords by pressing Enter', async () => {
    const user = userEvent.setup()
    
    render(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const input = screen.getByPlaceholderText(/AI、プログラミング、デザイン/)
    await user.type(input, 'テスト')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByText('テスト')).toBeInTheDocument()
    })
  })

  it('should validate keyword length', async () => {
    const user = userEvent.setup()
    
    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    
    render(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const input = screen.getByPlaceholderText(/AI、プログラミング、デザイン/)
    const longKeyword = 'a'.repeat(21) // 21 characters, over the limit
    await user.type(input, longKeyword)
    await user.click(screen.getByText('>'))

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('20文字以内で入力してください')
    )

    alertSpy.mockRestore()
  })

  it('should call onSave with selected keywords', async () => {
    const user = userEvent.setup()
    
    render(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialKeywords={['AI']}
      />
    )

    await user.click(screen.getByText('保存'))

    expect(mockOnSave).toHaveBeenCalledWith(['AI'])
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    await user.click(screen.getByText('✕'))

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should remove keywords when clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialKeywords={['AI', 'プログラミング']}
      />
    )

    // Click on the AI keyword to remove it
    const aiKeyword = screen.getByText('AI')
    await user.click(aiKeyword)

    // AI should be removed and moved back to floating keywords
    await waitFor(() => {
      // The keyword should still exist but in a different location (floating)
      expect(screen.getAllByText('AI')).toHaveLength(1)
    })
  })

  it('should reset when modal closes', () => {
    const { rerender } = render(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialKeywords={['AI']}
      />
    )

    expect(screen.getByText('AI')).toBeInTheDocument()

    rerender(
      <KeywordEditModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialKeywords={['AI']}
      />
    )

    rerender(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialKeywords={['プログラミング']}
      />
    )

    expect(screen.getByText('プログラミング')).toBeInTheDocument()
  })
})