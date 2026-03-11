'use client'

import { createContext, useContext } from 'react'
import type { User } from '@/lib/api'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
})

export const useDashboardAuth = () => useContext(AuthContext)
