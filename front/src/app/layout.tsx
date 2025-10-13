import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Feed Bower',
  description: 'AI-powered RSS feed management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[var(--color-background-main)] min-h-screen">
        {children}
      </body>
    </html>
  )
}