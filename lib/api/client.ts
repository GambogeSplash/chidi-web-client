// API Client - Base HTTP client for external backend integration

// Debug logging helper - only logs in development
const isDev = process.env.NODE_ENV === 'development'
const debugLog = (...args: any[]) => { if (isDev) console.log(...args) }
const debugError = (...args: any[]) => { if (isDev) console.error(...args) }

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

// SSE Stream chunk types
export interface StreamChunk {
  type: 'token' | 'tool_call' | 'tool_result' | 'done' | 'message_saved' | 'error'
  content?: string
  name?: string
  status?: string
  message?: string
  message_id?: string
  tool_calls?: string[]
  cache_hit?: boolean
  tokens?: { input?: number; output?: number }
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
    
    debugLog('🔧 [API-CLIENT] Initialized with config:', {
      baseURL: this.baseURL,
      isDevelopmentMode: this.isDevelopmentMode,
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
    if (response.ok) {
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        try {
          return await response.json()
        } catch (jsonError: any) {
          debugError('🚨 JSON parsing failed:', jsonError.message)
          throw new Error(`JSON parsing failed: ${jsonError.message}`)
        }
      }
      
      return await response.text() as any
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
    
    debugLog(`🚀 ${method} ${endpoint}`)

    const url = `${this.baseURL}${endpoint}`
    const authToken = token || this.getAuthToken()
    
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
      const startTime = Date.now()
      const response = await fetch(url, requestConfig)
      const duration = Date.now() - startTime
      
      debugLog(`📥 ${method} ${endpoint}: ${response.status} (${duration}ms)`)
      
      // Handle token expiration
      if (response.status === 401 && authToken && !this.isRefreshing) {
        debugLog('🔄 Token expired, attempting refresh...')
        try {
          const newToken = await this.refreshAccessToken()
          
          const retryResponse = await fetch(url, {
            ...requestConfig,
            headers: { ...requestHeaders, 'Authorization': `Bearer ${newToken}` }
          })
          
          return this.handleResponse<T>(retryResponse)
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
      
      return await this.handleResponse<T>(response)
    } catch (error) {
      // Only log errors in development
      if (error instanceof APIError) {
        debugError(`❌ API Error: ${error.status} ${error.message}`)
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        debugError(`🌐 Network Error: ${error.message} - Check if backend is running at ${this.baseURL}`)
        // Throw a more user-friendly error for network issues
        throw new APIError(
          'Unable to connect to the server. Please check your internet connection and try again.',
          0,
          { originalError: error.message }
        )
      } else {
        debugError(`❌ Request failed:`, error)
      }
      
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
        debugLog('📦 [MOCK] Returning mock data')
        resolve(data)
      }, 300)
    })
  }

  // Convenience methods with mock fallback
  async get<T>(endpoint: string, headers?: HeadersInit, mockData?: T): Promise<T> {
    try {
      return await this.request<T>(endpoint, { method: 'GET', headers })
    } catch (error) {
      if (this.isDevelopmentMode && mockData) {
        debugLog('🔄 [DEV] Using mock data for GET', endpoint)
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
        debugLog('🔄 [DEV] Using mock data for POST', endpoint)
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
        debugLog('🔄 [DEV] Using mock data for PUT', endpoint)
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
        debugLog('🔄 [DEV] Using mock data for DELETE', endpoint)
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
        debugLog('🔄 [DEV] Using mock data for PATCH', endpoint)
        return this.createMockResponse(mockData)
      }
      throw error
    }
  }

  /**
   * Stream a POST request using Server-Sent Events (SSE).
   * 
   * @param endpoint - API endpoint to call
   * @param body - Request body
   * @param onChunk - Callback for each SSE chunk received
   * @param onDone - Callback when stream completes
   * @param onError - Callback for errors
   */
  async streamRequest(
    endpoint: string,
    body: any,
    onChunk: (chunk: StreamChunk) => void,
    onDone: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const url = `${this.baseURL}${endpoint}`
    const authToken = this.getAuthToken()
    
    debugLog(`🌊 [STREAM] POST ${endpoint}`)

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    }
    
    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch {
          // Use default error message
        }
        throw new APIError(errorMessage, response.status)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          debugLog('🌊 [STREAM] Stream complete')
          break
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete SSE events (separated by double newlines)
        const events = buffer.split('\n\n')
        buffer = events.pop() || '' // Keep incomplete event in buffer
        
        for (const event of events) {
          const lines = event.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                debugLog('🌊 [STREAM] Chunk:', data.type)
                onChunk(data as StreamChunk)
              } catch (parseError) {
                debugError('🌊 [STREAM] Failed to parse chunk:', line)
              }
            }
          }
        }
      }

      onDone()
    } catch (error) {
      debugError('🌊 [STREAM] Error:', error)
      
      if (error instanceof APIError) {
        onError(error)
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        onError(new APIError(
          'Unable to connect to the server. Please check your internet connection.',
          0
        ))
      } else {
        onError(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient()
export { APIError }
export type { RequestConfig }
