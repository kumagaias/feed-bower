// API utility functions for Feed Bower application

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

// API response types
interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// Error handling utility
class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

// Get auth token from AuthContext
async function getAuthToken(): Promise<string | null> {
  try {
    // Import the getAuthToken function from AuthContext
    const { getAuthToken: getAuthTokenFromContext } = await import('@/contexts/AuthContext');
    const token = await getAuthTokenFromContext();
    console.log('🔐 Auth token status:', token ? 'Token available' : 'No token');
    return token;
  } catch (error) {
    console.log("❌ Failed to get auth token:", error);
    return null;
  }
}

// Check if we're in development mode and backend is not available
const isDevelopment = process.env.NODE_ENV === 'development'

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { skipAutoRedirect?: boolean } = {}
): Promise<T | null> {
  const url = `${API_BASE_URL}${endpoint}`
  const { skipAutoRedirect, ...fetchOptions } = options
  
  // Get auth token and add to headers
  const token = await getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  console.log('🔍 API Request Debug:', {
    endpoint,
    tokenExists: !!token,
    tokenLength: token?.length || 0,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'null'
  });
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
    console.log('✅ Authorization header added to request')
  } else {
    console.log('⚠️ No authorization token available')
  }
  
  // Merge with provided headers
  if (fetchOptions.headers) {
    Object.assign(headers, fetchOptions.headers)
  }
  
  const defaultOptions: RequestInit = {
    headers,
    credentials: 'include', // Include cookies for authentication
  }

  try {
    const response = await fetch(url, { ...defaultOptions, ...fetchOptions })
    
    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      console.log('❌ 401 Unauthorized response from API');
      
      // Don't auto-redirect during login or if explicitly skipped
      if (!skipAutoRedirect && typeof window !== 'undefined') {
        console.log('🔄 Auto-redirect disabled to prevent infinite loop');
        // Instead of auto-redirect, just log the error
        // The UI components should handle the 401 error appropriately
      }
      throw new ApiError(401, 'Authentication required')
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        errorData: errorData
      })
      throw new ApiError(
        response.status,
        errorData.message || errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    // Handle 204 No Content responses (no JSON body)
    if (response.status === 204) {
      return null
    }
    
    const responseData = await response.json()
    
    // Handle backend API response format: { success: true, data: ... }
    if (responseData.success && responseData.data !== undefined) {
      return responseData.data
    }
    
    // Fallback for other response formats
    return responseData
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // In development mode, if backend has errors, return mock data for certain endpoints
    if (isDevelopment && (error instanceof ApiError && error.status >= 500)) {
      console.warn(`Backend error (${error.status}) for ${endpoint}, using mock data`)
      return getMockData(endpoint, fetchOptions.method || 'GET') as T
    }
    
    if (isDevelopment && (error instanceof Error && (error.message.includes('fetch') || error.message.includes('Failed to fetch')))) {
      console.warn(`Backend not available for ${endpoint}, using mock data`)
      return getMockData(endpoint, fetchOptions.method || 'GET') as T
    }
    
    // Network or other errors
    throw new ApiError(0, error instanceof Error ? error.message : 'Network error')
  }
}

// Mock data structure for consistent relationships
const mockUser = {
  user_id: 'mock-user-1',
  email: 'dev@feed-bower.local',
  name: 'Development User',
  created_at: Date.now() - 604800000, // 1 week ago
};

const mockBowers = [
  {
    bower_id: 'mock-bower-1',
    user_id: mockUser.user_id,
    name: 'Tech News',
    keywords: ['AI', 'プログラミング'],
    color: '#14b8a6',
    is_public: false,
    created_at: Date.now() - 86400000, // 1 day ago
    feeds: [
      {
        feed_id: 'mock-feed-1',
        bower_id: 'mock-bower-1',
        url: 'https://example.com/tech-feed.xml',
        title: 'Tech Blog',
        description: 'Latest tech news and programming articles'
      },
      {
        feed_id: 'mock-feed-2',
        bower_id: 'mock-bower-1',
        url: 'https://example.com/ai-feed.xml',
        title: 'AI Research',
        description: 'Latest AI and machine learning research'
      }
    ]
  }
];

