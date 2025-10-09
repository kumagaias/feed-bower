// Color palette for the application
export const colors = {
  primary: '#14b8a6',      // Bright teal
  secondary: '#0f766e',    // Dark teal
  accent: '#f59e0b',       // Amber
  tertiary: '#505050',     // Dark gray (for borders and dividers)
  tertiaryHover: '#707070', // Medium gray
  text: {
    primary: '#14b8a6',
    secondary: '#0f766e',
    muted: '#666666',
  },
  background: {
    main: '#f0fdf4',       // Very light green background
    card: '#FFFFFF',
  },
  button: {
    text: '#FFFFFF',       // White text for buttons
    textDark: '#333333',   // Dark text for light backgrounds
  }
} as const

export type ColorPalette = typeof colors
