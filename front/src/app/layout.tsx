import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppProvider } from '@/contexts/AppContext'
import { AuthProvider } from '@/contexts/AuthContext'
import AuthGuard from '@/components/AuthGuard'
import NestBackground from '@/components/NestBackground'

export const metadata: Metadata = {
  title: 'Feed Bower',
  description: 'AI-powered RSS feed management - Organize your feeds like a bird\'s nest',
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#003333',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[var(--color-background-main)] min-h-screen relative">
        <AuthProvider>
          <AppProvider>
            <AuthGuard>
              <NestBackground />
              <div className="relative z-10">
                {children}
              </div>
            </AuthGuard>
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  )
}