'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import { colors } from '@/styles/colors'

export default function Breadcrumb() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language, bowers } = useApp()

  const truncateName = (name: string, maxLength: number = 20) => {
    if (name.length <= maxLength) return name
    return name.substring(0, maxLength) + '...'
  }

  const getBreadcrumbs = () => {
    const crumbs: Array<{ label: string; path?: string }> = []

    if (pathname.startsWith('/feeds')) {
      crumbs.push({
        label: language === 'ja' ? 'フィード' : 'Feeds',
        path: '/feeds'
      })
    } else if (pathname.startsWith('/bowers')) {
      crumbs.push({
        label: language === 'ja' ? 'バウアー' : 'Bowers',
        path: '/bowers'
      })

      if (pathname === '/bowers/new') {
        crumbs.push({
          label: language === 'ja' ? '作成' : 'Create'
        })
      } else if (pathname.startsWith('/bowers/preview')) {
        crumbs.push({
          label: language === 'ja' ? 'プレビュー' : 'Preview'
        })
      } else if (pathname.startsWith('/bowers/edit')) {
        const bowerId = searchParams.get('id')
        const bower = bowers.find(b => b.id === bowerId)
        if (bower) {
          crumbs.push({
            label: truncateName(bower.name),
            path: `/bowers/edit?id=${bowerId}`
          })
        }
        crumbs.push({
          label: language === 'ja' ? '編集' : 'Edit'
        })
      }
    } else if (pathname.startsWith('/liked')) {
      crumbs.push({
        label: language === 'ja' ? 'いいね' : 'Liked',
        path: '/liked'
      })
    }

    return crumbs
  }

  const breadcrumbs = getBreadcrumbs()

  if (breadcrumbs.length === 0) return null

  return (
    <nav className="flex items-center space-x-2">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center space-x-2">
          {index > 0 && (
            <span className="text-sm" style={{ color: colors.background.main, opacity: 0.5 }}>&gt;</span>
          )}
          {crumb.path ? (
            <button
              onClick={() => router.push(crumb.path!)}
              className="hover:opacity-80 transition-opacity"
            >
              <span 
                className="text-sm font-medium"
                style={{ color: colors.background.main }}
              >
                {crumb.label}
              </span>
            </button>
          ) : (
            <span 
              className="text-sm font-medium"
              style={{ color: colors.background.main }}
            >
              {crumb.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
