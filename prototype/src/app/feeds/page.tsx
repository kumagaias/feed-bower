"use client";

import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { useTranslation } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import ArticleCard from "@/components/ArticleCard";

export default function FeedsPage() {
  const { language, bowers, chickStats, setChickStats, user, addLikedArticle, removeLikedArticle } = useApp();
  const t = useTranslation(language);
  const router = useRouter();
  const [selectedBower, setSelectedBower] = useState<string>("all");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set());
  const [displayedCount, setDisplayedCount] = useState(50);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Check URL parameters for bower selection and preview mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const bowerParam = params.get('bower');
      const previewParam = params.get('preview');
      
      if (bowerParam) {
        // URL parameter takes priority
        setSelectedBower(decodeURIComponent(bowerParam));
      } else {
        // Default to "all"
        setSelectedBower("all");
      }
      
      // Set preview mode
      setIsPreviewMode(previewParam === 'true');
    }
  }, []);

  // Redirect to home if not logged in
  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  // Don't render if not logged in
  if (!user) {
    return null;
  }

  // Mock articles data - only show if bowers exist
  const generateMockArticles = () => {
    if (bowers.length === 0) return [];
    
    const titles = [
      "Next.js 15の新機能について", "AI技術の最新動向", "React 19のリリース予定",
      "TypeScript 5.0の新機能", "Webパフォーマンス最適化のベストプラクティス",
      "モダンCSS技術の進化", "GraphQLとREST APIの比較", "Docker入門ガイド",
      "Kubernetes実践テクニック", "マイクロサービスアーキテクチャ設計",
      "セキュリティ対策の基礎", "クラウドネイティブ開発", "CI/CDパイプライン構築",
      "テスト駆動開発のすすめ", "アジャイル開発手法", "デザインシステム構築",
      "アクセシビリティ対応", "PWA開発入門", "WebAssembly活用法",
      "サーバーレスアーキテクチャ", "エッジコンピューティング", "機械学習入門",
      "データ分析の基礎", "ブロックチェーン技術", "IoT開発ガイド",
      "AR/VR開発入門", "ゲーム開発基礎", "モバイルアプリ開発", "クロスプラットフォーム開発",
      "UI/UXデザイン原則", "フロントエンド最適化", "バックエンド設計パターン",
      "データベース設計", "NoSQL入門", "Redis活用法", "Elasticsearch実践",
      "メッセージキュー活用", "リアルタイム通信", "WebSocket実装", "gRPC入門"
    ];
    
    const contents = [
      "最新の技術動向と実装方法について詳しく解説します...",
      "実践的なコード例とともに、ベストプラクティスを紹介します...",
      "初心者から上級者まで役立つ情報をまとめました...",
      "パフォーマンスとセキュリティを考慮した実装方法を解説...",
      "実際のプロジェクトで使える実践的なテクニックを紹介..."
    ];
    
    const bowerNames = bowers.map(b => b.name);
    const images = [
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=250&fit=crop",
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=250&fit=crop"
    ];
    
    const articles = [];
    const startDate = new Date("2024-10-09");
    
    for (let i = 0; i < 101; i++) {
      const daysAgo = Math.floor(i / 5); // 5 articles per day
      const publishDate = new Date(startDate);
      publishDate.setDate(publishDate.getDate() - daysAgo);
      
      articles.push({
        id: `${i + 1}`,
        feedId: `feed-${i + 1}`,
        title: `${titles[i % titles.length]} ${i > titles.length ? `(${Math.floor(i / titles.length) + 1})` : ''}`,
        content: contents[i % contents.length],
        url: `https://example.com/article-${i + 1}`,
        publishedAt: publishDate,
        liked: i % 10 === 0, // Every 10th article is liked
        bower: bowerNames[i % bowerNames.length],
        read: false,
        image: images[i % images.length],
      });
    }
    
    return articles;
  };

  const mockArticles = generateMockArticles();

  const [articles, setArticles] = useState(
    mockArticles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
  );

  // Load read articles and checked days from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const readArticles = localStorage.getItem('readArticles');
      if (readArticles) {
        try {
          const readIds = JSON.parse(readArticles);
          setArticles(prev => prev.map(article => ({
            ...article,
            read: readIds.includes(article.id)
          })));
        } catch (e) {
          console.error('Failed to parse read articles', e);
        }
      }
      
      // Initialize checkedDays from history
      const checkedDatesHistory = localStorage.getItem('checkedDatesHistory');
      if (checkedDatesHistory) {
        try {
          const history = JSON.parse(checkedDatesHistory);
          setChickStats(prev => ({
            ...prev,
            checkedDays: history.length
          }));
        } catch (e) {
          console.error('Failed to parse checked dates history', e);
        }
      }
    }
  }, [setChickStats]);

  const handleArticleClick = (articleId: string, url: string) => {
    // Mark as read
    setArticles(prev => prev.map(article => 
      article.id === articleId ? { ...article, read: true } : article
    ));

    // Save to localStorage
    if (typeof window !== 'undefined') {
      const readArticles = localStorage.getItem('readArticles');
      let readIds = [];
      if (readArticles) {
        try {
          readIds = JSON.parse(readArticles);
        } catch (e) {
          console.error('Failed to parse read articles', e);
        }
      }
      if (!readIds.includes(articleId)) {
        readIds.push(articleId);
        localStorage.setItem('readArticles', JSON.stringify(readIds));
      }
    }

    // Open link
    window.open(url, '_blank');
  };

  const handleToggleRead = (articleId: string) => {
    // Toggle read status
    setArticles(prev => prev.map(article => 
      article.id === articleId ? { ...article, read: false } : article
    ));

    // Remove from localStorage
    if (typeof window !== 'undefined') {
      const readArticles = localStorage.getItem('readArticles');
      if (readArticles) {
        try {
          let readIds = JSON.parse(readArticles);
          readIds = readIds.filter((id: string) => id !== articleId);
          localStorage.setItem('readArticles', JSON.stringify(readIds));
        } catch (e) {
          console.error('Failed to update read articles', e);
        }
      }
    }
  };

  const handleLike = (articleId: string) => {
    setArticles((prev) =>
      prev.map((article) => {
        if (article.id === articleId) {
          const newLiked = !article.liked;
          if (newLiked) {
            // Add to liked articles
            addLikedArticle({
              id: article.id,
              title: article.title,
              url: article.url,
              likedAt: new Date(),
              bower: article.bower
            });
            // Update chick stats
            setChickStats({
              ...chickStats,
              totalLikes: chickStats.totalLikes + 1,
              experience: chickStats.experience + 1,
              level: Math.floor((chickStats.totalLikes + 1) / 10) + 1,
              nextLevelExp:
                (Math.floor((chickStats.totalLikes + 1) / 10) + 1) * 10,
              checkedDays: chickStats.checkedDays,
            });
          } else {
            // Remove from liked articles
            removeLikedArticle(article.id);
            setChickStats({
              ...chickStats,
              totalLikes: Math.max(0, chickStats.totalLikes - 1),
              experience: Math.max(0, chickStats.experience - 1),
              checkedDays: chickStats.checkedDays,
            });
          }
          return { ...article, liked: newLiked };
        }
        return article;
      })
    );
  };

  const handleToggleCheckDate = (dateKey: string, articleIds: string[]) => {
    const isCurrentlyChecked = checkedDates.has(dateKey);

    if (isCurrentlyChecked) {
      // Uncheck: Mark all articles as unread
      setArticles(prev => prev.map(article => 
        articleIds.includes(article.id) ? { ...article, read: false } : article
      ));

      // Remove from checked dates
      setCheckedDates(prev => {
        const newSet = new Set(prev);
        newSet.delete(dateKey);
        return newSet;
      });

      // Remove from localStorage
      if (typeof window !== 'undefined') {
        const readArticles = localStorage.getItem('readArticles');
        if (readArticles) {
          try {
            let readIds = JSON.parse(readArticles);
            readIds = readIds.filter((id: string) => !articleIds.includes(id));
            localStorage.setItem('readArticles', JSON.stringify(readIds));
          } catch (e) {
            console.error('Failed to update read articles', e);
          }
        }
        
        // DO NOT remove from checkedDatesHistory - keep it permanent to prevent re-earning experience
      }
    } else {
      // Check: Mark all articles as read
      setArticles(prev => prev.map(article => 
        articleIds.includes(article.id) ? { ...article, read: true } : article
      ));

      // Add to checked dates
      setCheckedDates(prev => new Set(prev).add(dateKey));

      // Save to localStorage
      if (typeof window !== 'undefined') {
        const readArticles = localStorage.getItem('readArticles');
        let readIds = [];
        if (readArticles) {
          try {
            readIds = JSON.parse(readArticles);
          } catch (e) {
            console.error('Failed to parse read articles', e);
          }
        }
        articleIds.forEach(id => {
          if (!readIds.includes(id)) {
            readIds.push(id);
          }
        });
        localStorage.setItem('readArticles', JSON.stringify(readIds));
        
        // Save to checkedDatesHistory (only if not already checked before)
        const checkedDatesHistory = localStorage.getItem('checkedDatesHistory');
        let history: string[] = [];
        if (checkedDatesHistory) {
          try {
            history = JSON.parse(checkedDatesHistory);
          } catch (e) {
            console.error('Failed to parse checked dates history', e);
          }
        }
        
        // Only add experience and increment checkedDays if this date was never checked before
        const isFirstTimeCheck = !history.includes(dateKey);
        if (isFirstTimeCheck) {
          history.push(dateKey);
          localStorage.setItem('checkedDatesHistory', JSON.stringify(history));
          
          // Update chick stats (+1 experience for marking as read)
          setChickStats({
            ...chickStats,
            experience: chickStats.experience + 1,
            level: Math.floor((chickStats.experience + 1) / 10) + 1,
            nextLevelExp: (Math.floor((chickStats.experience + 1) / 10) + 1) * 10,
            checkedDays: chickStats.checkedDays + 1,
          });
        }
      }
    }
  };

  const filteredArticles = (() => {
    if (selectedBower === "my" || selectedBower === "all") {
      return articles;
    } else if (selectedBower === "liked") {
      // Show only liked articles
      return articles.filter(article => article.liked);
    } else if (selectedBower === "recommended") {
      // Show recommended articles (mock)
      return [];
    } else {
      // Filter by bower name
      const bower = bowers.find(b => b.name === selectedBower);
      return bower ? articles.filter(article => article.bower === bower.name) : articles;
    }
  })();

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
        placeholder={language === 'ja' ? '記事を検索...' : 'Search articles...'}
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

  // Filter articles by search query
  const searchFilteredArticles = searchQuery.trim()
    ? filteredArticles.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredArticles;

  // Infinite scroll: Load more articles
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && displayedCount < searchFilteredArticles.length) {
          setIsLoadingMore(true);
          // Simulate loading delay
          setTimeout(() => {
            setDisplayedCount(prev => prev + 50);
            setIsLoadingMore(false);
          }, 1000);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [isLoadingMore, displayedCount, searchFilteredArticles.length]);

  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCount(50);
  }, [selectedBower, searchQuery]);

  // Get displayed articles (limited by displayedCount)
  const displayedArticles = searchFilteredArticles.slice(0, displayedCount);

  return (
    <Layout searchBar={searchBar}>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="hidden md:block py-4">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                {t.feeds}
              </h1>
              {/* Bower Selector Dropdown */}
              <select
                value={selectedBower === "my" || selectedBower === "liked" ? "all" : selectedBower}
                onChange={(e) => setSelectedBower(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors text-sm font-medium"
                style={{ outline: 'none' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#14b8a6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              >
                <option value="all">{language === 'ja' ? 'すべて' : 'All'}</option>
                {bowers.map((bower) => (
                  <option key={bower.id} value={bower.name}>
                    🪺 {bower.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-accent)' }}>
              {language === "ja"
                ? "バウアーごとに整理されたフィードで、最新の情報をチェックしましょう"
                : "Check the latest information with feeds organized by bower"}
            </p>
          </div>

          <div className="mb-6 md:hidden">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>{t.feeds}</h1>
              {/* Mobile Bower Selector */}
              <select
                value={selectedBower === "my" || selectedBower === "liked" ? "all" : selectedBower}
                onChange={(e) => setSelectedBower(e.target.value)}
                className="px-3 py-1.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors text-sm font-medium"
                style={{ outline: 'none' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#14b8a6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              >
                <option value="all">{language === 'ja' ? 'すべて' : 'All'}</option>
                {bowers.map((bower) => (
                  <option key={bower.id} value={bower.name}>
                    🪺 {bower.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Feed Tabs - Centered */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute bottom-0 left-0 right-0 border-b-2 border-gray-200"></div>
              <div className="flex justify-center relative">
                <div className="inline-flex">
                  <button
                    onClick={() => setSelectedBower("all")}
                    className={`px-6 py-3 font-semibold transition-all whitespace-nowrap text-base ${
                      selectedBower === "all"
                        ? "border-b-2 -mb-0.5"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    style={selectedBower === "all" ? { borderColor: '#14b8a6', color: '#14b8a6' } : {}}
                  >
                    {language === "ja" ? "すべて" : "All"}
                  </button>
                  
                  <button
                    onClick={() => setSelectedBower("my")}
                    className={`px-6 py-3 font-semibold transition-all whitespace-nowrap text-base ${
                      selectedBower === "my"
                        ? "border-b-2 -mb-0.5"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    style={selectedBower === "my" ? { borderColor: '#14b8a6', color: '#14b8a6' } : {}}
                  >
                    {language === "ja" ? "重要" : "Important"}
                  </button>
                  
                  <button
                    onClick={() => setSelectedBower("liked")}
                    className={`px-6 py-3 font-semibold transition-all whitespace-nowrap text-base ${
                      selectedBower === "liked"
                        ? "border-b-2 -mb-0.5"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    style={selectedBower === "liked" ? { borderColor: '#14b8a6', color: '#14b8a6' } : {}}
                  >
                    {language === "ja" ? "お気に入り" : "Favorites"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {(() => {
              // Show date separators only when NOT on "my" or "liked" tabs
              const showDateSeparators = selectedBower !== "my" && selectedBower !== "liked";
              
              if (!showDateSeparators) {
                // No date grouping for "my" and "liked" tabs
                return displayedArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    language={language}
                    isPreviewMode={isPreviewMode}
                    onArticleClick={handleArticleClick}
                    onToggleRead={handleToggleRead}
                    onLike={handleLike}
                    t={t}
                  />
                ));
              }
              
              // Group articles by date for "all" tab and bower-specific views
              const groupedByDate: { [key: string]: typeof displayedArticles } = {};
              displayedArticles.forEach(article => {
                const dateKey = article.publishedAt.toLocaleDateString(
                  language === "ja" ? "ja-JP" : "en-US",
                  { year: 'numeric', month: 'long', day: 'numeric' }
                );
                if (!groupedByDate[dateKey]) {
                  groupedByDate[dateKey] = [];
                }
                groupedByDate[dateKey].push(article);
              });
              
              return Object.entries(groupedByDate).map(([dateKey, articles], index) => {
                const isCollapsed = collapsedDates.has(dateKey);
                const isFirstDate = index === 0;
                
                return (
                <div key={dateKey}>
                  {/* Date Separator - Clickable (no lines) */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const isChecked = checkedDates.has(dateKey);
                        return (
                          <div 
                            className="px-5 py-2 text-sm font-bold text-white rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer" 
                            style={{ backgroundColor: isChecked ? '#505050' : '#14b8a6' }}
                            onClick={() => {
                              setCollapsedDates(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(dateKey)) {
                                  newSet.delete(dateKey);
                                } else {
                                  newSet.add(dateKey);
                                }
                                return newSet;
                              });
                            }}
                          >
                            <span className="text-xs">{isCollapsed ? '▶' : '▼'}</span>
                            <span>{dateKey}</span>
                            <span className="text-xs bg-white bg-opacity-30 px-2 py-0.5 rounded-full">
                              {articles.length}
                            </span>
                          </div>
                        );
                      })()}
                      {!isPreviewMode && (() => {
                        const isChecked = checkedDates.has(dateKey);
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCheckDate(dateKey, articles.map(a => a.id));
                            }}
                            className="w-10 h-10 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center text-2xl border-none"
                            style={{
                              backgroundColor: 'transparent',
                              color: isChecked ? '#505050' : '#14b8a6',
                              cursor: 'pointer'
                            }}
                          >
                            {t.markAllAsRead}
                          </button>
                        );
                      })()}
                    </div>
                    
                    {/* Collapse/Expand All Button - Only on first date */}
                    {isFirstDate && (
                      <button
                        onClick={() => {
                          if (collapsedDates.size === 0) {
                            // Collapse all: Get all unique dates from displayed articles
                            const allDates = new Set<string>();
                            displayedArticles.forEach(article => {
                              const dateKey = article.publishedAt.toLocaleDateString(
                                language === "ja" ? "ja-JP" : "en-US",
                                { year: 'numeric', month: 'long', day: 'numeric' }
                              );
                              allDates.add(dateKey);
                            });
                            setCollapsedDates(allDates);
                          } else {
                            // Expand all
                            setCollapsedDates(new Set());
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        {collapsedDates.size === 0 ? t.collapseAll : t.expandAll}
                      </button>
                    )}
                  </div>
                  
                  {/* Articles for this date */}
                  {!isCollapsed && (
                  <div className="space-y-6">
                    {articles.map((article) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        language={language}
                        isPreviewMode={isPreviewMode}
                        onArticleClick={handleArticleClick}
                        onToggleRead={handleToggleRead}
                        onLike={handleLike}
                        t={t}
                      />
                    ))}
                  </div>
                  )}
                </div>
              )})})()}
          </div>
          
          {/* Infinite Scroll Loading Indicator */}
          {displayedCount < searchFilteredArticles.length && (
            <div ref={loadMoreRef} className="flex justify-center items-center py-8">
              {isLoadingMore && (
                <div className="flex flex-col items-center gap-3">
                  <div className="text-4xl animate-bounce">🐣</div>
                  <p className="text-sm text-gray-500">
                    {language === "ja" ? "読み込み中..." : "Loading..."}
                  </p>
                </div>
              )}
            </div>
          )}

          {searchFilteredArticles.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🪺</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {searchQuery.trim()
                  ? language === "ja"
                    ? "検索結果が見つかりません"
                    : "No search results found"
                  : bowers.length === 0
                  ? language === "ja"
                    ? "バウアーがありません"
                    : "No bowers yet"
                  : language === "ja"
                  ? "フィードがありません"
                  : "No feeds found"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery.trim()
                  ? language === "ja"
                    ? "別のキーワードで検索してみてください"
                    : "Try searching with different keywords"
                  : bowers.length === 0
                  ? language === "ja"
                    ? "最初のバウアーを作成して、AIにフィードを見つけてもらいましょう"
                    : "Create your first bower and let AI find feeds for you"
                  : language === "ja"
                  ? "バウアーを作成してフィードを追加しましょう"
                  : "Create a bower to add feeds"}
              </p>
              {bowers.length === 0 && (
                <button
                  onClick={() => router.push("/bowers?create=true")}
                  className="inline-flex items-center px-6 py-3 rounded-lg transition-colors font-semibold"
                  style={{ backgroundColor: '#f59e0b', color: '#FFFFFF' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#14b8a6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
                >
                  <span className="mr-2">🪺</span>
                  {language === "ja" ? "バウアーを作成" : "Create Bower"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
