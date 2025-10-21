'use client'

import { useApp } from '@/contexts/AppContext'

interface AutoRegisterResultModalProps {
  isOpen: boolean
  onClose: () => void
  result: {
    addedFeeds: Array<{
      feed_id: string
      url: string
      title: string
      description: string
    }>
    skippedFeeds: string[]
    failedFeeds: Array<{
      url: string
      reason: string
    }>
    summary: {
      total_added: number
      total_skipped: number
      total_failed: number
    }
  } | null
}

export default function AutoRegisterResultModal({ 
  isOpen, 
  onClose, 
  result 
}: AutoRegisterResultModalProps) {
  const { language } = useApp()

  if (!isOpen || !result) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-teal-50">
          <div className="flex items-center gap-2">
            <div className="text-2xl">🤖</div>
            <h2 className="text-xl font-bold text-gray-800">
              {language === 'ja' ? 'フィード自動登録結果' : 'Auto-Registration Results'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Summary */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
              <div className="text-3xl font-bold text-green-600">
                {result.summary.total_added}
              </div>
              <div className="text-sm text-green-700 mt-1">
                {language === 'ja' ? '追加成功' : 'Added'}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
              <div className="text-3xl font-bold text-yellow-600">
                {result.summary.total_skipped}
              </div>
              <div className="text-sm text-yellow-700 mt-1">
                {language === 'ja' ? 'スキップ' : 'Skipped'}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
              <div className="text-3xl font-bold text-red-600">
                {result.summary.total_failed}
              </div>
              <div className="text-sm text-red-700 mt-1">
                {language === 'ja' ? '失敗' : 'Failed'}
              </div>
            </div>
          </div>

          {/* Added Feeds */}
          {result.addedFeeds.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-green-600">✓</span>
                {language === 'ja' ? '追加されたフィード' : 'Added Feeds'}
              </h3>
              <div className="space-y-2">
                {result.addedFeeds.map((feed, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="font-medium text-gray-800">{feed.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{feed.description}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{feed.url}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skipped Feeds */}
          {result.skippedFeeds.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-yellow-600">⊘</span>
                {language === 'ja' ? 'スキップされたフィード (重複)' : 'Skipped Feeds (Duplicates)'}
              </h3>
              <div className="space-y-2">
                {result.skippedFeeds.map((url, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                  >
                    <div className="text-sm text-gray-700 truncate">{url}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Feeds */}
          {result.failedFeeds.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-red-600">✕</span>
                {language === 'ja' ? '失敗したフィード' : 'Failed Feeds'}
              </h3>
              <div className="space-y-2">
                {result.failedFeeds.map((feed, index) => (
                  <div 
                    key={index} 
                    className="p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="text-sm text-gray-700 truncate">{feed.url}</div>
                    <div className="text-xs text-red-600 mt-1">{feed.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-[#14b8a6] text-white rounded-lg hover:bg-[#0f766e] transition-colors"
            >
              {language === 'ja' ? '閉じる' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
