'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'
import { useBowers } from '@/hooks/useBowers'
import Layout from '@/components/Layout'
import Toast from '@/components/Toast'
import { colors } from '@/styles/colors'

export default function NewBowerPage() {
  const { language, user } = useApp()
  const t = useTranslation(language)
  const router = useRouter()
  const { createBower } = useBowers()

  const [name, setName] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  const MAX_KEYWORDS = 8

  // Add keyword
  const addKeyword = () => {
    const trimmedKeyword = keywordInput.trim()
    if (trimmedKeyword && !keywords.includes(trimmedKeyword) && keywords.length < MAX_KEYWORDS) {
      setKeywords([...keywords, trimmedKeyword])
      setKeywordInput('')
    }
  }

  // Remove keyword
  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setToast({
        message: language === 'ja' ? 'バウアー名を入力してください' : 'Please enter a bower name',
        type: 'error'
      })
      return
    }

    if (keywords.length === 0) {
      setToast({
        message: language === 'ja' ? '少なくとも1つのキーワードを追加してください' : 'Please add at least one keyword',
        type: 'error'
      })
      return
    }

    setIsCreating(true)
    
    const bower = await createBower({
      name: name.trim(),
      keywords,
      is_public: isPublic
    })

    if (bower) {
      setToast({
        message: language === 'ja' ? 'バウアーを作成しました' : 'Bower created successfully',
        type: 'success'
      })
      
      // Redirect to bowers page after a short delay
      setTimeout(() => {
        router.push('/bowers')
      }, 1500)
    } else {
      setToast({
        message: language === 'ja' ? 'バウアーの作成に失敗しました' : 'Failed to create bower',
        type: 'error'
      })
      setIsCreating(false)
    }
  }

  // Handle keyword input key press
  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  const eggColors = ['#14b8a6', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8', '#F4A460']

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {language === 'ja' ? '戻る' : 'Back'}
            </button>
            
            <h1 className="text-2xl font-bold" style={{ color: colors.primary }}>
              {language === 'ja' ? '新しいバウアーを作成' : 'Create New Bower'}
            </h1>
            <p className="text-gray-600 mt-2">
              {language === 'ja' 
                ? 'キーワードを追加して、AIにフィードを見つけてもらいましょう'
                : 'Add keywords and let AI find feeds for you'
              }
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bower Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ja' ? 'バウアー名' : 'Bower Name'} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'ja' ? 'テクノロジーニュース' : 'Tech News'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {name.length}/50 {language === 'ja' ? '文字' : 'characters'}
                </p>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ja' ? 'キーワード' : 'Keywords'} * ({keywords.length}/{MAX_KEYWORDS})
                </label>
                
                {/* Keyword Input */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={handleKeywordKeyPress}
                    placeholder={language === 'ja' ? 'AI, プログラミング, デザイン...' : 'AI, Programming, Design...'}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    maxLength={20}
                    disabled={keywords.length >= MAX_KEYWORDS}
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    disabled={!keywordInput.trim() || keywords.length >= MAX_KEYWORDS || keywords.includes(keywordInput.trim())}
                    className="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {language === 'ja' ? '追加' : 'Add'}
                  </button>
                </div>

                {/* Keywords Display */}
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
                    {keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium shadow-sm"
                        style={{ 
                          backgroundColor: `${eggColors[index % eggColors.length]}20`,
                          color: eggColors[index % eggColors.length],
                          border: `1px solid ${eggColors[index % eggColors.length]}40`
                        }}
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(index)}
                          className="hover:opacity-75 transition-opacity"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  {language === 'ja' 
                    ? 'Enterキーまたは追加ボタンでキーワードを追加できます'
                    : 'Press Enter or click Add to add keywords'
                  }
                </p>
              </div>

              {/* Public/Private Toggle */}
              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      {language === 'ja' ? '公開バウアー' : 'Public Bower'}
                    </span>
                    <p className="text-xs text-gray-500">
                      {language === 'ja' 
                        ? '他のユーザーがこのバウアーを見つけて使用できます'
                        : 'Other users can discover and use this bower'
                      }
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isCreating}
                >
                  {language === 'ja' ? 'キャンセル' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || keywords.length === 0 || isCreating}
                  className="flex-1 px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <span className="animate-spin">🐣</span>
                      {language === 'ja' ? '作成中...' : 'Creating...'}
                    </>
                  ) : (
                    language === 'ja' ? 'バウアーを作成' : 'Create Bower'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  )
}