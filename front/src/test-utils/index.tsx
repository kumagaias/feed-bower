import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Mock App Context Provider for testing
const MockAppProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: MockAppProvider, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }