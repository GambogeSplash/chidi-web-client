// API Client - Base HTTP client for external backend integration
class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: HeadersInit
  body?: any
  token?: string
}

class APIClient {
  private baseURL: string
  private defaultHeaders: HeadersInit
  public isDevelopmentMode: boolean
  private isRefreshing: boolean = false
  private refreshPromise: Promise<string> | null = null

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
    this.isDevelopmentMode = process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_API_BASE_URL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('chidi_auth_token')
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('chidi_refresh_token')
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = this.performTokenRefresh()

    try {
      const newToken = await this.refreshPromise
      return newToken
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken()
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: this.defaultHeaders,
        body: JSON.stringify({ refresh_token: refreshToken })
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const data = await response.json()
      
      // Store new tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('chidi_auth_token', data.access_token)
        localStorage.setItem('chidi_refresh_token', data.refresh_token)
      }

      return data.access_token
    } catch (error) {
      // Clear tokens on refresh failure
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_auth_token')
        localStorage.removeItem('chidi_refresh_token')
      }
      throw error
    }
  }

  private async handleResponse(response: Response) {
    const contentType = response.headers.get('content-type')
    const isJSON = contentType && contentType.includes('application/json')
    
    const data = isJSON ? await response.json() : await response.text()

    if (!response.ok) {
      throw new APIError(
        data?.message || data || 'Request failed',
        response.status,
        data
      )
    }

    return data
  }

  async request<T>(endpoint: string, options: RequestConfig = {}): Promise<T> {
    const { method = 'GET', headers = {}, body, token } = options
    
    // In development mode, log the API call
    if (this.isDevelopmentMode) {
      console.log(`🔧 [DEV] API Call: ${method} ${endpoint}`, body || '')
    }

    const url = `${this.baseURL}${endpoint}`
    let authToken = token || this.getAuthToken()
    
    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    } as Record<string, string>
    
    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`
    }

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
    }

    if (body && method !== 'GET') {
      requestConfig.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, requestConfig)
      
      // Handle token expiration
      if (response.status === 401 && authToken && !this.isRefreshing) {
        try {
          // Attempt to refresh token
          const newToken = await this.refreshAccessToken()
          
          // Retry request with new token
          const newHeaders = {
            ...requestHeaders,
            'Authorization': `Bearer ${newToken}`
          }
          
          const retryResponse = await fetch(url, {
            ...requestConfig,
            headers: newHeaders
          })
          
          return this.handleResponse(retryResponse)
        } catch (refreshError) {
          // If refresh fails, redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('chidi_auth_token')
            localStorage.removeItem('chidi_refresh_token')
            window.location.href = '/auth'
          }
          throw refreshError
        }
      }
      
      return this.handleResponse(response)
    } catch (error) {
      // Handle auth errors by clearing token
      if (error instanceof APIError && error.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('chidi_auth_token')
          localStorage.removeItem('chidi_refresh_token')
        }
      }
      throw error
    }
  }

  // Method to handle mock responses in development
  createMockResponse<T>(data: T): Promise<T> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('📦 [MOCK] Returning mock data:', data)
        resolve(data)
      }, 300) // Simulate network delay
    })
  }

  // Convenience methods with mock fallback
  async get<T>(endpoint: string, headers?: HeadersInit, mockData?: T): Promise<T> {
    try {
      return await this.request<T>(endpoint, { method: 'GET', headers })
    } catch (error) {
      if (this.isDevelopmentMode && mockData) {
        console.log(`🔄 [DEV] API failed, using mock data for GET ${endpoint}`)
        return this.createMockResponse(mockData)
      }
      throw error
    }
  }

  async post<T>(endpoint: string, body?: any, headers?: HeadersInit, mockData?: T): Promise<T> {
    try {
      return await this.request<T>(endpoint, { method: 'POST', body, headers })
    } catch (error) {
      if (this.isDevelopmentMode && mockData) {
        console.log(`🔄 [DEV] API failed, using mock data for POST ${endpoint}`)
        return this.createMockResponse(mockData)
      }
      throw error
    }
  }

  async put<T>(endpoint: string, body?: any, headers?: HeadersInit, mockData?: T): Promise<T> {
    try {
      return await this.request<T>(endpoint, { method: 'PUT', body, headers })
    } catch (error) {
      if (this.isDevelopmentMode && mockData) {
        console.log(`🔄 [DEV] API failed, using mock data for PUT ${endpoint}`)
        return this.createMockResponse(mockData)
      }
      throw error
    }
  }

  async patch<T>(endpoint: string, body?: any, headers?: HeadersInit, mockData?: T): Promise<T> {
    try {
      return await this.request<T>(endpoint, { method: 'PATCH', body, headers })
    } catch (error) {
      if (this.isDevelopmentMode && mockData) {
        console.log(`🔄 [DEV] API failed, using mock data for PATCH ${endpoint}`)
        return this.createMockResponse(mockData)
      }
      throw error
    }
  }

  async delete<T>(endpoint: string, headers?: HeadersInit, mockData?: T): Promise<T> {
    try {
      return await this.request<T>(endpoint, { method: 'DELETE', headers })
    } catch (error) {
      if (this.isDevelopmentMode && mockData) {
        console.log(`🔄 [DEV] API failed, using mock data for DELETE ${endpoint}`)
        return this.createMockResponse(mockData)
      }
      throw error
    }
  }
}

export const apiClient = new APIClient()
export { APIError }
