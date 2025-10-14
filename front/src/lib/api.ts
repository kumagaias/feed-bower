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

// Get auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('feed-bower-token')
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  // Get auth token and add to headers
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  // Merge with provided headers
  if (options.headers) {
    Object.assign(headers, options.headers)
  }
  
  const defaultOptions: RequestInit = {
    headers,
    credentials: 'include', // Include cookies for authentication
  }

  try {
    const response = await fetch(url, { ...defaultOptions, ...options })
    
    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      // Clear auth data and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('feed-bower-token')
        localStorage.removeItem('feed-bower-user')
        localStorage.removeItem('feed-bower-token-expiry')
        window.location.href = '/'
      }
      throw new ApiError(401, 'Authentication required')
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    const data = await response.json()
    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // Network or other errors
    throw new ApiError(0, error instanceof Error ? error.message : 'Network error')
  }
}

// Bower API functions
export const bowerApi = {
  // Get all bowers for the current user
  async getBowers() {
    return apiRequest<any[]>('/bowers')
  },

  // Create a new bower
  async createBower(bower: {
    name: string
    keywords: string[]
    is_public?: boolean
  }) {
    return apiRequest<any>('/bowers', {
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
}

// Auth API functions
export const authApi = {
  // Get current user info
  async getMe() {
    return apiRequest<any>('/auth/me')
  },

  // Login
  async login(email: string, password: string) {
    return apiRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },



  // Logout
  async logout() {
    return apiRequest<void>('/auth/logout', {
      method: 'POST',
    })
  },
}

// Export the ApiError class for error handling
export { ApiError }