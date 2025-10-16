'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function AuthErrorMessage() {
  const { error, clearError } = useAuth()

  if (!error) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="text-red-400 text-xl">⚠️</div>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              認証エラー
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
            <div className="mt-3">
              <button
                onClick={clearError}
                className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              <span className="sr-only">閉じる</span>
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}