"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Zap, Loader2, Eye, EyeOff, Check, X } from "lucide-react"
import { authAPI, type User as UserType } from "@/lib/api"
import { cn } from "@/lib/utils"

interface AuthScreenProps {
  onAuthSuccess: (user: UserType, isNewUser?: boolean) => void
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
}

// Validation functions
function validateSignUpForm(name: string, email: string, password: string): FormErrors {
  const errors: FormErrors = {}
  
  // Name validation
  if (!name.trim()) {
    errors.name = "Name is required"
  } else if (name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters"
  }
  
  // Email validation
  if (!email.trim()) {
    errors.email = "Email is required"
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Please enter a valid email address"
  }
  
  // Password validation
  if (!password) {
    errors.password = "Password is required"
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters"
  } else if (!/[A-Z]/.test(password)) {
    errors.password = "Password needs an uppercase letter"
  } else if (!/[0-9]/.test(password)) {
    errors.password = "Password needs a number"
  }
  
  return errors
}

function validateSignInForm(email: string, password: string): FormErrors {
  const errors: FormErrors = {}
  
  if (!email.trim()) {
    errors.email = "Email is required"
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = "Please enter a valid email address"
  }
  
  if (!password) {
    errors.password = "Password is required"
  }
  
  return errors
}

// Password requirement checker component
function PasswordRequirements({ password = "" }: { password: string }) {
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  const requirements = [
    { label: "At least 8 characters", met: hasMinLength },
    { label: "One uppercase letter", met: hasUppercase },
    { label: "One number", met: hasNumber },
  ]

  return (
    <div className="space-y-1.5 mt-2">
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center gap-2 text-xs transition-colors duration-200">
          {req.met ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <X className="w-3.5 h-3.5 text-gray-500" />
          )}
          <span className={req.met ? "text-green-500" : "text-gray-500"}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signup")
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [passwordValue, setPasswordValue] = useState("")

  // Form refs to get actual DOM values
  const signUpFormRef = useRef<HTMLFormElement>(null)
  const signInFormRef = useRef<HTMLFormElement>(null)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError("")
    setFormErrors({})

    // Get values directly from the form
    const form = signInFormRef.current
    if (!form) return

    const formData = new FormData(form)
    const email = (formData.get("email") as string) || ""
    const password = (formData.get("password") as string) || ""

    // Validate
    const errors = validateSignInForm(email, password)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsLoading(true)

    try {
      const response = await authAPI.login({ email: email.trim(), password })
      
      const user: UserType = {
        ...response.user,
        businessName: response.businessName || response.user.businessName,
        businessSlug: response.businessSlug || response.user.businessSlug,
      }
      
      console.log('✅ [AUTH-SCREEN] Login successful, user:', user)
      
      setIsLoading(false)
      onAuthSuccess(user, false)
    } catch (error: any) {
      setIsLoading(false)
      console.error('🚨 [AUTH-SCREEN] Login error:', error)
      
      // Provide user-friendly error messages based on error type
      let errorMessage = 'Login failed. Please try again.'
      
      if (error.status === 401) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
      } else if (error.status === 404) {
        errorMessage = 'Account not found. Please sign up first.'
      } else if (error.status === 0 || error.message?.includes('connect')) {
        errorMessage = 'Unable to connect to the server. Please check your connection.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setApiError(errorMessage)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError("")
    setFormErrors({})

    // Get values directly from the form
    const form = signUpFormRef.current
    if (!form) return

    const formData = new FormData(form)
    const name = (formData.get("name") as string) || ""
    const email = (formData.get("email") as string) || ""
    const password = (formData.get("password") as string) || ""

    console.log('🔍 [DEBUG] Form values:', { name, email, password: '***' })

    // Validate
    const errors = validateSignUpForm(name, email, password)
    if (Object.keys(errors).length > 0) {
      console.log('🚨 [DEBUG] Validation errors:', errors)
      setFormErrors(errors)
      return
    }

    setIsLoading(true)

    try {
      console.log('🔍 [DEBUG] Starting signup process...')
      const response = await authAPI.signup({
        email: email.trim(),
        password,
        name: name.trim()
      })
      
      console.log('🔍 [DEBUG] Signup successful:', response)
      
      setIsLoading(false)
      onAuthSuccess(response, true)
    } catch (error: any) {
      console.error('🚨 [DEBUG] Signup API error:', error)
      setIsLoading(false)
      
      // Provide user-friendly error messages based on error type
      let errorMessage = 'Signup failed. Please try again.'
      
      if (error.status === 400 && error.message?.includes('already exists')) {
        errorMessage = 'An account with this email already exists. Please sign in instead.'
      } else if (error.status === 0 || error.message?.includes('connect')) {
        errorMessage = 'Unable to connect to the server. Please check your connection.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setApiError(errorMessage)
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
            onClick={() => {
              setActiveTab('signin')
              setApiError("")
              setFormErrors({})
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'signin'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('signup')
              setApiError("")
              setFormErrors({})
            }}
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
            <form ref={signUpFormRef} onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-gray-300 text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="signup-name"
                  name="name"
                  type="text"
                  placeholder="Jane Adebayo"
                  className={cn(
                    "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12",
                    formErrors.name && "border-red-500 focus:ring-red-500 focus:border-red-500"
                  )}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-gray-300 text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className={cn(
                    "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12",
                    formErrors.email && "border-red-500 focus:ring-red-500 focus:border-red-500"
                  )}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-400 mt-1">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-gray-300 text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    onChange={(e) => setPasswordValue(e.target.value)}
                    className={cn(
                      "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12 pr-12",
                      formErrors.password && "border-red-500 focus:ring-red-500 focus:border-red-500"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <PasswordRequirements password={passwordValue} />
              </div>

              {apiError && (
                <div className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-md border border-red-800">
                  {apiError}
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
            <form ref={signInFormRef} onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-gray-300 text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className={cn(
                    "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12",
                    formErrors.email && "border-red-500 focus:ring-red-500 focus:border-red-500"
                  )}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-400 mt-1">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-gray-300 text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn(
                      "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12 pr-12",
                      formErrors.password && "border-red-500 focus:ring-red-500 focus:border-red-500"
                    )}
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

              {apiError && (
                <div className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded-md border border-red-800">
                  {apiError}
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
