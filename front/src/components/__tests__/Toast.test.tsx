import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toast from '../Toast'

// Mock the colors module - no need to mock since we created the actual file

describe('Toast', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('should render success toast with primary color', () => {
    render(
      <Toast
        message="Success message"
        type="success"
        onClose={mockOnClose}
      />
    )

    const toast = screen.getByText('Success message')
    expect(toast).toBeInTheDocument()
    
    // Check if the toast has the correct styling
    const toastContainer = toast.closest('div')
    expect(toastContainer).toHaveStyle({ backgroundColor: '#14b8a6' })
  })

  it('should render error toast with red color', () => {
    render(
      <Toast
        message="Error message"
        type="error"
        onClose={mockOnClose}
      />
    )

    const toast = screen.getByText('Error message')
    expect(toast).toBeInTheDocument()
    
    const toastContainer = toast.closest('div')
    expect(toastContainer).toHaveStyle({ backgroundColor: '#ef4444' })
  })

  it('should render warning toast with yellow color', () => {
    render(
      <Toast
        message="Warning message"
        type="warning"
        onClose={mockOnClose}
      />
    )

    const toast = screen.getByText('Warning message')
    expect(toast).toBeInTheDocument()
    
    const toastContainer = toast.closest('div')
    expect(toastContainer).toHaveStyle({ backgroundColor: '#f59e0b' })
  })

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    
    render(
      <Toast
        message="Test message"
        type="success"
        onClose={mockOnClose}
      />
    )

    const closeButton = screen.getByRole('button')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should auto-close after 3 seconds', async () => {
    render(
      <Toast
        message="Test message"
        type="success"
        onClose={mockOnClose}
      />
    )

    expect(mockOnClose).not.toHaveBeenCalled()

    // Fast-forward time by 3 seconds
    jest.advanceTimersByTime(3000)

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('should be positioned at top center', () => {
    render(
      <Toast
        message="Test message"
        type="success"
        onClose={mockOnClose}
      />
    )

    const toastWrapper = screen.getByText('Test message').closest('.fixed')
    expect(toastWrapper).toHaveClass('top-4', 'left-1/2', 'transform', '-translate-x-1/2')
  })
})