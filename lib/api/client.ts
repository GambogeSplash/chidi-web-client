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
    
    // Log API client configuration
    console.log('🔧 [API-CLIENT] Initialized with config:', {
      baseURL: this.baseURL,
      isDevelopmentMode: this.isDevelopmentMode,
      defaultHeaders: this.defaultHeaders
    })
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

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      })
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
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    console.log('🔍 [RESPONSE-DEBUG] handleResponse called, response.ok:', response.ok)
    console.log('🔍 [RESPONSE-DEBUG] Response status:', response.status, response.statusText)
    
    if (response.ok) {
      const contentType = response.headers.get('content-type')
      console.log('🔍 [RESPONSE-DEBUG] Content-Type:', contentType)
      
      if (contentType && contentType.includes('application/json')) {
        try {
          console.log('🔍 [RESPONSE-DEBUG] About to parse JSON...')
          const jsonData = await response.json()
          console.log('🔍 [RESPONSE-DEBUG] Parsed JSON:', jsonData)
          console.log('🔍 [RESPONSE-DEBUG] JSON type:', typeof jsonData)
          console.log('🔍 [RESPONSE-DEBUG] JSON keys:', Object.keys(jsonData || {}))
          console.log('🔍 [RESPONSE-DEBUG] Returning JSON data...')
          return jsonData
        } catch (jsonError: any) {
          console.error('🚨 [RESPONSE-DEBUG] JSON parsing failed:', jsonError)
          console.error('🚨 [RESPONSE-DEBUG] JSON error stack:', jsonError.stack)
          
          // Try to get raw text to see what the response actually contains
          try {
            const responseClone = response.clone()
            const textFallback = await responseClone.text()
            console.log('🔍 [RESPONSE-DEBUG] Raw response text:', textFallback)
            console.log('🔍 [RESPONSE-DEBUG] Text length:', textFallback.length)
          } catch (textError) {
            console.error('🚨 [RESPONSE-DEBUG] Could not read response as text:', textError)
          }
          
          throw new Error(`JSON parsing failed: ${jsonError.message}`)
        }
      }
      
      console.log('🔍 [RESPONSE-DEBUG] Not JSON, reading as text...')
      const textData = await response.text()
      console.log('🔍 [RESPONSE-DEBUG] Text response:', textData)
      return textData as any
    }

    let errorData
    try {
      errorData = await response.json()
    } catch {
      errorData = { message: response.statusText }
    }

    // Extract error message - FastAPI uses 'detail', others use 'message'
    const errorMessage = typeof errorData.detail === 'string' 
      ? errorData.detail 
      : errorData.message || `HTTP ${response.status}`
    
    throw new APIError(
      errorMessage,
      response.status,
      errorData
    )
  }

  async request<T>(endpoint: string, options: RequestConfig = {}): Promise<T> {
    const { method = 'GET', headers = {}, body, token } = options
    const requestId = Math.random().toString(36).substr(2, 9)
    
    // Enhanced logging for all requests
    console.log(`🚀 [${requestId}] ${method} ${endpoint}`)
    if (body) {
      console.log(`📤 [${requestId}] Request body:`, body)
    }
    if (headers && Object.keys(headers).length > 0) {
      console.log(`📋 [${requestId}] Custom headers:`, headers)
    }

    const url = `${this.baseURL}${endpoint}`
    let authToken = token || this.getAuthToken()
    
    if (authToken) {
      console.log(`🔐 [${requestId}] Using auth token: ${authToken.substring(0, 20)}...`)
    } else {
      console.log(`❌ [${requestId}] No auth token available`)
    }
    
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

    console.log(`🌐 [${requestId}] Full URL: ${url}`)
    console.log(`📋 [${requestId}] Request headers:`, requestHeaders)

    try {
      const startTime = Date.now()
      const response = await fetch(url, requestConfig)
      const duration = Date.now() - startTime
      
      console.log(`📥 [${requestId}] Response: ${response.status} ${response.statusText} (${duration}ms)`)
      console.log(`📋 [${requestId}] Response headers:`, Object.fromEntries(response.headers.entries()))
      
      // Handle token expiration
      if (response.status === 401 && authToken && !this.isRefreshing) {
        console.log(`🔄 [${requestId}] Token expired, attempting refresh...`)
        try {
          // Attempt to refresh token
          const newToken = await this.refreshAccessToken()
          console.log(`✅ [${requestId}] Token refreshed successfully`)
          
          // Retry request with new token
          const newHeaders = {
            ...requestHeaders,
            'Authorization': `Bearer ${newToken}`
          }
          
          console.log(`🔄 [${requestId}] Retrying request with new token...`)
          const retryStartTime = Date.now()
          const retryResponse = await fetch(url, {
            ...requestConfig,
            headers: newHeaders
          })
          const retryDuration = Date.now() - retryStartTime
          
          console.log(`📥 [${requestId}] Retry response: ${retryResponse.status} ${retryResponse.statusText} (${retryDuration}ms)`)
          
          return this.handleResponse<T>(retryResponse)
        } catch (refreshError) {
          console.error(`❌ [${requestId}] Token refresh failed:`, refreshError)
          // If refresh fails, redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('chidi_auth_token')
            localStorage.removeItem('chidi_refresh_token')
            console.log(`🚪 [${requestId}] Redirecting to auth page`)
            window.location.href = '/auth'
          }
          throw refreshError
        }
      }
      
      console.log(`🔍 [${requestId}] About to call handleResponse...`)
      const result = await this.handleResponse<T>(response)
      console.log(`🔍 [${requestId}] handleResponse returned:`, result)
      console.log(`✅ [${requestId}] Request completed successfully`)
      return result
    } catch (error) {
      console.error(`❌ [${requestId}] Request failed:`, error)
      
      // Enhanced error logging with fetch failure detection
      if (error instanceof APIError) {
        console.error(`❌ [${requestId}] API Error Details:`, {
          status: error.status,
          message: error.message,
          data: error.data
        })
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error(`🌐 [${requestId}] FETCH FAILURE - Network/CORS Error:`, {
          message: error.message,
          url: url,
          method: method,
          possibleCauses: [
            'Backend server not running',
            'CORS configuration issue', 
            'Network connectivity problem',
            'Incorrect backend URL'
          ],
          currentBackendURL: this.baseURL,
          requestHeaders: requestHeaders
        })
      } else if (error instanceof Error) {
        console.error(`❌ [${requestId}] Network/Other Error:`, {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      }
      
      // Handle auth errors by clearing token
      if (error instanceof APIError && error.status === 401) {
        console.log(`🔐 [${requestId}] Clearing auth tokens due to 401 error`)
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
      console.error(`🔄 GET ${endpoint} failed, error:`, error)
      if (this.isDevelopmentMode && mockData) {
        console.log('🔄 [DEV] API failed, using mock data for GET', endpoint)
        return this.createMockResponse(mockData)
      }
      throw error
    }
  }

  async post<T>(endpoint: string, body?: any, headers?: HeadersInit, mockData?: T): Promise<T> {
    try {
      return await this.request<T>(endpoint, { method: 'POST', body, headers })
    } catch (error) {
      console.error(`🔄 POST ${endpoint} failed, error:`, error)
      if (this.isDevelopmentMode && mockData) {
        console.log('🔄 [DEV] API failed, using mock data for POST', endpoint)
        return this.createMockResponse(mockData)
      }
      throw error
    }
  }

  async put<T>(endpoint: string, body?: any, headers?: HeadersInit, mockData?: T): Promise<T> {
    try {
      return await this.request<T>(endpoint, { method: 'PUT', body, headers })
    } catch (error) {
      console.error(`🔄 PUT ${endpoint} failed, error:`, error)
      if (this.isDevelopmentMode && mockData) {
        console.log('🔄 [DEV] API failed, using mock data for PUT', endpoint)
        return this.createMockResponse(mockData)
      }
      throw error
    }
  }

  async delete<T>(endpoint: string, headers?: HeadersInit, mockData?: T): Promise<T> {
    try {
      return await this.request<T>(endpoint, { method: 'DELETE', headers })
    } catch (error) {
      console.error(`🔄 DELETE ${endpoint} failed, error:`, error)
      if (this.isDevelopmentMode && mockData) {
        console.log('🔄 [DEV] API failed, using mock data for DELETE', endpoint)
        return this.createMockResponse(mockData)
      }
      throw error
    }
  }

  async patch<T>(endpoint: string, body?: any, headers?: HeadersInit, mockData?: T): Promise<T> {
    try {
      return await this.request<T>(endpoint, { method: 'PATCH', body, headers })
    } catch (error) {
      console.error(`🔄 PATCH ${endpoint} failed, error:`, error)
      if (this.isDevelopmentMode && mockData) {
        console.log('🔄 [DEV] API failed, using mock data for PATCH', endpoint)
        return this.createMockResponse(mockData)
      }
      throw error
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient()
export { APIError }
export type { RequestConfig }
