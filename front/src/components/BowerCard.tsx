'use client'

import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import BowerIcon from './BowerIcon'
import { colors } from '@/styles/colors'

interface BowerCardProps {
  bower: any
  isOwnBower: boolean
  isLiked: boolean
  language: 'ja' | 'en'
  onEdit: () => void
  onDelete: () => void
  onLike: (e: React.MouseEvent) => void
}

export default function BowerCard({
  bower,
  isOwnBower,
  isLiked,
  language,
  onEdit,
  onDelete,
  onLike
}: BowerCardProps) {
  const router = useRouter()
  const t = useTranslation(language)

  const eggColors = ['#14b8a6', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8', '#F4A460']

  return (
    <div
      onClick={() => {
        router.push(`/feeds?bower=${encodeURIComponent(bower.name)}`)
      }}
      className="rounded-xl shadow-md hover:shadow-2xl transition-all relative cursor-pointer group overflow-hidden"
      style={{ 
        backgroundColor: '#FFFFFF',
        borderTop: `6px solid ${bower.color}`
      }}
    >
      {/* Gradient overlay on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${bower.color} 0%, transparent 100%)` }}
      />

      {/* Action Buttons - Only show for own bowers */}
      {isOwnBower && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {/* Edit Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="transition-all p-2 bg-white rounded-lg shadow-sm hover:shadow-md"
            style={{ color: colors.primary }}
            onMouseEnter={(e) => e.currentTarget.style.color = colors.secondary}
            onMouseLeave={(e) => e.currentTarget.style.color = colors.primary}
            title={t.edit}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="transition-all p-2 bg-white rounded-lg shadow-sm hover:shadow-md"
            style={{ color: '#ef4444' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#ef4444'}
            title={t.delete}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Public/Private Badge */}
      <div className="absolute top-2 left-2 z-10">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
          bower.isPublic 
            ? 'bg-green-100 text-green-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {bower.isPublic ? t.public : t.private}
        </span>
      </div>

      <div className="p-6 relative flex flex-col" style={{ minHeight: '380px' }}>
        <div className="text-center mb-4">
          <div className="flex justify-center mb-3 transform group-hover:scale-110 transition-transform">
            <BowerIcon bower={bower} size="lg" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-1 line-clamp-2" style={{ minHeight: '3.5rem' }}>
            {bower.name.length > 40 ? bower.name.substring(0, 40) + '...' : bower.name}
          </h3>
          {bower.creatorName && (
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <span>👤</span>
              <span>{bower.creatorName}</span>
            </p>
          )}
        </div>
        
        <div className="mb-4 relative">
          <div className="flex flex-wrap gap-2 justify-center items-start content-start" style={{ minHeight: '6rem', maxHeight: '6rem', overflow: 'hidden' }}>
            {(bower.keywords || []).slice(0, 8).map((keyword: string, index: number) => {
              const keywordColor = bower.eggColors?.[index] || eggColors[index % eggColors.length];
              return (
              <span
                key={index}
                className="inline-block flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium shadow-sm whitespace-nowrap"
                style={{ 
                  backgroundColor: `${keywordColor}20`,
                  color: keywordColor,
                  border: `1px solid ${keywordColor}40`
                }}
              >
                {keyword}
              </span>
              );
            })}
            {(bower.keywords || []).length > 8 && (
              <span className="inline-block flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium text-gray-600 whitespace-nowrap" style={{ backgroundColor: 'var(--color-background-main)', border: '1px solid var(--color-tertiary)' }}>
                +{bower.keywords.length - 8}
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-auto">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-1">
              <span>❤️</span>
              <span className="font-medium">{Math.max(1, bower.likes || 0)}</span>
            </div>
            <div className="text-xs">
              {bower.createdAt ? new Date(bower.createdAt).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' }) : ''}
            </div>
          </div>

          {!isOwnBower && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onLike(e)
              }}
              className={`w-full py-2.5 rounded-lg transition-all font-medium text-sm shadow-sm hover:shadow-md ${
                isLiked
                  ? 'bg-teal-500 text-white'
                  : 'bg-white border-2 border-teal-500 text-teal-600 hover:bg-teal-50'
              }`}
            >
              <span className="text-lg">{isLiked ? '✓' : '+'}</span>
              <span>{isLiked ? t.added : t.add}</span>
            </button>
          )}

          {isOwnBower && (
            <div className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600">
              <span>⭐</span>
              <span>{bower.likes || 0} {t.likes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}