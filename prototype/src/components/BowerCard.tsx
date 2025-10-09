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
          <BowerIcon eggColors={bower.eggColors || []} size={80} />
        </div>

        <h3 className="text-xl font-bold mb-3 text-center text-gray-800 line-clamp-2" style={{ minHeight: '3.5rem' }}>
          {bower.name}
        </h3>

        <div className="flex flex-wrap gap-2 justify-center mb-4 flex-1">
          {bower.keywords.slice(0, 5).map((keyword: string, idx: number) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-full text-xs font-medium shadow-sm"
              style={{ 
                backgroundColor: `${bower.color}20`,
                color: bower.color,
                border: `1px solid ${bower.color}40`
              }}
            >
              {keyword}
            </span>
          ))}
          {bower.keywords.length > 5 && (
            <span className="px-3 py-1 rounded-full text-xs font-medium text-gray-500">
              +{bower.keywords.length - 5}
            </span>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-1">
              <span>👤</span>
              <span className="truncate max-w-[120px]">{bower.creatorName || 'Anonymous'}</span>
            </div>
            <div className="text-xs">
              {bower.createdAt.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' })}
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
              <span>{bower.likes} {t.likes}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
