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

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for authentication
  }

  try {
    const response = await fetch(url, { ...defaultOptions, ...options })
    
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

  // Get feed preview
  async previewFeed(url: string) {
    return apiRequest<any>(`/feeds/preview?url=${encodeURIComponent(url)}`)
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