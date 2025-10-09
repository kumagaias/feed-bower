import type { Metadata } from 'next'
import { AppProvider } from '@/contexts/AppContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'Feed Bower - AIが見つける、あなただけのフィード体験',
  description: 'キーワードや短い文章から、AIが最適なフィードを見つけます。鳥の巣のように情報を整理して、あなたの興味を育てましょう。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}