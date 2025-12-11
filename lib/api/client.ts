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

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api'
    this.isDevelopmentMode = process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_API_BASE_URL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('chidi_auth_token')
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
    // In development mode, log the API call
    if (this.isDevelopmentMode) {
      console.log(`🔧 [DEV] API Call: ${options.method || 'GET'} ${endpoint}`, options.body || '')
    }

    const url = `${this.baseURL}${endpoint}`
    const config: RequestInit = {
      method: options.method || 'GET',
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
    }

    // Add auth header if token exists
    const token = this.getAuthToken()
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }

    // Add body for POST/PUT/PATCH requests
    if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method || 'GET')) {
      config.body = JSON.stringify(options.body)
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }))
        throw new APIError(errorData.message || 'Request failed', response.status, errorData)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof APIError) {
        // Handle auth errors by clearing token
        if (error.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('chidi_auth_token')
            window.location.href = '/login'
          }
        }
        throw error
      }
      // Network or other errors
      throw new APIError('Network error occurred', 0, { originalError: error })
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
