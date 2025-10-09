'use client'

import { useState } from 'react'
import { colors } from '@/styles/colors'

interface BowerNameModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string, isPublic: boolean) => void
  language: 'ja' | 'en'
  suggestedName: string
  editMode?: boolean
  initialIsPublic?: boolean
}

export default function BowerNameModal({ isOpen, onClose, onSubmit, language, suggestedName, editMode = false, initialIsPublic = false }: BowerNameModalProps) {
  const [bowerName, setBowerName] = useState(suggestedName)
  const [isPublic, setIsPublic] = useState(initialIsPublic)

  if (!isOpen) return null

  const handleSubmit = () => {
    if (bowerName.trim()) {
      onSubmit(bowerName.trim(), isPublic)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-slide-down">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          {editMode 
            ? (language === 'ja' ? 'バウアー名を編集' : 'Edit Bower Name')
            : (language === 'ja' ? 'バウアー名を入力' : 'Enter Bower Name')
          }
        </h2>
        
        <div className="mb-4">
          <input
            type="text"
            value={bowerName}
            onChange={(e) => setBowerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit()
              }
            }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:border-transparent text-lg"
            style={{ focusRing: colors.accent }}
            onFocus={(e) => e.currentTarget.style.borderColor = colors.tertiary}
            placeholder={language === 'ja' ? 'マイフィード' : 'My Feed'}
            autoFocus
          />
        </div>

        {/* Public/Private Toggle */}
        <div className="mb-6 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-800">
              {language === 'ja' ? '公開設定' : 'Visibility'}
            </p>
            <p className="text-sm text-gray-600">
              {isPublic 
                ? (language === 'ja' ? '他のユーザーが閲覧できます' : 'Others can view this bower')
                : (language === 'ja' ? '自分だけが閲覧できます' : 'Only you can view this bower')
              }
            </p>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              isPublic ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isPublic ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            {language === 'ja' ? 'キャンセル' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!bowerName.trim()}
            className="flex-1 px-4 py-2 rounded-lg transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
            style={{ backgroundColor: colors.accent, color: colors.button.text }}
            onMouseEnter={(e) => {
              if (bowerName.trim()) e.currentTarget.style.backgroundColor = colors.secondary
            }}
            onMouseLeave={(e) => {
              if (bowerName.trim()) e.currentTarget.style.backgroundColor = colors.accent
            }}
          >
            {editMode 
              ? (language === 'ja' ? '更新' : 'Update')
              : (language === 'ja' ? '作成' : 'Create')
            }
          </button>
        </div>
      </div>
    </div>
  )
}
