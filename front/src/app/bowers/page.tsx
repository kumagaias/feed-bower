'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/contexts/AppContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTranslation } from '@/lib/i18n'
import { useBowers } from '@/hooks/useBowers'
import { bowerApi, feedApi } from '@/lib/api'
import Layout from '@/components/Layout'
import BowerCard from '@/components/BowerCard'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import LoadingAnimation from '@/components/LoadingAnimation'
import Toast from '@/components/Toast'
import BowerCreatorModal from '@/components/BowerCreatorModal'
import BowerEditModal from '@/components/BowerEditModal'
import { colors } from '@/styles/colors'

export default function BowersPage() {
  const { language } = useApp()
  const { user, isAuthenticated, isLoading } = useAuth()
  const t = useTranslation(language)
  const router = useRouter()
  const { bowers, loading, error, createBower, updateBower, deleteBower } = useBowers()

  // State management
  const [activeTab, setActiveTab] = useState<'my' | 'preset'>('my')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [bowerToDelete, setBowerToDelete] = useState<{ id: string; name: string } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreatorModal, setShowCreatorModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBower, setEditingBower] = useState<any>(null)
  const [addingPresetId, setAddingPresetId] = useState<string | null>(null)

  const itemsPerPage = 9 // 3x3 grid

  // Mock public bowers for demonstration
  const getMockPublicBowers = () => {
    const mockColors = ['#14b8a6', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8']
    
    return [
      {
        id: 'preset-1',
        name: language === 'ja' ? 'テクノロジーニュース' : 'Tech News',
        keywords: ['AI', 'Programming', 'Web Dev', 'Cloud', 'Security'],
        feeds: [],
        color: mockColors[0],
        createdAt: new Date('2024-09-15'),
        isPublic: true,
        creatorId: 'preset',
        creatorName: undefined,
        likes: 0,
        likedBy: [],
        eggColors: ['#14b8a6', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD'],
        isPreset: true
      },
      {
        id: 'preset-2',
        name: language === 'ja' ? 'デザイン＆UI' : 'Design & UI',
        keywords: ['Design', 'UI/UX', 'Figma', 'Typography', 'Color'],
        feeds: [],
        color: mockColors[1],
        createdAt: new Date('2024-09-20'),
        isPublic: true,
        creatorId: 'preset',
        creatorName: undefined,
        likes: 0,
        likedBy: [],
        eggColors: ['#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8'],
        isPreset: true
      },
      {
        id: 'preset-3',
        name: language === 'ja' ? 'スタートアップ情報' : 'Startup News',
        keywords: ['Startup', 'Business', 'Innovation', 'Funding', 'Growth'],
        feeds: [],
        color: mockColors[2],
        createdAt: new Date('2024-09-25'),
        isPublic: true,
        creatorId: 'preset',
        creatorName: undefined,
        likes: 0,
        likedBy: [],
        eggColors: ['#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8', '#F4A460'],
        isPreset: true
      },
      {
        id: 'preset-4',
        name: language === 'ja' ? 'データサイエンス' : 'Data Science',
        keywords: ['Data Science', 'Machine Learning', 'Python', 'Statistics', 'Analytics'],
        feeds: [],
        color: mockColors[3],
        createdAt: new Date('2024-09-30'),
        isPublic: true,
        creatorId: 'preset',
        creatorName: undefined,
        likes: 0,
        likedBy: [],
        eggColors: ['#96CEB4', '#DDA0DD', '#98D8C8', '#F4A460', '#14b8a6'],
        isPreset: true
      },
      {
        id: 'preset-5',
        name: language === 'ja' ? 'マーケティング' : 'Marketing',
        keywords: ['Marketing', 'SEO', 'Content', 'Social Media', 'Growth Hacking'],
        feeds: [],
        color: mockColors[4],
        createdAt: new Date('2024-10-05'),
        isPublic: true,
        creatorId: 'preset',
        creatorName: undefined,
        likes: 0,
        likedBy: [],
        eggColors: ['#DDA0DD', '#98D8C8', '#F4A460', '#14b8a6', '#4ECDC4'],
        isPreset: true
      }
    ]
  }

  // Handle create bower
  const handleCreateBower = async () => {
    setShowCreatorModal(true)
  }

  // Handle save bower from modal
  const handleSaveBower = async (bowerData: { 
    name: string
    keywords: string[]
    color: string
    auto_register_feeds?: boolean
    max_auto_feeds?: number
  }) => {
    setIsCreating(true)
    try {
      const result = await createBower({
        name: bowerData.name,
        keywords: bowerData.keywords,
        is_public: false,
        auto_register_feeds: bowerData.auto_register_feeds,
        max_auto_feeds: bowerData.max_auto_feeds
      })

      if (result) {
        // Show success message with auto-registration info
        let message = language === 'ja' ? 'バウアーを作成しました' : 'Bower created successfully'
        
        if (result.autoRegisteredFeeds > 0) {
          message += language === 'ja' 
            ? ` (${result.autoRegisteredFeeds}件のフィードを自動登録)` 
            : ` (${result.autoRegisteredFeeds} feeds auto-registered)`
        }
        
        setToast({
          message,
          type: 'success'
        })
        
        // Fetch articles for the newly created bower
        if (result.bower && result.autoRegisteredFeeds > 0) {
          try {
            await feedApi.fetchBowerFeeds(result.bower.id)
            console.log('✅ Articles fetched for bower:', result.bower.id)
          } catch (error) {
            console.error('Failed to fetch articles:', error)
            // Don't show error to user, this is a background operation
          }
        }
        
        // Show warnings if there were errors
        if (result.autoRegisterErrors.length > 0) {
          setTimeout(() => {
            setToast({
              message: language === 'ja' 
                ? `一部のフィードの登録に失敗しました (${result.autoRegisterErrors.length}件)` 
                : `Some feeds failed to register (${result.autoRegisterErrors.length})`,
              type: 'warning'
            })
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Failed to create bower:', error)
      setToast({
        message: language === 'ja' ? 'バウアーの作成に失敗しました' : 'Failed to create bower',
        type: 'error'
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Auto-add feeds for a bower based on keywords
  const autoAddFeedsForBower = async (bowerId: string, keywords: string[]): Promise<any[]> => {
    
    const keywordFeedMap: Record<string, string[]> = {
      // English keywords
      'ai': ['https://feeds.feedburner.com/oreilly/radar', 'https://ai.googleblog.com/feeds/posts/default'],
      'programming': ['https://dev.to/feed/tag/programming', 'https://stackoverflow.com/feeds'],
      'technology': ['https://techcrunch.com/feed/', 'https://www.wired.com/feed/'],
      'design': ['https://www.smashingmagazine.com/feed/', 'https://dribbble.com/shots/popular.rss'],
      'javascript': ['https://javascript.plainenglish.io/feed', 'https://dev.to/feed/tag/javascript'],
      'react': ['https://dev.to/feed/tag/react', 'https://reactjs.org/feed.xml'],
      'python': ['https://realpython.com/atom.xml', 'https://dev.to/feed/tag/python'],
      'webdev': ['https://css-tricks.com/feed/', 'https://dev.to/feed/tag/webdev'],
      'startup': ['https://techcrunch.com/startups/feed/', 'https://www.producthunt.com/feed'],
      'business': ['https://hbr.org/feed', 'https://www.entrepreneur.com/latest.rss'],
      
      // Japanese keywords
      'プログラミング': ['https://qiita.com/tags/programming/feed', 'https://zenn.dev/feed'],
      'テクノロジー': ['https://techcrunch.com/feed/', 'https://www.wired.com/feed/'],
      'デザイン': ['https://www.smashingmagazine.com/feed/', 'https://dribbble.com/shots/popular.rss'],
      'web開発': ['https://css-tricks.com/feed/', 'https://dev.to/feed/tag/webdev'],
      'スタートアップ': ['https://techcrunch.com/startups/feed/', 'https://www.producthunt.com/feed'],
      'ビジネス': ['https://hbr.org/feed', 'https://www.entrepreneur.com/latest.rss']
    }

    let successCount = 0
    let totalAttempts = 0
    const addedFeeds: any[] = []

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase()
      const feedUrls = keywordFeedMap[keyword] || keywordFeedMap[keywordLower] || []
      
      for (const url of feedUrls) {
        totalAttempts++
        try {
          const newFeed = await feedApi.addFeed({
            bower_id: bowerId,
            url: url,
            title: '',
            description: ''
          })
          addedFeeds.push(newFeed)
          successCount++
          
          // Limit to avoid too many feeds
          if (successCount >= 2) break
        } catch (error) {
          // Continue with other feeds even if one fails
        }
      }
      
      // Limit total auto-added feeds
      if (successCount >= 2) break
    }

    return addedFeeds
  }

  // Handle edit bower
  const handleEditBower = (bower: any) => {
    setEditingBower(bower)
    setShowEditModal(true)
  }

  // Handle save edited bower
  const handleSaveEditedBower = async (bowerData: { name: string; keywords: string[]; feeds: any[] }) => {
    if (!editingBower) return
    
    try {
      // Update bower using the hook (バックエンドが最新のフィードを含めて返す)
      const updatedBower = await updateBower(editingBower.id, {
        name: bowerData.name,
        keywords: bowerData.keywords,
        is_public: editingBower.is_public
      })

      setToast({
        message: language === 'ja' ? 'バウアーを更新しました' : 'Bower updated successfully',
        type: 'success'
      })

      // フィードが追加された場合、記事を取得（バックグラウンドで実行）
      if (updatedBower && bowerData.feeds.length > 0) {
        try {
          console.log("📡 Fetching articles for updated bower...");
          await feedApi.fetchBowerFeeds(editingBower.id);
          console.log("✅ Articles fetched successfully");
        } catch (fetchError) {
          console.error("⚠️ Failed to fetch articles:", fetchError);
          // エラーは無視（バックグラウンド処理のため）
        }
      }
    } catch (error) {
      console.error('Failed to update bower:', error)
      setToast({
        message: language === 'ja' ? 'バウアーの更新に失敗しました' : 'Failed to update bower',
        type: 'error'
      })
    }
  }

  // Handle delete bower
  const handleDeleteBower = (bower: any) => {
    setBowerToDelete({ id: bower.id, name: bower.name })
    setDeleteModalOpen(true)
  }

  // Confirm delete bower
  const confirmDeleteBower = async () => {
    if (!bowerToDelete) return

    const success = await deleteBower(bowerToDelete.id)
    if (success) {
      setToast({
        message: language === 'ja' ? 'バウアーを削除しました' : 'Bower deleted successfully',
        type: 'success'
      })
    } else {
      setToast({
        message: language === 'ja' ? 'バウアーの削除に失敗しました' : 'Failed to delete bower',
        type: 'error'
      })
    }

    setDeleteModalOpen(false)
    setBowerToDelete(null)
  }

  // Handle like bower (for public bowers) or save preset
  const handleLikeBower = async (bower: any, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // If it's a preset, save it as a new bower
    if (bower.isPreset) {
      // Prevent multiple clicks
      if (addingPresetId === bower.id) {
        return
      }
      
      setAddingPresetId(bower.id)
      
      try {
        const result = await createBower({
          name: bower.name,
          keywords: bower.keywords,
          is_public: false,
          auto_register_feeds: true,
          max_auto_feeds: 5
        })

        if (result) {
          setToast({
            message: language === 'ja' 
              ? `「${bower.name}」を保存しました` 
              : `Saved "${bower.name}"`,
            type: 'success'
          })
          
          // Switch to "my" tab to show the saved bower
          setActiveTab('my')
        }
      } catch (error) {
        console.error('Failed to save preset:', error)
        setToast({
          message: language === 'ja' ? 'プリセットの保存に失敗しました' : 'Failed to save preset',
          type: 'error'
        })
      } finally {
        setAddingPresetId(null)
      }
    } else {
      // For now, just show a toast for non-preset public bowers
      setToast({
        message: language === 'ja' ? 'いいね機能は開発中です' : 'Like feature is under development',
        type: 'warning'
      })
    }
  }

  // Redirect to home if not logged in
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <LoadingAnimation />
          </div>
        </div>
      </Layout>
    )
  }

  // Don't render if not logged in
  if (!isAuthenticated) {
    return null
  }

  // Show error state
  if (error && !loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-xl font-semibold text-red-600 mb-2">
                  {language === 'ja' ? 'エラーが発生しました' : 'An error occurred'}
                </h2>
                <p className="text-red-500 mb-6">
                  {error}
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors"
                >
                  {language === 'ja' ? '再読み込み' : 'Reload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  // Search bar component
  const searchBar = (
    <div className="relative w-full md:w-64">
      <div className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
        🔍
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={t.searchBowers}
        className="w-full pl-8 md:pl-10 pr-8 md:pr-4 py-2 md:py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors text-base"
        style={{ outline: 'none' }}
        onFocus={(e) => e.currentTarget.style.borderColor = '#14b8a6'}
        onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
        >
          ✕
        </button>
      )}
    </div>
  )

  // Filter bowers based on active tab and search query
  let filteredBowers = bowers
  const mockBowers = getMockPublicBowers()
  
  console.log('🔍 Filtering bowers:', {
    totalBowers: bowers.length,
    activeTab,
    userId: user?.id,
    bowerCreatorIds: bowers.map(b => b.creatorId)
  })
  
  // Tab filtering
  if (activeTab === 'my') {
    filteredBowers = bowers.filter(b => !b.creatorId || b.creatorId === user?.id)
    console.log('🔍 After "my" filter:', filteredBowers.length)
  } else if (activeTab === 'preset') {
    filteredBowers = mockBowers
  }
  
  // Search filtering
  if (searchQuery.trim()) {
    filteredBowers = filteredBowers.filter(b =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }
  
  // Pagination
  const totalPages = Math.ceil(filteredBowers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedBowers = filteredBowers.slice(startIndex, endIndex)

  return (
    <Layout searchBar={searchBar}>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="hidden md:block py-4">
            <h1 className="text-xl font-bold mb-2" style={{ color: colors.primary }}>
              {t.bowers}
            </h1>
            <p className="text-sm" style={{ color: colors.accent }}>
              {language === 'ja' 
                ? 'キーワードで鳥の巣を作り、AIが自動でフィードを発見します'
                : 'Create your nest with keywords and discover feeds automatically'
              }
            </p>
          </div>

          <div className="mb-6 md:hidden">
            <h1 className="text-xl font-bold" style={{ color: colors.primary }}>{t.bowers}</h1>
          </div>

          {/* Tabs - Centered */}
          <div className="mb-6 relative">
            <div className="absolute bottom-0 left-0 right-0 border-b-2 border-gray-200"></div>
            <div className="flex justify-center relative">
              <div className="inline-flex">
                <button
                  onClick={() => setActiveTab('my')}
                  className={`px-6 py-3 font-semibold transition-all text-base whitespace-nowrap ${
                    activeTab === 'my'
                      ? 'border-b-2 -mb-0.5'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={activeTab === 'my' ? { borderColor: '#14b8a6', color: '#14b8a6' } : {}}
                >
                  {t.myBowers}
                </button>
                <button
                  onClick={() => setActiveTab('preset')}
                  className={`px-6 py-3 font-semibold transition-all text-base whitespace-nowrap ${
                    activeTab === 'preset'
                      ? 'border-b-2 -mb-0.5'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={activeTab === 'preset' ? { borderColor: '#14b8a6', color: '#14b8a6' } : {}}
                >
                  {t.preset}
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white rounded-lg shadow-sm">
              <LoadingAnimation />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredBowers.length === 0 && activeTab === 'my' && !searchQuery && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🪺</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  {language === 'ja' ? 'バウアーがまだありません' : 'No bowers yet'}
                </h2>
                <p className="text-gray-500 mb-6">
                  {language === 'ja' 
                    ? '最初のバウアーを作成して、AIにフィードを見つけてもらいましょう'
                    : 'Create your first bower and let AI find feeds for you'
                  }
                </p>
                <button 
                  onClick={handleCreateBower}
                  disabled={isCreating}
                  className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  {isCreating ? '🐣' : (language === 'ja' ? '新しいバウアーを作成' : 'Create New Bower')}
                </button>
              </div>
            </div>
          )}

          {/* Search No Results */}
          {!loading && filteredBowers.length === 0 && searchQuery && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  {language === 'ja' ? '検索結果が見つかりません' : 'No search results'}
                </h2>
                <p className="text-gray-500 mb-6">
                  &quot;{searchQuery}&quot; {language === 'ja' ? 'に一致するバウアーはありません' : 'did not match any bowers'}
                </p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="bg-teal-500 text-white px-6 py-3 rounded-lg hover:bg-teal-600 transition-colors"
                >
                  {language === 'ja' ? '検索をクリア' : 'Clear Search'}
                </button>
              </div>
            </div>
          )}

          {/* Bowers Grid */}
          {!loading && paginatedBowers.length > 0 && (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedBowers.map((bower) => {
                  const isOwnBower = !bower.creatorId || bower.creatorId === user?.id
                  const isLiked = bower.likedBy?.includes(user?.id || '') || false
                  const isAdding = addingPresetId === bower.id
                  
                  return (
                    <BowerCard
                      key={bower.id}
                      bower={bower}
                      isOwnBower={isOwnBower}
                      isLiked={isLiked}
                      language={language}
                      onEdit={() => handleEditBower(bower)}
                      onDelete={() => handleDeleteBower(bower)}
                      onLike={(e) => handleLikeBower(bower, e)}
                      isAdding={isAdding}
                    />
                  )
                })}

                {/* Create Button Card for My Bowers - at the end */}
                {activeTab === 'my' && (
                  <div
                    onClick={handleCreateBower}
                    className="rounded-xl shadow-md hover:shadow-2xl transition-all cursor-pointer group overflow-hidden flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: '#f59e0b'
                    }}
                  >
                    <div 
                      className="text-6xl mb-3 group-hover:scale-110 transition-transform"
                      style={{ color: '#f59e0b' }}
                    >
                      {isCreating ? '🐣' : '+'}
                    </div>
                    <p 
                      className="text-lg font-semibold"
                      style={{ color: '#f59e0b' }}
                    >
                      {language === 'ja' ? '作成' : 'Create'}
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      {language === 'ja' ? '前' : 'Previous'}
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg border ${
                          currentPage === page
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      {language === 'ja' ? '次' : 'Next'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onConfirm={confirmDeleteBower}
        onCancel={() => {
          setDeleteModalOpen(false)
          setBowerToDelete(null)
        }}
        bowerName={bowerToDelete?.name || ''}
        language={language}
      />

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Bower Creator Modal */}
      <BowerCreatorModal
        isOpen={showCreatorModal}
        onClose={() => setShowCreatorModal(false)}
        onSave={handleSaveBower}
      />

      {/* Bower Edit Modal */}
      <BowerEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingBower(null)
        }}
        onSave={handleSaveEditedBower}
        bower={editingBower}
      />
    </Layout>
  )
}