// Mock data for development when backend is not available
function getMockData(endpoint: string, method: string): any {
  // Mock user data
  if (endpoint === '/user' && method === 'GET') {
    return mockUser;
  }

  // Mock bowers data (reduced to 1/3)
  if (endpoint === '/bowers' && method === 'GET') {
    return mockBowers;
  }

  // Mock feeds data
  if (endpoint === '/feeds' && method === 'GET') {
    const urlParams = new URLSearchParams(endpoint.split('?')[1] || '');
    const bowerId = urlParams.get('bower_id');
    
    if (bowerId) {
      const bower = mockBowers.find(b => b.bower_id === bowerId);
      return bower ? bower.feeds : [];
    }
    
    // Return all feeds if no bower_id specified
    return mockBowers.flatMap(bower => bower.feeds);
  }
  
  // Mock articles data (60 articles) - properly linked to feeds and bowers
  if (endpoint.startsWith('/articles') && method === 'GET' && !endpoint.includes('/liked')) {
    const generateMockArticles = () => {
      const topics = [
        'Next.js', 'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'AI', 'Machine Learning',
        'Web Development', 'Mobile Development', 'DevOps', 'Cloud Computing', 'Database', 'Security',
        'UI/UX', 'Performance', 'Testing', 'API', 'GraphQL', 'Docker'
      ];
      
      const colors = ['14b8a6', 'f59e0b', '3b82f6', '8b5cf6', '10b981', 'ef4444', '6366f1', 'f97316'];
      const feeds = ['mock-feed-1', 'mock-feed-2'];
      
      const articles = [];
      
      for (let i = 1; i <= 60; i++) {
        const topic = topics[(i - 1) % topics.length];
        const color = colors[(i - 1) % colors.length];
        const feedId = feeds[(i - 1) % feeds.length];
        const hoursAgo = Math.floor(Math.random() * 168) + 1; // 1-168 hours ago (1 week)
        
        // AI/ML topics go to AI feed, others to Tech feed
        const assignedFeedId = ['AI', 'Machine Learning'].includes(topic) ? 'mock-feed-2' : 'mock-feed-1';
        const feedTitle = assignedFeedId === 'mock-feed-2' ? 'AI Research' : 'Tech Blog';
        
        articles.push({
          article_id: `mock-article-${i}`,
          feed_id: assignedFeedId,
          bower_id: 'mock-bower-1',
          user_id: mockUser.user_id,
          title: `${topic}の最新動向と実践的な活用法 #${i}`,
          content: `${topic}に関する最新の技術動向と実践的な活用方法について詳しく解説します。開発者にとって重要なポイントや、実際のプロジェクトでの応用例を交えながら、効果的な学習方法を紹介します。`,
          url: `https://example.com/articles/${topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
          published_at: Date.now() - (hoursAgo * 3600000),
          bower: 'Tech News',
          feed_title: feedTitle,
          liked: Math.random() > 0.7, // 30% chance of being liked
          read: Math.random() > 0.6,  // 40% chance of being read
          image_url: `https://via.placeholder.com/128x96/${color}/ffffff?text=${encodeURIComponent(topic)}`
        });
      }
      
      return articles;
    };
    
    const mockArticles = generateMockArticles();
    
    // Check if this is for important articles (recent articles from last 24 hours)
    const urlParams = new URLSearchParams(endpoint.split('?')[1] || '')
    const isImportant = urlParams.get('important') === 'true'
    
    let filteredArticles = mockArticles
    
    if (isImportant) {
      // Filter to recent articles (last 24 hours)
      const oneDayAgo = Date.now() - 86400000
      filteredArticles = mockArticles.filter(article => article.published_at > oneDayAgo)
    }
    
    return {
      articles: filteredArticles,
      total: filteredArticles.length,
      has_more: false
    }
  }
  
  // Mock liked articles
  if (endpoint === '/articles/liked' && method === 'GET') {
    // Generate liked articles from the main mock articles
    const generateMockArticles = () => {
      const topics = [
        'Next.js', 'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'AI', 'Machine Learning',
        'Web Development', 'Mobile Development', 'DevOps', 'Cloud Computing', 'Database', 'Security',
        'UI/UX', 'Performance', 'Testing', 'API', 'GraphQL', 'Docker'
      ];
      
      const colors = ['14b8a6', 'f59e0b', '3b82f6', '8b5cf6', '10b981', 'ef4444', '6366f1', 'f97316'];
      
      const articles = [];
      
      for (let i = 1; i <= 60; i++) {
        const topic = topics[(i - 1) % topics.length];
        const color = colors[(i - 1) % colors.length];
        const hoursAgo = Math.floor(Math.random() * 168) + 1;
        
        articles.push({
          article_id: `mock-article-${i}`,
          feed_id: 'mock-feed-1',
          title: `${topic}の最新動向と実践的な活用法 #${i}`,
          content: `${topic}に関する最新の技術動向と実践的な活用方法について詳しく解説します。`,
          url: `https://example.com/articles/${topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${i}`,
          published_at: Date.now() - (hoursAgo * 3600000),
          bower: 'Tech News',
          liked: Math.random() > 0.7,
          read: Math.random() > 0.6,
          image_url: `https://via.placeholder.com/128x96/${color}/ffffff?text=${encodeURIComponent(topic)}`
        });
      }
      
      return articles;
    };
    
    // Filter only liked articles (approximately 30% of all articles)
    const allArticles = generateMockArticles();
    const likedArticles = allArticles.filter(article => article.liked);
    
    return {
      articles: likedArticles,
      total: likedArticles.length,
      has_more: false
    }
  }
  
  // Mock chick stats
  if (endpoint === '/chick/stats' && method === 'GET') {
    return {
      total_likes: 5,
      level: 2,
      experience: 15,
      checked_days: 3
    }
  }
  
  // Mock feed recommendations
  if (endpoint === '/feeds/recommendations' && method === 'POST') {
    // キーワードベースのフィード推奨マップ (1/3に削減)
    const keywordFeedMap: Record<string, any[]> = {
      // 日本語キーワード
      'AI': [
        { url: 'https://ai.googleblog.com/feeds/posts/default', title: 'Google AI Blog', description: 'Latest AI research and developments' }
      ],
      'プログラミング': [
        { url: 'https://dev.to/feed', title: 'DEV Community', description: 'Programming articles and tutorials' }
      ],
      'テクノロジー': [
        { url: 'https://techcrunch.com/feed/', title: 'TechCrunch', description: 'Latest technology news' }
      ],
      // 英語キーワード
      'technology': [
        { url: 'https://techcrunch.com/feed/', title: 'TechCrunch', description: 'Latest technology news' }
      ],
      'programming': [
        { url: 'https://dev.to/feed', title: 'DEV Community', description: 'Programming articles and tutorials' }
      ]
    }

    // デフォルトのフィード（キーワードにマッチしない場合）
    const defaultFeeds = [
      {
        id: `mock-feed-${Date.now()}-default-1`,
        url: 'https://feeds.feedburner.com/TechCrunch',
        title: 'TechCrunch',
        description: 'Latest technology news and startup information',
        category: 'Technology',
        isCustom: false
      }
    ]

    // キーワードに基づいてフィードを選択
    const recommendations: any[] = []
    const usedUrls = new Set<string>()

    // 仮想的にキーワードを取得（実際のリクエストボディは解析できないため、一般的なキーワードを想定）
    const commonKeywords = ['AI', 'プログラミング']
    
    commonKeywords.forEach(keyword => {
      const feeds = keywordFeedMap[keyword] || []
      feeds.forEach((feed, index) => {
        if (!usedUrls.has(feed.url) && recommendations.length < 3) {
          recommendations.push({
            id: `mock-feed-${Date.now()}-${keyword}-${index}`,
            url: feed.url,
            title: feed.title,
            description: feed.description,
            category: keyword,
            isCustom: false
          })
          usedUrls.add(feed.url)
        }
      })
    })

    // 推奨フィードが少ない場合はデフォルトフィードを追加
    if (recommendations.length < 2) {
      defaultFeeds.forEach(feed => {
        if (!usedUrls.has(feed.url) && recommendations.length < 3) {
          recommendations.push(feed)
          usedUrls.add(feed.url)
        }
      })
    }
    
    return recommendations
  }
  
  // Default empty response
  return null
}

