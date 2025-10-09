'use client'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  bowerName: string
  language: 'en' | 'ja'
}

export default function DeleteConfirmModal({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  bowerName,
  language 
}: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 animate-fade-in"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
        {/* Icon */}
        <div className="pt-8 pb-4 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-6 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            {language === 'ja' ? 'バウアーを削除しますか？' : 'Delete Bower?'}
          </h3>
          <p className="text-gray-600 mb-2">
            <span className="font-semibold text-gray-800">"{bowerName}"</span>
          </p>
          <p className="text-gray-500 text-sm">
            {language === 'ja' 
              ? 'この操作は取り消せません。関連するフィードもすべて削除されます。'
              : 'This action cannot be undone. All associated feeds will also be deleted.'
            }
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-8 pb-8">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {language === 'ja' ? 'キャンセル' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-lg font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
          >
            {language === 'ja' ? '削除' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
