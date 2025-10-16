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

// Get auth token from Cognito
async function getAuthToken(): Promise<string | null> {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    console.log("Failed to get auth token:", error);
    return null;
  }
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { skipAutoRedirect?: boolean } = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  const { skipAutoRedirect, ...fetchOptions } = options
  
  // Get auth token and add to headers
  const token = await getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
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
      // Only auto-redirect if not explicitly skipped (e.g., during login)
      if (!skipAutoRedirect && typeof window !== 'undefined') {
        // Sign out from Cognito and redirect
        try {
          const { signOut } = await import('aws-amplify/auth');
          await signOut();
        } catch (error) {
          console.log("Failed to sign out:", error);
        }
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

  // Get articles for a specific bower
  async getBowerArticles(bowerId: string, limit: number = 50) {
    return apiRequest<any[]>(`/articles?bower_id=${bowerId}&limit=${limit}`)
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
}

// Export the ApiError class for error handling
export { ApiError }