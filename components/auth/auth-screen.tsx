"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Zap, Mail, Lock, User, Loader2, Eye, EyeOff } from "lucide-react"
import { authAPI, type User as UserType } from "@/lib/api"

interface AuthScreenProps {
  onAuthSuccess: (user: UserType, isNewUser?: boolean) => void
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signup")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Sign In state
  const [signInEmail, setSignInEmail] = useState("")
  const [signInPassword, setSignInPassword] = useState("")

  // Sign Up state
  const [signUpName, setSignUpName] = useState("")
  const [signUpEmail, setSignUpEmail] = useState("")
  const [signUpPassword, setSignUpPassword] = useState("")

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await authAPI.login({
        email: signInEmail,
        password: signInPassword
      })
      
      setIsLoading(false)
      onAuthSuccess(response.user, false) // Login - existing user
    } catch (error: any) {
      setIsLoading(false)
      setError(error.message || 'Login failed')
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await authAPI.signup({
        email: signUpEmail,
        password: signUpPassword,
        name: signUpName
      })
      
      setIsLoading(false)
      onAuthSuccess(response.user, true) // Signup - new user
    } catch (error: any) {
      setIsLoading(false)
      setError(error.message || 'Signup failed')
    }
  }


  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8 animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Welcome to CHIDI</h1>
          <p className="text-gray-400 text-sm">Your AI business assistant for WhatsApp & Instagram</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-800 rounded-lg p-1 mb-8 animate-in slide-in-from-bottom-4 duration-500 delay-100">
          <button
            onClick={() => setActiveTab('signin')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'signin'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'signup'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Auth Form */}
        <div className="animate-in slide-in-from-bottom-4 duration-500 delay-200">
          {activeTab === 'signup' ? (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-gray-300 text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Jane Adebayo"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-gray-300 text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-gray-300 text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12 pr-12"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Must be at least 6 characters</p>
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-md border border-red-800">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 font-medium transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <p className="text-xs text-center text-gray-500 mt-4">
                By signing up, you agree to our{' '}
                <span className="text-indigo-400 hover:underline cursor-pointer">Terms of Service</span>
                {' '}and{' '}
                <span className="text-indigo-400 hover:underline cursor-pointer">Privacy Policy</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-gray-300 text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-gray-300 text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-md border border-red-800">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 font-medium transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