// Bower API functions
export const bowerApi = {
  // Get all bowers for the current user
  async getBowers() {
    console.log('🌐 Making API request to /bowers')
    const result = await apiRequest<any[]>('/bowers')
    console.log('📡 API response for /bowers:', result)
    return result
  },

  // Create a new bower
  async createBower(bower: {
    name: string
    keywords: string[]
    is_public?: boolean
    auto_register_feeds?: boolean
    max_auto_feeds?: number
  }) {
    return apiRequest<{
      bower: any
      auto_registered_feeds: number
      auto_register_errors: string[]
    }>('/bowers', {
      method: 'POST',
      body: JSON.stringify(bower),
    })
  },

  // Get a specific bower by ID
  async getBower(id: string) {
    return apiRequest<any>(`/bowers/${id}`)
  },

  // Update a bower
  async updateBower(id: string, bower: {
    name?: string
    keywords?: string[]
    is_public?: boolean
  }) {
    return apiRequest<any>(`/bowers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bower),
    })
  },

  // Delete a bower
  async deleteBower(id: string) {
    return apiRequest<void>(`/bowers/${id}`, {
      method: 'DELETE',
    })
  },
}

// Feed API functions
export const feedApi = {
  // Get feeds for a bower
  async getFeeds(bowerId?: string) {
    const query = bowerId ? `?bower_id=${bowerId}` : ''
    return apiRequest<any[]>(`/feeds${query}`)
  },

  // Add a feed to a bower
  async addFeed(feed: {
    bower_id: string
    url: string
    title?: string
    description?: string
  }) {
    return apiRequest<any>('/feeds', {
      method: 'POST',
      body: JSON.stringify(feed),
    })
  },

  // Delete a feed
  async deleteFeed(id: string) {
    return apiRequest<void>(`/feeds/${id}`, {
      method: 'DELETE',
    })
  },

  // Get feed preview by URL (for new feeds)
  async previewFeedByUrl(url: string) {
    return apiRequest<any>(`/feeds/preview-url?url=${encodeURIComponent(url)}`)
  },

  // Get feed preview by ID (for existing feeds)
  async previewFeed(feedId: string) {
    return apiRequest<any>(`/feeds/${feedId}/preview`)
  },

  // Get feed recommendations based on keywords
  async getFeedRecommendations(bowerID: string, keywords: string[]) {
    return apiRequest<any[]>('/feeds/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        bower_id: bowerID,
        keywords: keywords
      }),
    })
  },

  // Auto-register feeds to a bower based on keywords
  async autoRegisterFeeds(bowerId: string, keywords: string[], maxFeeds: number = 5) {
    return apiRequest<{
      added_feeds: any[]
      skipped_feeds: string[]
      failed_feeds: Array<{ url: string; reason: string }>
      summary: {
        total_added: number
        total_skipped: number
        total_failed: number
      }
    }>('/feeds/auto-register', {
      method: 'POST',
      body: JSON.stringify({
        bower_id: bowerId,
        keywords: keywords,
        max_feeds: maxFeeds
      }),
    })
  },

  // Get articles for a specific bower
  async getBowerArticles(bowerId: string, limit: number = 50) {
    return apiRequest<any[]>(`/articles?bower_id=${bowerId}&limit=${limit}`)
  },

  // Fetch feeds for a bower (trigger article fetching)
  async fetchBowerFeeds(bowerId: string) {
    return apiRequest<{
      total_feeds: number
      total_articles: number
      successful_feeds: number
      failed_feeds: number
    }>('/feeds/fetch-bower', {
      method: 'POST',
      body: JSON.stringify({ bower_id: bowerId }),
    })
  },
}

// Article API functions
export const articleApi = {
  // Get articles with pagination and filtering
  async getArticles(params: {
    bower_id?: string
    limit?: number
    offset?: number
    search?: string
    sort?: string
    order?: 'asc' | 'desc'
  } = {}) {
    const queryParams = new URLSearchParams()
    
    if (params.bower_id) queryParams.append('bower_id', params.bower_id)
    if (params.limit) queryParams.append('limit', params.limit.toString())
    if (params.offset) queryParams.append('offset', params.offset.toString())
    if (params.search) queryParams.append('search', params.search)
    if (params.sort) queryParams.append('sort', params.sort)
    if (params.order) queryParams.append('order', params.order)
    
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return apiRequest<{
      articles: any[]
      total: number
      has_more: boolean
    }>(`/articles${query}`)
  },

  // Get a specific article
  async getArticle(id: string) {
    return apiRequest<any>(`/articles/${id}`)
  },

  // Like an article
  async likeArticle(id: string) {
    return apiRequest<void>(`/articles/${id}/like`, {
      method: 'POST',
    })
  },

  // Unlike an article
  async unlikeArticle(id: string) {
    return apiRequest<void>(`/articles/${id}/like`, {
      method: 'DELETE',
    })
  },

  // Mark article as read
  async markAsRead(id: string) {
    return apiRequest<void>(`/articles/${id}/read`, {
      method: 'POST',
    })
  },

  // Get liked articles
  async getLikedArticles(limit: number = 50, offset: number = 0) {
    return apiRequest<{
      articles: any[]
      total: number
      has_more: boolean
    }>(`/articles/liked?limit=${limit}&offset=${offset}`)
  },
}

// Chick API functions
export const chickApi = {
  // Get chick stats
  async getStats() {
    return apiRequest<any>('/chick/stats')
  },

  // Update chick stats
  async updateStats(stats: {
    total_likes?: number
    level?: number
    experience?: number
    checked_days?: number
    checked_dates?: string[]
  }) {
    return apiRequest<any>('/chick/stats', {
      method: 'PUT',
      body: JSON.stringify(stats),
    })
  },

  // Get liked articles for chick modal
  async getLikedArticles() {
    return apiRequest<any[]>('/chick/liked-articles')
  },
}

// Auth API functions
export const authApi = {
  // Get current user info
  async getMe() {
    return apiRequest<any>('/auth/me')
  },

  // Register new user
  async register(email: string, password: string, name: string, language: string = 'ja') {
    return apiRequest<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, language }),
      skipAutoRedirect: true, // Don't auto-redirect on 401 during registration
    })
  },

  // Login
  async login(email: string, password: string) {
    return apiRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAutoRedirect: true, // Don't auto-redirect on 401 during login
    })
  },

  // Create guest user
  async createGuestUser(language: string = 'ja') {
    return apiRequest<any>('/auth/guest', {
      method: 'POST',
      body: JSON.stringify({ language }),
    })
  },

  // Logout
  async logout() {
    return apiRequest<void>('/auth/logout', {
      method: 'POST',
    })
  },

  // Update current user
  async updateMe(data: { name?: string; language?: string }) {
    return apiRequest<any>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete current user
  async deleteCurrentUser() {
    return apiRequest<void>('/auth/me', {
      method: 'DELETE',
    })
  },
}

// Export the ApiError class for error handling
export { ApiError }