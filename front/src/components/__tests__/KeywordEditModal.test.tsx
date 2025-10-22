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

  it('should display initial keywords', async () => {
    render(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialKeywords={['AI', 'プログラミング']}
      />
    )

    await waitFor(() => {
      // Check if eggs are rendered as SVG elements with title attributes
      expect(screen.getByTitle('AI')).toBeInTheDocument()
      expect(screen.getByTitle('プログラミング')).toBeInTheDocument()
    })
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

    // Keywords should appear in the selected keywords display (with ✕)
    await waitFor(() => {
      expect(screen.getByText(/AI ✕/)).toBeInTheDocument()
      expect(screen.getByText(/プログラミング ✕/)).toBeInTheDocument()
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
      expect(screen.getByText(/テスト ✕/)).toBeInTheDocument()
    })
  })

  it('should validate keyword length', async () => {
    const user = userEvent.setup()
    
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

    // Toast should be displayed instead of alert
    await waitFor(() => {
      expect(screen.getByText(/20文字以内で入力してください/)).toBeInTheDocument()
    })
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

    // Click on the AI keyword to remove it (click on the selected keyword with ✕)
    await waitFor(() => {
      const aiKeyword = screen.getByText(/AI ✕/)
      expect(aiKeyword).toBeInTheDocument()
    })
    
    const aiKeyword = screen.getByText(/AI ✕/)
    await user.click(aiKeyword)

    // AI should be removed from selected keywords
    await waitFor(() => {
      // The keyword with ✕ should no longer exist
      expect(screen.queryByText(/AI ✕/)).not.toBeInTheDocument()
    })
  })

  it('should reset when modal closes', async () => {
    const { rerender } = render(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialKeywords={['AI']}
      />
    )

    // Check initial keyword is displayed as egg (with title attribute)
    await waitFor(() => {
      expect(screen.getByTitle('AI')).toBeInTheDocument()
    })

    // Close modal
    rerender(
      <KeywordEditModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialKeywords={['AI']}
      />
    )

    // Reopen with different keyword
    rerender(
      <KeywordEditModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialKeywords={['プログラミング']}
      />
    )

    // Check new keyword is displayed
    await waitFor(() => {
      expect(screen.getByTitle('プログラミング')).toBeInTheDocument()
    })
  })
})