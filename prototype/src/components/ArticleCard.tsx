'use client'

interface ArticleCardProps {
  article: {
    id: string
    title: string
    content: string
    url: string
    publishedAt: Date
    liked: boolean
    bower: string
    read: boolean
    image?: string
  }
  language: 'ja' | 'en'
  isPreviewMode: boolean
  onArticleClick: (id: string, url: string) => void
  onToggleRead: (id: string) => void
  onLike: (id: string) => void
  t: {
    readMore: string
    like: string
    unlike: string
  }
}

export default function ArticleCard({
  article,
  language,
  isPreviewMode,
  onArticleClick,
  onToggleRead,
  onLike,
  t
}: ArticleCardProps) {
  return (
    <article
      className="rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer relative group overflow-hidden"
      style={{ 
        backgroundColor: '#FFFFFF',
        opacity: article.read ? 0.7 : 1
      }}
      onClick={() => onArticleClick(article.id, article.url)}
    >
      {/* Read Badge - Clickable to toggle (hidden in preview mode) */}
      {!isPreviewMode && article.read && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleRead(article.id);
          }}
          className="absolute top-2 right-2 z-10 transition-all hover:scale-105"
          title={language === "ja" ? "チェックを外す" : "Uncheck"}
        >
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 shadow-sm hover:bg-gray-200">
            {language === "ja" ? "チェック済 ✕" : "Checked ✕"}
          </span>
        </button>
      )}

      <div className="p-4">
        <div className="flex gap-4">
          {/* Article Image - Left Side */}
          {article.image && (
            <div className="flex-shrink-0">
              <img 
                src={article.image} 
                alt={article.title}
                className="w-32 h-24 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* Article Content - Right Side */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ 
                backgroundColor: '#14b8a620',
                color: '#14b8a6'
              }}>
                🪺 {article.bower}
              </span>
              <span className="text-xs text-gray-500">
                {article.publishedAt.toLocaleDateString(
                  language === "ja" ? "ja-JP" : "en-US",
                  { month: 'short', day: 'numeric' }
                )}
              </span>
            </div>
            <h2 className={`text-base font-semibold mb-1 line-clamp-2 ${article.read ? 'text-gray-500' : 'text-gray-800'}`}>
              {article.title}
            </h2>
            <p className="text-sm text-gray-600 line-clamp-2">
              {article.content}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-medium transition-colors" style={{ color: 'var(--color-primary)' }}>
            {t.readMore} →
          </span>

          {/* Like button (hidden in preview mode) */}
          {!isPreviewMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(article.id);
              }}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors relative z-10 text-sm ${
                article.liked
                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>{article.liked ? "❤️" : "🤍"}</span>
              <span>{article.liked ? t.unlike : t.like}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
