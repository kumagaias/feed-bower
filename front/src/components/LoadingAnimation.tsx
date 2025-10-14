'use client'

export default function LoadingAnimation() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-bounce text-4xl mb-4">🐣</div>
        <p className="text-gray-600">読み込み中...</p>
      </div>
    </div>
  )
}