// Translation system
const translations = {
  ja: {
    // Common
    loading: '読み込み中...',
    error: 'エラーが発生しました',
    login: 'ログイン',
    logout: 'ログアウト',
    email: 'メールアドレス',
    password: 'パスワード',
    
    // Navigation
    feeds: 'フィード',
    bowers: 'バウアー',
    liked: 'いいね',
    
    // Landing page
    title: 'Feed Bower',
    subtitle: 'AIが見つける、あなただけのフィード',
    description: 'キーワードベースでRSSフィードを整理し、鳥の巣のように情報を育てます',
    getStarted: '始める',
    
    // Bower
    searchBowers: 'バウアーを検索...',
    myBowers: 'マイバウアー',
    preset: 'プリセット',
    edit: '編集',
    delete: '削除',
    public: '公開',
    private: '非公開',
    add: '追加',
    added: '追加済み',
    likes: 'いいね',
    
    // Articles
    readMore: '続きを読む',
    like: 'いいね',
    unlike: 'いいね解除',
    checked: 'チェック済',
    uncheck: 'チェック解除',
    searchArticles: '記事を検索...',
    allArticles: 'すべて',
    importantArticles: '重要',
    likedArticles: 'お気に入り',
    selectBower: 'バウアーを選択',
    allBowers: 'すべてのバウアー',
    openAll: '全て開く',
    closeAll: '全て閉じる',
    noArticles: '記事がありません',
    loadingArticles: '記事を読み込み中...',
    loadMore: 'さらに読み込む',
    
    // Chick
    chickLevel: 'ひよこレベル',
    totalLikes: '総いいね数',
    checkedDays: 'チェック日数',
    experience: '経験値',
    nextLevel: '次のレベルまで',
    
    // Auth
    authRequired: '認証が必要です',
    authFailed: '認証に失敗しました',
    tokenVerificationFailed: 'トークンの検証に失敗しました',
    invalidResponse: '無効なレスポンスです',
    invalidCredentials: '正しいメールアドレスまたはパスワードを入力してください'
  },
  en: {
    // Common
    loading: 'Loading...',
    error: 'An error occurred',
    login: 'Login',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    
    // Navigation
    feeds: 'Feeds',
    bowers: 'Bowers',
    liked: 'Liked',
    
    // Landing page
    title: 'Feed Bower',
    subtitle: 'AI-powered personalized RSS feed experience',
    description: 'Organize RSS feeds by keywords and grow information like a bird\'s nest',
    getStarted: 'Get Started',
    
    // Bower
    searchBowers: 'Search bowers...',
    myBowers: 'My Bowers',
    preset: 'Preset',
    edit: 'Edit',
    delete: 'Delete',
    public: 'Public',
    private: 'Private',
    add: 'Add',
    added: 'Added',
    likes: 'Likes',
    
    // Articles
    readMore: 'Read more',
    like: 'Like',
    unlike: 'Unlike',
    checked: 'Checked',
    uncheck: 'Uncheck',
    searchArticles: 'Search articles...',
    allArticles: 'All',
    importantArticles: 'Important',
    likedArticles: 'Liked',
    selectBower: 'Select Bower',
    allBowers: 'All Bowers',
    openAll: 'Open All',
    closeAll: 'Close All',
    noArticles: 'No articles found',
    loadingArticles: 'Loading articles...',
    loadMore: 'Load More',
    
    // Chick
    chickLevel: 'Chick Level',
    totalLikes: 'Total Likes',
    checkedDays: 'Checked Days',
    experience: 'Experience',
    nextLevel: 'To Next Level',
    
    // Auth
    authRequired: 'Authentication required',
    authFailed: 'Authentication failed',
    tokenVerificationFailed: 'Token verification failed',
    invalidResponse: 'Invalid response',
    invalidCredentials: 'Please enter a valid email address or password'
  }
} as const

export const useTranslation = (language: 'ja' | 'en') => {
  return {
    ...translations[language],
    // Fallback function for dynamic keys
    t: (key: string) => translations[language][key as keyof typeof translations[typeof language]] || key
  }
}