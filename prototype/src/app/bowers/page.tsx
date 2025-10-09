'use client'

import { useEffect, useState, useRef } from 'react'
import { useApp } from '@/contexts/AppContext'
import { useTranslation } from '@/lib/i18n'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import DeleteConfirmModal from '@/components/DeleteConfirmModal'
import BowerCard from '@/components/BowerCard'
import BowerIcon from '@/components/BowerIcon'
import NestSVG from '@/components/NestSVG'
import EggSVG from '@/components/EggSVG'
import BirdSVG from '@/components/BirdSVG'
import BalloonSVG from '@/components/BalloonSVG'
import { colors } from '@/styles/colors'
import { useBowers } from '@/hooks/useBowers'

export default function BowersPage() {
  const { language, bowers, setBowers, user } = useApp()
  const t = useTranslation(language)
  const router = useRouter()
  
  // Check URL parameter to open create modal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('create') === 'true') {
        // Create a new bower and open in edit mode
        const newBower = {
          id: `bower-${Date.now()}`,
          name: language === 'ja' ? '新しいバウアー' : 'New Bower',
          keywords: [],
          eggColors: [],
          feeds: [],
          color: eggColors[Math.floor(Math.random() * eggColors.length)],
          createdAt: new Date(),
          isPublic: false,
          creatorId: user?.id,
          creatorName: user?.name,
          likes: 0,
          likedBy: []
        };
        
        setBowerToPreview(newBower);
        setEditedName(newBower.name);
        setBowerFeeds([]);
        setPreviewModalOpen(true);
        setEditingEggs([]);
        setIsEditingKeywords(false);
        
        // Remove parameter from URL
        window.history.replaceState({}, '', '/bowers')
      }
    }
  }, [])


  const [activeTab, setActiveTab] = useState<'my' | 'preset'>('my')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [bowerToDelete, setBowerToDelete] = useState<string | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [bowerToEdit, setBowerToEdit] = useState<any>(null)
  const [editedName, setEditedName] = useState('')
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [isValidatingUrl, setIsValidatingUrl] = useState(false)
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 9 // 3x3 grid
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [bowerToPreview, setBowerToPreview] = useState<any>(null)
  const [bowerFeeds, setBowerFeeds] = useState<string[]>([])
  const [newFeedInput, setNewFeedInput] = useState('')
  const [feedInputError, setFeedInputError] = useState<string | null>(null)
  const [isEditingKeywords, setIsEditingKeywords] = useState(false)
  const [saveToast, setSaveToast] = useState(false)
  
  // Keyword editing states
  interface Egg {
    id: string
    keyword: string
    color: string
  }
  interface FloatingKeyword {
    id: string
    text: string
    x: number
    y: number
    color: string
  }
  const [editingEggs, setEditingEggs] = useState<Egg[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [floatingKeywords, setFloatingKeywords] = useState<FloatingKeyword[]>([])
  const [keywordLimitToast, setKeywordLimitToast] = useState(false)
  const [isLoadingFeeds, setIsLoadingFeeds] = useState(false)
  const [isShowingPreview, setIsShowingPreview] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const nestRef = useRef<HTMLDivElement>(null)
  const MAX_KEYWORDS = 8
  
  const eggColors = ['#14b8a6', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8', '#F4A460']
  
  const keywordPool = language === 'ja'
    ? ['テクノロジー', 'AI', '機械学習', 'プログラミング', 'デザイン', 'スタートアップ', 'イノベーション', 'データサイエンス', 'クラウド', 'セキュリティ', 'モバイル', 'ウェブ開発', 'アプリ開発', 'ブロックチェーン', 'IoT', 'VR', 'AR', 'ゲーム', 'エンターテイメント', 'ビジネス', 'マーケティング', 'ソーシャルメディア', '健康', 'フィットネス', '料理', '旅行', 'ファッション', '音楽', '映画', '読書', '教育', '科学', '環境']
    : ['Technology', 'AI', 'Machine Learning', 'Programming', 'Design', 'Startup', 'Innovation', 'Data Science', 'Cloud', 'Security', 'Mobile', 'Web Dev', 'App Dev', 'Blockchain', 'IoT', 'VR', 'AR', 'Gaming', 'Entertainment', 'Business', 'Marketing', 'Social Media', 'Health', 'Fitness', 'Cooking', 'Travel', 'Fashion', 'Music', 'Movies', 'Reading', 'Education', 'Science', 'Environment']
  
  // Load existing keywords when entering edit mode
  useEffect(() => {
    if (isEditingKeywords && bowerToPreview) {
      if (bowerToPreview.keywords && bowerToPreview.keywords.length > 0) {
        // Load keywords from bowerToPreview
        const existingEggs: Egg[] = bowerToPreview.keywords.map((keyword: string, index: number) => ({
          id: `egg-${Date.now()}-${index}`,
          keyword,
          color: bowerToPreview.eggColors?.[index] || eggColors[index % eggColors.length]
        }));
        setEditingEggs(existingEggs);
      } else {
        // Clear eggs if no keywords
        setEditingEggs([]);
      }
    }
  }, [isEditingKeywords, bowerToPreview?.keywords, bowerToPreview?.eggColors])
  
  // Generate floating keywords when in editing mode
  useEffect(() => {
    if (!isEditingKeywords) {
      setFloatingKeywords([])
      return
    }
    
    // Generate initial floating keywords immediately when entering edit mode
    if (floatingKeywords.length === 0) {
      const availableKeywords = keywordPool.filter(
        kw => !editingEggs.some(egg => egg.keyword === kw)
      );
      const newFloating: FloatingKeyword[] = [];
      const maxWidth = 700;
      const maxHeight = 250;
      const count = Math.min(8, availableKeywords.length);
      
      // Generate unique keywords
      const selectedKeywords = new Set<string>();
      while (selectedKeywords.size < count && selectedKeywords.size < availableKeywords.length) {
        const randomKeyword = availableKeywords[Math.floor(Math.random() * availableKeywords.length)];
        selectedKeywords.add(randomKeyword);
      }
      
      selectedKeywords.forEach(keyword => {
        newFloating.push({
          id: `float-${Date.now()}-${Math.random()}`,
          text: keyword,
          x: Math.random() * maxWidth,
          y: Math.random() * maxHeight,
          color: eggColors[Math.floor(Math.random() * eggColors.length)]
        });
      });
      
      setFloatingKeywords(newFloating);
    }
    
    const interval = setInterval(() => {
      if (floatingKeywords.length < 8 && keywordInput.trim() === '') {
        const availableKeywords = keywordPool.filter(
          kw => !editingEggs.some(egg => egg.keyword === kw) && 
                !floatingKeywords.some(fk => fk.text === kw)
        )
        
        if (availableKeywords.length > 0) {
          const randomKeyword = availableKeywords[Math.floor(Math.random() * availableKeywords.length)]
          const maxWidth = 700;
          const maxHeight = 250;
          const newFloating: FloatingKeyword = {
            id: `float-${Date.now()}-${Math.random()}`,
            text: randomKeyword,
            x: Math.random() * maxWidth,
            y: Math.random() * maxHeight,
            color: eggColors[Math.floor(Math.random() * eggColors.length)]
          }
          setFloatingKeywords(prev => [...prev, newFloating])
        }
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }, [isEditingKeywords, floatingKeywords.length, editingEggs, keywordInput, language])

  // Mock public bowers for demonstration
  const getMockPublicBowers = () => {
    const colors = ['#14b8a6', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8']
    
    return [
      {
        id: 'mock-1',
        name: language === 'ja' ? 'テクノロジーニュース' : 'Tech News',
        keywords: ['AI', 'Programming', 'Web Dev', 'Cloud', 'Security'],
        feeds: [],
        color: colors[0],
        createdAt: new Date('2024-09-15'),
        isPublic: true,
        creatorId: 'user-mock-1',
        creatorName: language === 'ja' ? '田中太郎' : 'John Doe',
        likes: 42,
        likedBy: []
      },
      {
        id: 'mock-2',
        name: language === 'ja' ? 'デザイン＆UI' : 'Design & UI',
        keywords: ['Design', 'UI/UX', 'Figma', 'Typography', 'Color'],
        feeds: [],
        color: colors[1],
        createdAt: new Date('2024-09-20'),
        isPublic: true,
        creatorId: 'user-mock-2',
        creatorName: language === 'ja' ? '佐藤花子' : 'Jane Smith',
        likes: 38,
        likedBy: []
      },
      {
        id: 'mock-3',
        name: language === 'ja' ? 'スタートアップ情報' : 'Startup News',
        keywords: ['Startup', 'Business', 'Innovation', 'Funding', 'Growth'],
        feeds: [],
        color: colors[2],
        createdAt: new Date('2024-09-25'),
        isPublic: true,
        creatorId: 'user-mock-3',
        creatorName: language === 'ja' ? '鈴木一郎' : 'Mike Johnson',
        likes: 35,
        likedBy: []
      },
      {
        id: 'mock-4',
        name: language === 'ja' ? 'データサイエンス' : 'Data Science',
        keywords: ['Data Science', 'Machine Learning', 'Python', 'Analytics', 'Big Data'],
        feeds: [],
        color: colors[3],
        createdAt: new Date('2024-10-01'),
        isPublic: true,
        creatorId: 'user-mock-4',
        creatorName: language === 'ja' ? '山田美咲' : 'Sarah Lee',
        likes: 29,
        likedBy: []
      },
      {
        id: 'mock-5',
        name: language === 'ja' ? 'Web3とブロックチェーン' : 'Web3 & Blockchain',
        keywords: ['Web3', 'Blockchain', 'Crypto', 'NFT', 'DeFi'],
        feeds: [],
        color: colors[4],
        createdAt: new Date('2024-10-03'),
        isPublic: true,
        creatorId: 'user-mock-5',
        creatorName: language === 'ja' ? '高橋健太' : 'Tom Brown',
        likes: 25,
        likedBy: []
      },
      {
        id: 'mock-6',
        name: language === 'ja' ? 'モバイル開発' : 'Mobile Development',
        keywords: ['iOS', 'Android', 'React Native', 'Flutter', 'Swift'],
        feeds: [],
        color: colors[5],
        createdAt: new Date('2024-10-05'),
        isPublic: true,
        creatorId: 'user-mock-6',
        creatorName: language === 'ja' ? '伊藤さくら' : 'Emily Davis',
        likes: 22,
        likedBy: []
      }
    ]
  }

  // Validate URL format strictly
  const isValidUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString)
      // Must have http or https protocol
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return false
      }
      // Must have a hostname (not just protocol)
      if (!url.hostname || url.hostname.length === 0) {
        return false
      }
      // Hostname must contain at least one dot (e.g., example.com)
      if (!url.hostname.includes('.')) {
        return false
      }
      return true
    } catch {
      return false
    }
  }

  // Validate URL by checking if it's accessible
  const validateFeedUrl = async (url: string): Promise<boolean> => {
    // First check URL format strictly
    if (!isValidUrl(url)) {
      return false
    }
    
    try {
      // Try to fetch the URL (with no-cors mode to avoid CORS issues)
      // Note: This is a basic check and may not work for all URLs due to CORS
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        return true // If no error, URL is accessible
      } catch (fetchError) {
        clearTimeout(timeoutId)
        // no-cors mode always succeeds if the request is sent, so we'll accept it
        // The main validation is the URL format check above
        return true
      }
    } catch {
      return false
    }
  }

  // Handle like/unlike bower
  const handleLikeBower = (bowerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) return

    const bower = bowers.find(b => b.id === bowerId)
    if (!bower) return

    const likedBy = bower.likedBy || []
    const isLiked = likedBy.includes(user.id)

    let updatedBowers
    if (isLiked) {
      // Unlike
      updatedBowers = bowers.map(b =>
        b.id === bowerId
          ? { ...b, likes: (b.likes || 0) - 1, likedBy: likedBy.filter(id => id !== user.id) }
          : b
      )
    } else {
      // Like - if it's a public bower from someone else, add to my bowers
      if (bower.creatorId && bower.creatorId !== user.id && bower.isPublic) {
        // Clone the bower to user's collection
        const clonedBower = {
          ...bower,
          id: `${bower.id}-cloned-${Date.now()}`,
          creatorId: bower.creatorId,
          creatorName: bower.creatorName,
          likes: (bower.likes || 0) + 1,
          likedBy: [...likedBy, user.id],
          isPublic: false // User's copy is private by default
        }
        updatedBowers = [...bowers.map(b =>
          b.id === bowerId
            ? { ...b, likes: (b.likes || 0) + 1, likedBy: [...likedBy, user.id] }
            : b
        ), clonedBower]
      } else {
        updatedBowers = bowers.map(b =>
          b.id === bowerId
            ? { ...b, likes: (b.likes || 0) + 1, likedBy: [...likedBy, user.id] }
            : b
        )
      }
    }

    setBowers(updatedBowers)
    if (typeof window !== 'undefined') {
      localStorage.setItem('bowers', JSON.stringify(updatedBowers))
    }
  }

  // Redirect to home if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  // Load bowers from localStorage
  useEffect(() => {
    if (user) {
      // Try to load from localStorage
      if (typeof window !== 'undefined') {
        const savedBowers = localStorage.getItem('bowers')
        if (savedBowers) {
          try {
            const parsed = JSON.parse(savedBowers)
            if (parsed.length > 0) {
              // Convert createdAt strings back to Date objects and add default values
              const bowersWithDates = parsed.map((bower: any) => ({
                ...bower,
                createdAt: new Date(bower.createdAt),
                creatorId: bower.creatorId || user.id,
                creatorName: bower.creatorName || user.name,
                likes: bower.likes || 0,
                likedBy: bower.likedBy || []
              }))
              setBowers(bowersWithDates)
            }
          } catch (e) {
            console.error('Failed to parse saved bowers', e)
          }
        }
      }
    }
  }, [user])

  // Don't render if not logged in
  if (!user) {
    return null;
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
        className="w-full pl-8 md:pl-10 pr-8 md:pr-4 py-1.5 md:py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors text-sm"
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
  );

  return (
    <Layout searchBar={searchBar}>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="hidden md:block py-4">
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
              {t.bowers}
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-accent)' }}>
              {language === 'ja' 
                ? 'キーワードで鳥の巣を作り、AIが自動でフィードを発見します'
                : 'Create your nest with keywords and discover feeds automatically'
              }
            </p>
          </div>

          <div className="mb-6 md:hidden">
            <h1 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>{t.bowers}</h1>
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

        {/* Bowers Grid */}
        {(() => {
          // Filter bowers based on active tab and search query
          let filteredBowers = bowers;
          
          // Get mock public bowers
          const mockBowers = getMockPublicBowers()
          
          // Tab filtering
          if (activeTab === 'my') {
            filteredBowers = bowers.filter(b => !b.creatorId || b.creatorId === user?.id);
          } else if (activeTab === 'preset') {
            // Show preset bowers (mock data)
            filteredBowers = mockBowers;
          }
          
          // Search filtering
          if (searchQuery.trim()) {
            filteredBowers = filteredBowers.filter(b =>
              b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              b.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
            );
          }
          
          // Pagination
          const totalPages = Math.ceil(filteredBowers.length / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          const paginatedBowers = filteredBowers.slice(startIndex, endIndex);
          
          return filteredBowers.length > 0 || activeTab === 'my' ? (
              <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedBowers.map((bower) => {
                  const isOwnBower = !bower.creatorId || bower.creatorId === user?.id
                  const isLiked = bower.likedBy?.includes(user?.id || '') || false
                  
                  return (
                  <div
                    key={bower.id}
                    onClick={() => {
                      // Navigate to feeds page with this bower selected
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
                            setBowerToPreview(bower)
                            setEditedName(bower.name)
                            // Load feeds or generate mock feeds
                            const feeds = bower.feeds || bower.keywords.map((kw: string) => `https://example.com/feed/${kw.toLowerCase()}`)
                            setBowerFeeds(feeds)
                            setPreviewModalOpen(true)
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
                            setBowerToDelete(bower.id)
                            setDeleteModalOpen(true)
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
                        <div className="flex justify-center mb-3 transform group-hover:scale-110 transition-transform">
                          <BowerIcon eggColors={bower.eggColors || []} size={60} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1 line-clamp-2" style={{ minHeight: '3.5rem' }}>
                          {bower.name.length > 40 ? bower.name.substring(0, 40) + '...' : bower.name}
                        </h3>
                        {bower.creatorName && (
                          <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                            <span>👤</span>
                            <span>{bower.creatorName}</span>
                          </p>
                        )}
                      </div>
                      
                      <div className="mb-4 relative">
                        <div className="flex flex-wrap gap-2 justify-center items-start content-start" style={{ minHeight: '6rem', maxHeight: '6rem', overflow: 'hidden' }}>
                          {bower.keywords.slice(0, 8).map((keyword, index) => {
                            const keywordColor = bower.eggColors?.[index] || eggColors[index % eggColors.length];
                            return (
                            <span
                              key={index}
                              className="inline-block flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium shadow-sm whitespace-nowrap"
                              style={{ 
                                backgroundColor: `${keywordColor}20`,
                                color: keywordColor,
                                border: `1px solid ${keywordColor}40`
                              }}
                            >
                              {keyword}
                            </span>
                            );
                          })}
                          {bower.keywords.length > 8 && (
                            <div className="inline-block flex-shrink-0 relative group/more">
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium text-gray-600 whitespace-nowrap cursor-help" style={{ backgroundColor: 'var(--color-background-main)', border: '1px solid var(--color-tertiary)' }}>
                                ...
                              </span>
                              {/* Tooltip showing only hidden keywords */}
                              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover/more:opacity-100 transition-opacity duration-200 z-30 pointer-events-none">
                                <div 
                                  className="text-gray-800 text-sm rounded-xl py-3 px-4 shadow-2xl border-2"
                                  style={{ 
                                    backgroundColor: 'var(--color-background-main)',
                                    borderColor: 'var(--color-primary)',
                                    minWidth: '250px',
                                    maxWidth: '350px'
                                  }}
                                >
                                  <div className="flex flex-wrap gap-2 justify-center">
                                    {bower.keywords.slice(8).map((keyword, index) => {
                                      const actualIndex = index + 8;
                                      const keywordColor = bower.eggColors?.[actualIndex] || eggColors[actualIndex % eggColors.length];
                                      return (
                                      <span
                                        key={index}
                                        className="inline-block px-3 py-1.5 rounded-full font-medium shadow-sm whitespace-nowrap"
                                        style={{ 
                                          backgroundColor: `${keywordColor}20`,
                                          color: keywordColor,
                                          border: `1px solid ${keywordColor}40`
                                        }}
                                      >
                                        {keyword}
                                      </span>
                                      );
                                    })}
                                  </div>
                                  {/* Arrow */}
                                  <div 
                                    className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-transparent"
                                    style={{ borderTopColor: 'var(--color-primary)' }}
                                  ></div>
                                  <div 
                                    className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent -mt-[1px]"
                                    style={{ borderTopColor: 'var(--color-background-main)' }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-auto">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-3 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-1">
                            <span>❤️</span>
                            <span className="font-medium">{Math.max(1, bower.likes || 0)}</span>
                          </div>
                          <div className="text-xs">
                            {bower.createdAt.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>

                        {/* Add to My Bowers Button */}
                        {!isOwnBower && (
                          <button
                            onClick={(e) => handleLikeBower(bower.id, e)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all font-medium text-sm"
                            style={{
                              backgroundColor: colors.primary,
                              color: colors.button.text,
                              border: '2px solid transparent',
                              opacity: isLiked ? 0.6 : 1
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.secondary
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = colors.primary
                            }}
                          >
                            <span className="text-lg">{isLiked ? '✓' : '+'}</span>
                            <span>{isLiked ? t.added : t.add}</span>
                          </button>
                        )}
                        
                        {/* Like count for own bowers */}
                        {isOwnBower && bower.likes > 0 && (
                          <div className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600">
                            <span>⭐</span>
                            <span>{bower.likes} {t.likes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
                
                {/* Show create button only in "my" tab - at the end */}
                {activeTab === 'my' && (
                  <div
                    onClick={() => {
                      // Create a new bower and open in edit mode
                      const newBower = {
                        id: `bower-${Date.now()}`,
                        name: language === 'ja' ? '新しいバウアー' : 'New Bower',
                        keywords: [],
                        eggColors: [],
                        feeds: [],
                        color: eggColors[Math.floor(Math.random() * eggColors.length)],
                        createdAt: new Date(),
                        isPublic: false,
                        creatorId: user?.id,
                        creatorName: user?.name,
                        likes: 0,
                        likedBy: []
                      };
                      
                      // Open preview modal with the new bower
                      setBowerToPreview(newBower);
                      setEditedName(newBower.name);
                      setBowerFeeds([]);
                      setPreviewModalOpen(true);
                      
                      // Don't switch to keyword editing mode - let user click the button
                      setEditingEggs([]);
                      setIsEditingKeywords(false);
                    }}
                    className="rounded-xl shadow-md hover:shadow-2xl transition-all cursor-pointer group overflow-hidden flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed"
                    style={{ 
                      backgroundColor: 'transparent',
                      borderColor: colors.accent
                    }}
                  >
                    <div className="text-6xl mb-3 group-hover:scale-110 transition-transform" style={{ color: colors.accent }}>
                      +
                    </div>
                    <p className="text-lg font-semibold" style={{ color: colors.accent }}>
                      {t.create}
                    </p>
                  </div>
                )}
              
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: colors.primary, color: colors.button.text }}
                  >
                    {t.previous}
                  </button>
                  
                  <span className="px-4 py-2 text-gray-700">
                    {currentPage} / {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: colors.primary, color: colors.button.text }}
                  >
                    {t.next}
                  </button>
                </div>
              )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🪺</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {t.noBowersYet}
                </h3>
                <p className="text-gray-500 mb-6">
                  {language === 'ja' 
                    ? '最初のバウアーを作成して、AIにフィードを見つけてもらいましょう'
                    : 'Create your first bower and let AI find feeds for you'
                  }
                </p>
                <button
                  onClick={() => {
                    // Clear sessionStorage when creating a new bower
                    if (typeof window !== 'undefined') {
                      sessionStorage.removeItem('bowerPreview')
                    }
                    router.push('/bowers/new')
                  }}
                  className="px-6 py-3 rounded-lg transition-colors font-semibold"
                  style={{ backgroundColor: colors.accent, color: colors.button.text }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.accent}
                >
                  {t.createBower}
                </button>
              </div>
            );
          })()}


        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onConfirm={() => {
          if (bowerToDelete) {
            const updatedBowers = bowers.filter(b => b.id !== bowerToDelete)
            setBowers(updatedBowers)
            if (typeof window !== 'undefined') {
              localStorage.setItem('bowers', JSON.stringify(updatedBowers))
            }
          }
          setDeleteModalOpen(false)
          setBowerToDelete(null)
        }}
        onCancel={() => {
          setDeleteModalOpen(false)
          setBowerToDelete(null)
        }}
        bowerName={bowers.find(b => b.id === bowerToDelete)?.name || ''}
        language={language}
      />

      {/* Edit Bower Modal */}
      {editModalOpen && bowerToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {t.editBower}
              </h2>
              <button
                onClick={() => {
                  setEditModalOpen(false)
                  setBowerToEdit(null)
                  setEditedName('')
                  setNewFeedUrl('')
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Bower Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.bowerName}
              </label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                style={{ outline: 'none' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#14b8a6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* Feed Count */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                {`${t.subscribedFeeds} (${bowerToEdit.feeds.length})`}
              </h3>
            </div>

            {/* Feed List */}
            <div className="mb-6 space-y-2 max-h-60 overflow-y-auto">
              {bowerToEdit.feeds.length > 0 ? (
                bowerToEdit.feeds.map((feed: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {feed.title || feed.url}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{feed.url}</p>
                    </div>
                    {bowerToEdit.feeds.length > 1 && (
                      <button
                        onClick={() => {
                          const updatedFeeds = bowerToEdit.feeds.filter((_: any, i: number) => i !== index)
                          const updatedBower = { ...bowerToEdit, feeds: updatedFeeds }
                          setBowerToEdit(updatedBower)
                          
                          // Update in bowers list
                          const updatedBowers = bowers.map(b => 
                            b.id === bowerToEdit.id ? updatedBower : b
                          )
                          setBowers(updatedBowers)
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('bowers', JSON.stringify(updatedBowers))
                          }
                        }}
                        className="ml-3 p-2 rounded-lg transition-colors text-red-500 hover:text-red-700 hover:bg-red-50"
                        title={t.delete}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">
                  {t.noFeeds}
                </p>
              )}
            </div>

            {/* Add Feed */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.addFeed}
              </label>
              {urlValidationError && (
                <div className="mb-2 text-sm text-red-600">
                  {urlValidationError}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newFeedUrl}
                  onChange={(e) => {
                    setNewFeedUrl(e.target.value)
                    setUrlValidationError(null)
                  }}
                  placeholder={language === 'ja' ? 'https://example.com/feed' : 'https://example.com/feed'}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                  style={{ outline: 'none' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#14b8a6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  disabled={isValidatingUrl}
                  onKeyPress={async (e) => {
                    if (e.key === 'Enter' && newFeedUrl.trim() && !isValidatingUrl) {
                      const urlStr = newFeedUrl.trim()
                      
                      // Validate URL format strictly
                      if (!isValidUrl(urlStr)) {
                        setUrlValidationError(
                          language === 'ja' 
                            ? '有効なURL（例: https://example.com/feed）を入力してください' 
                            : 'Please enter a valid URL (e.g., https://example.com/feed)'
                        )
                        return
                      }
                      
                      // Validate URL accessibility
                      setIsValidatingUrl(true)
                      const isValid = await validateFeedUrl(urlStr)
                      setIsValidatingUrl(false)
                      
                      if (isValid) {
                        const newFeed = {
                          url: urlStr,
                          title: urlStr,
                          addedAt: new Date()
                        }
                        const updatedBower = {
                          ...bowerToEdit,
                          feeds: [...bowerToEdit.feeds, newFeed]
                        }
                        setBowerToEdit(updatedBower)
                        
                        // Update in bowers list
                        const updatedBowers = bowers.map(b => 
                          b.id === bowerToEdit.id ? updatedBower : b
                        )
                        setBowers(updatedBowers)
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('bowers', JSON.stringify(updatedBowers))
                        }
                        setNewFeedUrl('')
                        setUrlValidationError(null)
                      } else {
                        setUrlValidationError(
                          language === 'ja' 
                            ? 'URLにアクセスできませんでした' 
                            : 'Could not access the URL'
                        )
                      }
                    }
                  }}
                />
                <button
                  onClick={async () => {
                    if (newFeedUrl.trim() && !isValidatingUrl) {
                      const urlStr = newFeedUrl.trim()
                      
                      // Validate URL format strictly
                      if (!isValidUrl(urlStr)) {
                        setUrlValidationError(
                          language === 'ja' 
                            ? '有効なURL（例: https://example.com/feed）を入力してください' 
                            : 'Please enter a valid URL (e.g., https://example.com/feed)'
                        )
                        return
                      }
                      
                      // Validate URL accessibility
                      setIsValidatingUrl(true)
                      const isValid = await validateFeedUrl(urlStr)
                      setIsValidatingUrl(false)
                      
                      if (isValid) {
                        const newFeed = {
                          url: urlStr,
                          title: urlStr,
                          addedAt: new Date()
                        }
                        const updatedBower = {
                          ...bowerToEdit,
                          feeds: [...bowerToEdit.feeds, newFeed]
                        }
                        setBowerToEdit(updatedBower)
                        
                        // Update in bowers list
                        const updatedBowers = bowers.map(b => 
                          b.id === bowerToEdit.id ? updatedBower : b
                        )
                        setBowers(updatedBowers)
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('bowers', JSON.stringify(updatedBowers))
                        }
                        setNewFeedUrl('')
                        setUrlValidationError(null)
                      } else {
                        setUrlValidationError(
                          language === 'ja' 
                            ? 'URLにアクセスできませんでした' 
                            : 'Could not access the URL'
                        )
                      }
                    }
                  }}
                  disabled={isValidatingUrl || !newFeedUrl.trim() || !isValidUrl(newFeedUrl.trim())}
                  className="px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: (isValidatingUrl || !newFeedUrl.trim() || !isValidUrl(newFeedUrl.trim())) 
                      ? '#9ca3af' 
                      : colors.primary, 
                    color: colors.button.text 
                  }}
                  onMouseEnter={(e) => {
                    if (!isValidatingUrl && newFeedUrl.trim() && isValidUrl(newFeedUrl.trim())) {
                      e.currentTarget.style.backgroundColor = colors.secondary
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isValidatingUrl && newFeedUrl.trim() && isValidUrl(newFeedUrl.trim())) {
                      e.currentTarget.style.backgroundColor = colors.primary
                    }
                  }}
                >
                  {isValidatingUrl ? t.checking : t.add}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setEditModalOpen(false)
                  setBowerToEdit(null)
                  setEditedName('')
                  setNewFeedUrl('')
                }}
                className="px-6 py-2 rounded-lg transition-colors font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => {
                  if (editedName.trim()) {
                    const updatedBowers = bowers.map(b =>
                      b.id === bowerToEdit.id ? { ...b, name: editedName.trim() } : b
                    )
                    setBowers(updatedBowers)
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('bowers', JSON.stringify(updatedBowers))
                    }
                  }
                  setEditModalOpen(false)
                  setBowerToEdit(null)
                  setEditedName('')
                  setNewFeedUrl('')
                }}
                className="px-6 py-2 rounded-lg transition-colors font-medium"
                style={{ backgroundColor: colors.primary, color: colors.button.text }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.secondary}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
              >
                {language === 'ja' ? '保存' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Preview Modal */}
      {previewModalOpen && bowerToPreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setPreviewModalOpen(false)
            setBowerToPreview(null)
          }}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3 flex-1">
                <BowerIcon eggColors={bowerToPreview.eggColors || []} size={48} />
                <div className="flex-1">
                  {isEditingKeywords ? (
                    <h2 className="text-lg font-bold text-gray-800">
                      {language === 'ja' ? 'キーワード編集' : 'Edit Keywords'}
                    </h2>
                  ) : (
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => {
                        const value = e.target.value;
                        const charCount = value.split('').reduce((count, char) => {
                          return count + (char.match(/[^\x00-\xff]/) ? 2 : 1);
                        }, 0);
                        if (charCount <= 40) {
                          setEditedName(value);
                        }
                      }}
                      className="text-lg font-bold text-gray-800 w-full focus:outline-none bg-transparent"
                      placeholder={language === 'ja' ? 'バウアー名' : 'Bower name'}
                      style={{ border: 'none' }}
                    />
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setPreviewModalOpen(false)
                  setBowerToPreview(null)
                  setIsEditingKeywords(false)
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl ml-4"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center">
                    <div className="relative mb-6 w-24 h-24 flex items-center justify-center">
                      <div 
                        className="text-6xl absolute"
                        style={{ animation: 'eggBounce 2s ease-in-out infinite' }}
                      >
                        🥚
                      </div>
                      <div 
                        className="text-6xl absolute"
                        style={{ animation: 'chickAppear 2s ease-in-out infinite' }}
                      >
                        🐣
                      </div>
                    </div>
                    <p className="text-lg font-medium text-gray-800">
                      {t.loadingPreview}
                    </p>
                  </div>
                </div>
              ) : isShowingPreview ? (
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: colors.primary }}>
                    {t.preview}
                  </h2>
                  
                  {/* Mock Feed Preview */}
                  <div className="space-y-4">
                    {[
                      {
                        id: 1,
                        title: language === 'ja' 
                          ? `${bowerToPreview.keywords[0] || 'テクノロジー'}の最新トレンド`
                          : `Latest trends in ${bowerToPreview.keywords[0] || 'Technology'}`,
                        content: language === 'ja'
                          ? 'この分野での最新の動向と注目すべきポイントについて詳しく解説します。業界のエキスパートによる分析と今後の展望をお届けします...'
                          : 'A detailed explanation of the latest trends and key points in this field. Expert analysis and future outlook from industry professionals...',
                        image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop',
                        url: 'https://example.com/article-1'
                      },
                      {
                        id: 2,
                        title: language === 'ja'
                          ? `${bowerToPreview.keywords[1] || 'イノベーション'}が変える未来`
                          : `How ${bowerToPreview.keywords[1] || 'Innovation'} is changing the future`,
                        content: language === 'ja'
                          ? '新しい技術やアプローチがもたらす変革について、具体的な事例を交えながら紹介します。実践的な知見と応用例も豊富に掲載...'
                          : 'Introducing transformative changes brought by new technologies and approaches with concrete examples. Rich in practical insights and applications...',
                        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop',
                        url: 'https://example.com/article-2'
                      },
                      {
                        id: 3,
                        title: language === 'ja'
                          ? `${bowerToPreview.keywords[2] || 'デジタル'}時代の新常識`
                          : `New standards in the ${bowerToPreview.keywords[2] || 'Digital'} era`,
                        content: language === 'ja'
                          ? '変化する環境の中で押さえておくべき重要なポイントと、成功のための戦略について解説します。実例に基づいた実践的なアドバイスを提供...'
                          : 'Key points to understand in a changing environment and strategies for success. Practical advice based on real examples...',
                        image: 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=400&h=250&fit=crop',
                        url: 'https://example.com/article-3'
                      }
                    ].map((article) => (
                      <article
                        key={article.id}
                        className="rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer relative group overflow-hidden"
                        style={{ backgroundColor: '#FFFFFF' }}
                        onClick={() => window.open(article.url, '_blank')}
                      >
                        <div className="p-6">
                          {article.image && (
                            <div className="mb-4 -mx-6 -mt-6">
                              <img 
                                src={article.image} 
                                alt={article.title}
                                className="w-full h-48 object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-sm font-medium px-3 py-1 rounded-full" style={{ 
                                  backgroundColor: `${bowerToPreview.color}20`,
                                  color: bowerToPreview.color
                                }}>
                                  🪺 {bowerToPreview.name}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {new Date().toLocaleDateString(
                                    language === "ja" ? "ja-JP" : "en-US",
                                    { month: 'short', day: 'numeric' }
                                  )}
                                </span>
                              </div>
                              <h2 className="text-xl font-semibold mb-3 text-gray-800">
                                {article.title}
                              </h2>
                              <p className="text-gray-600 mb-4 line-clamp-3">
                                {article.content}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <span className="font-medium transition-colors" style={{ color: 'var(--color-primary)' }}>
                              {language === 'ja' ? '続きを読む' : 'Read more'} →
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : isEditingKeywords ? (
                <div className="max-w-4xl mx-auto">
                  {/* Loading State - Egg Hatching */}
                  {isLoadingFeeds && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                      <div className="bg-white rounded-lg p-8 flex flex-col items-center">
                        <div className="relative mb-6 w-24 h-24 flex items-center justify-center">
                          <div 
                            className="text-6xl absolute"
                            style={{ animation: 'eggBounce 2s ease-in-out infinite' }}
                          >
                            🥚
                          </div>
                          <div 
                            className="text-6xl absolute"
                            style={{ animation: 'chickAppear 2s ease-in-out infinite' }}
                          >
                            🐣
                          </div>
                        </div>
                        <p className="text-lg font-medium text-gray-800">
                          {language === 'ja' ? 'フィードを生成中...' : 'Generating feeds...'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Keyword Limit Toast */}
                  {keywordLimitToast && (
                    <div 
                      className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg animate-slide-down"
                      style={{ backgroundColor: colors.primary, color: 'white' }}
                    >
                      <p className="font-medium">
                        {language === 'ja' 
                          ? `キーワードは最大${MAX_KEYWORDS}個までです` 
                          : `Maximum ${MAX_KEYWORDS} keywords allowed`}
                      </p>
                    </div>
                  )}
                  
                  {/* Nest Visualization */}
                  <div
                    className="relative px-8 pb-4 min-h-[280px] overflow-hidden rounded-xl"
                    style={{
                      background: `linear-gradient(to bottom, #E0F6FF 0%, #E0F6FF 100%)`,
                    }}
                  >
                    {/* Sun */}
                    <div 
                      className="absolute top-4 right-8 text-4xl cursor-pointer hover:scale-110 transition-all"
                      onClick={(e) => {
                        // Add rotation animation
                        const target = e.currentTarget
                        target.classList.add('animate-spin-once')
                        setTimeout(() => {
                          target.classList.remove('animate-spin-once')
                        }, 600)
                        
                        // Rotate all floating keywords
                        setFloatingKeywords(prev => {
                          if (prev.length === 0) return prev;
                          // Remove all current floating keywords
                          const removed = [...prev];
                          // Generate new ones
                          const availableKeywords = keywordPool.filter(
                            kw => !editingEggs.some(egg => egg.keyword === kw)
                          );
                          const newFloating: FloatingKeyword[] = [];
                          const maxWidth = 700; // Max width for keywords within nest area
                          const maxHeight = 250; // Max height for keywords within nest area
                          for (let i = 0; i < Math.min(8, availableKeywords.length); i++) {
                            const randomKeyword = availableKeywords[Math.floor(Math.random() * availableKeywords.length)];
                            if (!newFloating.some(f => f.text === randomKeyword)) {
                              newFloating.push({
                                id: `float-${Date.now()}-${Math.random()}`,
                                text: randomKeyword,
                                x: Math.random() * maxWidth,
                                y: Math.random() * maxHeight,
                                color: eggColors[Math.floor(Math.random() * eggColors.length)]
                              });
                            }
                          }
                          return newFloating;
                        });
                      }}
                      title={language === 'ja' ? 'クリックでキーワードを更新' : 'Click to refresh keywords'}
                    >
                      ☀️
                    </div>

                    {/* Clouds */}
                    <div className="absolute top-12 -left-20 opacity-70 cloud-drift">
                      <div className="flex items-center">
                        <div className="w-12 h-8 bg-white rounded-full"></div>
                        <div className="w-16 h-10 bg-white rounded-full -ml-4"></div>
                        <div className="w-10 h-8 bg-white rounded-full -ml-4"></div>
                      </div>
                    </div>
                    <div className="absolute top-24 -left-32 opacity-60 cloud-drift-slow" style={{ animationDelay: '15s' }}>
                      <div className="flex items-center">
                        <div className="w-10 h-6 bg-white rounded-full"></div>
                        <div className="w-14 h-8 bg-white rounded-full -ml-3"></div>
                        <div className="w-8 h-6 bg-white rounded-full -ml-3"></div>
                      </div>
                    </div>
                    <div className="absolute top-6 -left-40 opacity-50 cloud-drift" style={{ animationDelay: '8s' }}>
                      <div className="flex items-center">
                        <div className="w-8 h-5 bg-white rounded-full"></div>
                        <div className="w-12 h-7 bg-white rounded-full -ml-3"></div>
                        <div className="w-7 h-5 bg-white rounded-full -ml-2"></div>
                      </div>
                    </div>

                    {/* Birds */}
                    <div 
                      className="absolute top-12 left-1/4 cursor-pointer hover:scale-110 transition-transform"
                      onClick={(e) => {
                        e.currentTarget.classList.add('animate-bird-shake')
                        setTimeout(() => {
                          e.currentTarget.classList.remove('animate-bird-shake')
                        }, 500)
                      }}
                    >
                      <BirdSVG className="w-8 h-8" />
                    </div>
                    <div 
                      className="absolute top-20 right-1/4 cursor-pointer hover:scale-110 transition-transform"
                      onClick={(e) => {
                        e.currentTarget.classList.add('animate-bird-shake')
                        setTimeout(() => {
                          e.currentTarget.classList.remove('animate-bird-shake')
                        }, 500)
                      }}
                    >
                      <BirdSVG className="w-6 h-6" />
                    </div>

                    {/* Balloons */}
                    <div 
                      className="absolute top-8 left-1/3 animate-float-slow cursor-pointer hover:scale-110 transition-transform"
                      onClick={(e) => {
                        const target = e.currentTarget;
                        target.classList.add('animate-balloon-pop')
                        setTimeout(() => {
                          if (target) {
                            target.style.display = 'none'
                          }
                        }, 400)
                      }}
                    >
                      <BalloonSVG color="#FF6B9D" className="w-10 h-14" />
                    </div>
                    <div 
                      className="absolute top-16 right-1/3 animate-float-delayed cursor-pointer hover:scale-110 transition-transform"
                      onClick={(e) => {
                        const target = e.currentTarget;
                        target.classList.add('animate-balloon-pop')
                        setTimeout(() => {
                          if (target) {
                            target.style.display = 'none'
                          }
                        }, 400)
                      }}
                    >
                      <BalloonSVG color="#4ECDC4" className="w-8 h-12" />
                    </div>

                    {/* Floating Keywords */}
                    <div className="absolute inset-0 pointer-events-none">
                      {floatingKeywords.map((keyword) => (
                        <div
                          key={keyword.id}
                          onClick={() => {
                            // Check keyword limit
                            if (editingEggs.length >= MAX_KEYWORDS) {
                              setKeywordLimitToast(true);
                              setTimeout(() => setKeywordLimitToast(false), 3000);
                              return;
                            }
                            // Remove from floating keywords
                            setFloatingKeywords(prev => prev.filter(k => k.id !== keyword.id))
                            // Add to eggs
                            const newEgg: Egg = {
                              id: keyword.id,
                              keyword: keyword.text,
                              color: keyword.color,
                            }
                            setEditingEggs(prev => [...prev, newEgg])
                          }}
                          className="absolute cursor-pointer keyword-float hover:scale-110 transition-transform z-10 pointer-events-auto"
                          style={{
                            left: `${keyword.x}px`,
                            top: `${keyword.y}px`,
                            animationDelay: `${Math.random() * 2}s`,
                          }}
                        >
                          <div
                            className="px-4 py-3 rounded-2xl text-white font-medium shadow-lg border border-white border-opacity-30 backdrop-blur-sm"
                            style={{ backgroundColor: keyword.color }}
                          >
                            {keyword.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SVG Nest - Outside Sky Area */}
                  <div className="flex justify-center -mt-4">
                    <div
                      ref={nestRef}
                      className="hover:scale-105 transition-transform duration-300"
                    >
                      <div className="w-80 relative" style={{ height: '160px' }}>
                        <NestSVG className="drop-shadow-lg" />

                        {/* Eggs in Nest */}
                        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-72 h-24 flex items-center justify-center">
                          <div className="relative w-full h-full">
                            {editingEggs.map((egg, index) => {
                              const angle = (index / Math.max(editingEggs.length, 1)) * Math.PI * 2;
                              const seed = egg.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                              const radius = 30 + (seed % 40);
                              const x = Math.cos(angle) * radius;
                              const y = Math.sin(angle) * radius * 0.5;
                              const scale = 0.85 + (seed % 30) / 100;
                              const rotation = (seed % 50) - 25;

                              return (
                                <div
                                  key={egg.id}
                                  className="absolute transition-transform hover:scale-125 cursor-pointer"
                                  style={{
                                    left: `calc(50% + ${x}px)`,
                                    top: `calc(50% + ${y}px)`,
                                    transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`,
                                    zIndex: Math.floor(50 - y),
                                  }}
                                  onClick={() => {
                                    setEditingEggs(prev => prev.filter(e => e.id !== egg.id))
                                  }}
                                >
                                  <EggSVG
                                    color={egg.color}
                                    title={egg.keyword}
                                    className="hover:opacity-80"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Keyword Input */}
                  <div className="mt-6 max-w-xl mx-auto">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={keywordInput}
                          onChange={(e) => setKeywordInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.nativeEvent.isComposing && keywordInput.trim()) {
                              e.preventDefault();
                              const keywords = keywordInput.split(/[,、]/).map(k => k.trim()).filter(k => k);
                              const availableSlots = MAX_KEYWORDS - editingEggs.length;
                              
                              if (availableSlots <= 0) {
                                setKeywordLimitToast(true);
                                setTimeout(() => setKeywordLimitToast(false), 3000);
                                return;
                              }
                              
                              const keywordsToAdd = keywords.slice(0, availableSlots);
                              if (keywords.length > availableSlots) {
                                setKeywordLimitToast(true);
                                setTimeout(() => setKeywordLimitToast(false), 3000);
                              }
                              
                              keywordsToAdd.forEach(keyword => {
                                const newEgg: Egg = {
                                  id: `egg-${Date.now()}-${Math.random()}`,
                                  keyword,
                                  color: eggColors[editingEggs.length % eggColors.length],
                                };
                                setEditingEggs(prev => [...prev, newEgg]);
                              });
                              setKeywordInput('');
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                          style={{ outline: 'none' }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = colors.tertiary)}
                          onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
                          placeholder={t.keywordExample}
                        />
                        <button
                          onClick={() => {
                            if (keywordInput.trim()) {
                              const keywords = keywordInput.split(/[,、]/).map(k => k.trim()).filter(k => k);
                              const availableSlots = MAX_KEYWORDS - editingEggs.length;
                              
                              if (availableSlots <= 0) {
                                setKeywordLimitToast(true);
                                setTimeout(() => setKeywordLimitToast(false), 3000);
                                return;
                              }
                              
                              const keywordsToAdd = keywords.slice(0, availableSlots);
                              if (keywords.length > availableSlots) {
                                setKeywordLimitToast(true);
                                setTimeout(() => setKeywordLimitToast(false), 3000);
                              }
                              
                              keywordsToAdd.forEach(keyword => {
                                const newEgg: Egg = {
                                  id: `egg-${Date.now()}-${Math.random()}`,
                                  keyword,
                                  color: eggColors[editingEggs.length % eggColors.length],
                                };
                                setEditingEggs(prev => [...prev, newEgg]);
                              });
                              setKeywordInput('');
                            }
                          }}
                          disabled={!keywordInput.trim()}
                          className="px-4 py-2 rounded-lg transition-colors font-bold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:text-white"
                          style={{ backgroundColor: colors.primary, color: 'white' }}
                          onMouseEnter={(e) => {
                            if (keywordInput.trim()) e.currentTarget.style.backgroundColor = colors.tertiary;
                          }}
                          onMouseLeave={(e) => {
                            if (keywordInput.trim()) e.currentTarget.style.backgroundColor = colors.primary;
                          }}
                        >
                          &gt;
                        </button>
                      </div>
                    </div>

                  {/* Keywords Display - Below Input */}
                  {editingEggs.length > 0 && (
                    <div className="mt-4 text-center">
                      <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                        {editingEggs.map((egg) => (
                          <span
                            key={egg.id}
                            className="px-3 py-1.5 rounded-2xl text-white text-sm font-medium cursor-pointer hover:opacity-80 border border-white border-opacity-30 shadow-sm backdrop-blur-sm"
                            style={{ backgroundColor: egg.color }}
                            onClick={() => setEditingEggs(prev => prev.filter(e => e.id !== egg.id))}
                          >
                            {egg.keyword} ✕
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setIsEditingKeywords(false);
                        setKeywordInput('');
                      }}
                      className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-md"
                    >
                      {language === 'ja' ? '戻る' : 'Back'}
                    </button>
                    <button
                      onClick={() => {
                        // Save keywords to bower
                        if (editingEggs.length > 0) {
                          // Auto-generate bower name if it's still "新しいバウアー" or "New Bower"
                          let bowerName = editedName;
                          if (editedName === t.newBower || editedName === '新しいバウアー' || editedName === 'New Bower') {
                            // Generate name from keywords
                            const keywords = editingEggs.map(e => e.keyword);
                            if (keywords.length === 1) {
                              bowerName = keywords[0];
                            } else if (keywords.length === 2) {
                              bowerName = keywords.join(' & ');
                            } else {
                              // Use first 2-3 keywords
                              bowerName = keywords.slice(0, 2).join(' & ');
                              if (keywords.length > 2) {
                                bowerName += language === 'ja' ? ' など' : ' etc.';
                              }
                            }
                            setEditedName(bowerName);
                          }
                          
                          // Generate mock feeds based on keywords
                          setIsLoadingFeeds(true);
                          const mockFeeds = editingEggs.map(egg => 
                            `https://example.com/feed/${egg.keyword.toLowerCase().replace(/\s+/g, '-')}`
                          );
                          
                          setTimeout(() => {
                            const savedBowers = localStorage.getItem('bowers');
                            const bowersList = savedBowers ? JSON.parse(savedBowers) : [];
                            
                            // Check if this is a new bower or existing one
                            const existingBowerIndex = bowersList.findIndex((b: any) => b.id === bowerToPreview.id);
                            
                            const updatedBower = {
                              ...bowerToPreview,
                              name: bowerName,
                              keywords: editingEggs.map(e => e.keyword),
                              eggColors: editingEggs.map(e => e.color),
                              feeds: mockFeeds
                            };
                            
                            let updatedBowers;
                            if (existingBowerIndex >= 0) {
                              // Update existing bower
                              updatedBowers = bowersList.map((b: any) =>
                                b.id === bowerToPreview.id ? updatedBower : b
                              );
                            } else {
                              // Add new bower
                              updatedBowers = [...bowersList, updatedBower];
                            }
                            
                            // Don't save to localStorage yet, just update preview
                            setBowerToPreview(updatedBower);
                            setBowerFeeds(mockFeeds);
                            setIsLoadingFeeds(false);
                          }, 1500); // Simulate loading
                        }
                        setIsEditingKeywords(false);
                      }}
                      disabled={editingEggs.length === 0}
                      className="px-6 py-3 rounded-lg transition-colors font-medium shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                      style={{ backgroundColor: colors.primary, color: 'white' }}
                      onMouseEnter={(e) => {
                        if (editingEggs.length > 0) e.currentTarget.style.backgroundColor = colors.secondary;
                      }}
                      onMouseLeave={(e) => {
                        if (editingEggs.length > 0) e.currentTarget.style.backgroundColor = colors.primary;
                      }}
                    >
                      {language === 'ja' ? '保存' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
              {/* Keywords */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {language === 'ja' ? 'キーワード' : 'Keywords'}
                </h3>
                
                {bowerToPreview.keywords && bowerToPreview.keywords.length > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {bowerToPreview.keywords.map((keyword: string, index: number) => {
                        const keywordColor = bowerToPreview.eggColors?.[index] || eggColors[index % eggColors.length];
                        return (
                        <span
                          key={index}
                          className="inline-block px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                          style={{ 
                            backgroundColor: `${keywordColor}20`,
                            color: keywordColor,
                            border: `1px solid ${keywordColor}40`
                          }}
                        >
                          {keyword}
                        </span>
                        );
                      })}
                    </div>
                    <div className="text-center">
                      <button
                        onClick={() => {
                          // Save name changes first
                          if (editedName !== bowerToPreview.name) {
                            const savedBowers = localStorage.getItem('bowers');
                            if (savedBowers) {
                              const bowersList = JSON.parse(savedBowers);
                              const updatedBowers = bowersList.map((b: any) =>
                                b.id === bowerToPreview.id ? { ...b, name: editedName } : b
                              );
                              // Don't save yet, just update preview
                            }
                          }
                          // Initialize eggs from existing keywords
                          if (bowerToPreview.keywords && bowerToPreview.keywords.length > 0) {
                            const eggs = bowerToPreview.keywords.map((keyword: string, index: number) => ({
                              id: `egg-${Date.now()}-${index}`,
                              keyword: keyword,
                              color: bowerToPreview.eggColors?.[index] || eggColors[index % eggColors.length]
                            }))
                            setEditingEggs(eggs)
                          } else {
                            setEditingEggs([])
                          }
                          // Switch to keyword editing view
                          setIsEditingKeywords(true)
                        }}
                        className="px-4 py-1.5 rounded-lg transition-colors font-medium text-sm"
                        style={{ backgroundColor: colors.primary, color: 'white' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.secondary}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                      >
                        {language === 'ja' ? 'キーワード編集' : 'Edit Keywords'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-600 mb-4">
                      {language === 'ja' 
                        ? t.setKeywords
                        : t.setKeywords}
                    </p>
                    <button
                      onClick={() => {
                        // Initialize eggs from existing keywords
                        if (bowerToPreview.keywords && bowerToPreview.keywords.length > 0) {
                          const eggs = bowerToPreview.keywords.map((keyword: string, index: number) => ({
                            id: `egg-${Date.now()}-${index}`,
                            keyword: keyword,
                            color: bowerToPreview.eggColors?.[index] || eggColors[index % eggColors.length]
                          }))
                          setEditingEggs(eggs)
                        } else {
                          setEditingEggs([])
                        }
                        setIsEditingKeywords(true);
                      }}
                      className="px-6 py-2 rounded-lg transition-colors font-medium"
                      style={{ backgroundColor: colors.primary, color: 'white' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.secondary}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.primary}
                    >
                      {language === 'ja' ? 'キーワード編集' : 'Edit Keywords'}
                    </button>
                  </div>
                )}
              </div>

              {/* Feeds - Only show if keywords exist */}
              {bowerToPreview.keywords && bowerToPreview.keywords.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {language === 'ja' ? 'フィード' : 'Feeds'}
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  {language === 'ja' 
                    ? 'キーワードに関連するフィードが自動で登録されます。追加・削除できます。'
                    : 'Feeds related to keywords are automatically registered. You can add or remove them.'}
                </p>
                
                {/* Loading State */}
                {isLoadingFeeds ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="relative mb-4 w-16 h-16 flex items-center justify-center">
                      <div 
                        className="text-4xl absolute"
                        style={{ animation: 'eggBounce 2s ease-in-out infinite' }}
                      >
                        🥚
                      </div>
                      <div 
                        className="text-4xl absolute"
                        style={{ animation: 'chickAppear 2s ease-in-out infinite' }}
                      >
                        🐣
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {language === 'ja' ? 'フィードを生成中...' : 'Generating feeds...'}
                    </p>
                  </div>
                ) : (
                  <>
                {/* Feed List */}
                <div className="space-y-2 mb-3">
                  {bowerFeeds.map((feed, index) => {
                    // Extract keyword from feed URL
                    const keyword = bowerToPreview.keywords?.[index] || 
                                   feed.split('/').pop()?.replace(/-/g, ' ') || 
                                   'Feed';
                    const keywordColor = bowerToPreview.eggColors?.[index] || 
                                        eggColors[index % eggColors.length];
                    
                    return (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{feed}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span 
                          className="px-3 py-1 rounded-full text-xs font-medium shadow-sm whitespace-nowrap"
                          style={{ 
                            backgroundColor: `${keywordColor}20`,
                            color: keywordColor,
                            border: `1px solid ${keywordColor}40`
                          }}
                        >
                          {keyword}
                        </span>
                        {bowerFeeds.length > 1 && (
                          <button
                          onClick={() => {
                            const updatedFeeds = bowerFeeds.filter((_, i) => i !== index)
                            setBowerFeeds(updatedFeeds)
                            // Update preview only (don't save yet)
                            setBowerToPreview({
                              ...bowerToPreview,
                              feeds: updatedFeeds
                            })
                          }}
                          className="text-red-500 hover:text-red-700 text-sm font-bold"
                        >
                          ✕
                        </button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>

                {/* Add Feed */}
                {feedInputError && (
                  <div className="mb-2 text-sm text-red-600">
                    {feedInputError}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newFeedInput}
                    onChange={(e) => {
                      setNewFeedInput(e.target.value)
                      setFeedInputError(null)
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim()
                      if (value && !isValidUrl(value)) {
                        setFeedInputError(
                          language === 'ja'
                            ? '有効なURL（例: https://example.com/feed）を入力してください'
                            : 'Please enter a valid URL (e.g., https://example.com/feed)'
                        )
                      }
                    }}
                    placeholder={language === 'ja' ? 'https://example.com/feed' : 'https://example.com/feed'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newFeedInput.trim() && isValidUrl(newFeedInput.trim())) {
                        const updatedFeeds = [...bowerFeeds, newFeedInput.trim()]
                        setBowerFeeds(updatedFeeds)
                        setNewFeedInput('')
                        setFeedInputError(null)
                        // Update preview only (don't save yet)
                        setBowerToPreview({
                          ...bowerToPreview,
                          feeds: updatedFeeds
                        })
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newFeedInput.trim() && isValidUrl(newFeedInput.trim())) {
                        const updatedFeeds = [...bowerFeeds, newFeedInput.trim()]
                        setBowerFeeds(updatedFeeds)
                        setNewFeedInput('')
                        setFeedInputError(null)
                        // Update preview only (don't save yet)
                        setBowerToPreview({
                          ...bowerToPreview,
                          feeds: updatedFeeds
                        })
                      }
                    }}
                    disabled={!newFeedInput.trim() || !isValidUrl(newFeedInput.trim())}
                    className="px-4 py-2 rounded-lg transition-colors font-medium text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      backgroundColor: (newFeedInput.trim() && isValidUrl(newFeedInput.trim())) ? colors.primary : '#9ca3af',
                      color: 'white' 
                    }}
                    onMouseEnter={(e) => {
                      if (newFeedInput.trim() && isValidUrl(newFeedInput.trim())) {
                        e.currentTarget.style.backgroundColor = colors.secondary
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (newFeedInput.trim() && isValidUrl(newFeedInput.trim())) {
                        e.currentTarget.style.backgroundColor = colors.primary
                      }
                    }}
                  >
                    {language === 'ja' ? '追加' : 'Add'}
                  </button>
                </div>
                  </>
                )}
              </div>
              )}


                </>
              )}
            </div>

            {/* Footer */}
            {!isEditingKeywords && !isShowingPreview && (
            <div className="flex gap-3 justify-between p-6 border-t">
              <button
                onClick={() => {
                  setPreviewModalOpen(false)
                  setBowerToPreview(null)
                  setIsShowingPreview(false)
                }}
                className="px-6 py-2 rounded-lg transition-colors font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t.close}
              </button>
              {bowerToPreview.keywords && bowerToPreview.keywords.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsLoadingPreview(true);
                    setTimeout(() => {
                      setIsLoadingPreview(false);
                      setIsShowingPreview(true);
                    }, 1500);
                  }}
                  className="px-6 py-2 rounded-lg transition-colors font-medium border-2"
                  style={{ borderColor: colors.accent, color: colors.accent }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.accent
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = colors.accent
                  }}
                >
                  {language === 'ja' ? 'プレビュー' : 'Preview'}
                </button>
                <button
                  onClick={() => {
                    // Save changes (name and feeds)
                    const savedBowers = localStorage.getItem('bowers');
                    if (savedBowers) {
                      const bowersList = JSON.parse(savedBowers);
                      const existingBowerIndex = bowersList.findIndex((b: any) => b.id === bowerToPreview.id);
                      
                      if (existingBowerIndex >= 0) {
                        // Update existing bower
                        const updatedBowers = bowersList.map((b: any) =>
                          b.id === bowerToPreview.id 
                            ? { ...b, name: editedName, feeds: bowerFeeds } 
                            : b
                        );
                        localStorage.setItem('bowers', JSON.stringify(updatedBowers));
                        const bowersWithDates = updatedBowers.map((bower: any) => ({
                          ...bower,
                          createdAt: new Date(bower.createdAt)
                        }));
                        setBowers(bowersWithDates);
                      } else {
                        // New bower - add to list
                        const newBower = {
                          ...bowerToPreview,
                          name: editedName,
                          feeds: bowerFeeds
                        };
                        const updatedBowers = [...bowersList, newBower];
                        localStorage.setItem('bowers', JSON.stringify(updatedBowers));
                        const bowersWithDates = updatedBowers.map((bower: any) => ({
                          ...bower,
                          createdAt: new Date(bower.createdAt)
                        }));
                        setBowers(bowersWithDates);
                      }
                    }
                    // Show save toast
                    setSaveToast(true);
                    setTimeout(() => setSaveToast(false), 3000);
                    
                    setPreviewModalOpen(false)
                    setBowerToPreview(null)
                    setIsShowingPreview(false)
                  }}
                  className="px-6 py-2 rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: colors.accent, color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  {language === 'ja' ? '保存' : 'Save'}
                </button>
              </div>
              )}
            </div>
            )}
            
            {/* Preview Footer */}
            {isShowingPreview && (
            <div className="flex gap-3 justify-end p-6 border-t">
              <button
                onClick={() => setIsShowingPreview(false)}
                className="px-6 py-2 rounded-lg transition-colors font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {language === 'ja' ? '戻る' : 'Back'}
              </button>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Save Toast */}
      {saveToast && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg animate-slide-down"
          style={{ backgroundColor: colors.primary, color: 'white' }}
        >
          <p className="font-medium flex items-center gap-2">
            <span>✓</span>
            <span>{t.saved}</span>
          </p>
        </div>
      )}

    </Layout>
  )
}