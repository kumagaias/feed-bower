'use client'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  bowerName: string
  language: 'ja' | 'en'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">
          {language === 'ja' ? 'バウアーを削除' : 'Delete Bower'}
        </h3>
        <p className="text-gray-600 mb-6">
          {language === 'ja' 
            ? `「${bowerName}」を削除してもよろしいですか？この操作は取り消せません。`
            : `Are you sure you want to delete "${bowerName}"? This action cannot be undone.`
          }
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            {language === 'ja' ? 'キャンセル' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            {language === 'ja' ? '削除' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}