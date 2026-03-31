"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react"
import { authAPI, type User as UserType } from "@/lib/api"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { EmailVerificationPending } from "./email-verification-pending"
import { MagicLinkPending } from "./magic-link-pending"
import { ForgotPassword } from "./forgot-password"

interface AuthScreenProps {
  onAuthSuccess: (user: UserType, isNewUser?: boolean) => void
  showVerified?: boolean
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
            <Check className="w-3.5 h-3.5 text-[var(--chidi-success)]" />
          ) : (
            <X className="w-3.5 h-3.5 text-[var(--chidi-text-muted)]" />
          )}
          <span className={req.met ? "text-[var(--chidi-success)]" : "text-[var(--chidi-text-muted)]"}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AuthScreen({ onAuthSuccess, showVerified = false }: AuthScreenProps) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'signin' ? 'signin' : 'signup'
  
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(initialTab)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [passwordValue, setPasswordValue] = useState("")
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null)
  const [pendingMagicLinkEmail, setPendingMagicLinkEmail] = useState<string | null>(null)
  const [showVerifiedMessage, setShowVerifiedMessage] = useState(showVerified)
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'signin' || tab === 'signup') {
      setActiveTab(tab)
    }
    // Check for verified param
    if (searchParams.get('verified') === 'true') {
      setShowVerifiedMessage(true)
      setActiveTab('signin')
    }
  }, [searchParams])

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
      
      // Get email from form for potential verification redirect
      const form = signInFormRef.current
      const formData = form ? new FormData(form) : null
      const email = formData ? (formData.get("email") as string) || "" : ""
      
      // Provide user-friendly error messages based on error type
      let errorMessage = 'Login failed. Please try again.'
      
      if (error.status === 403 && error.message?.includes('verify')) {
        // Email not verified - show verification pending screen
        console.log('📧 [AUTH-SCREEN] Email not verified, showing verification screen')
        setPendingVerificationEmail(email.trim())
        return
      } else if (error.status === 401) {
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

  const handleSendMagicLink = async () => {
    setApiError("")
    setFormErrors({})

    // Get email from the form
    const form = signInFormRef.current
    if (!form) return

    const formData = new FormData(form)
    const email = (formData.get("email") as string) || ""

    // Validate email only
    if (!email.trim()) {
      setFormErrors({ email: "Email is required" })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormErrors({ email: "Please enter a valid email address" })
      return
    }

    setIsSendingMagicLink(true)

    try {
      await authAPI.sendMagicLink(email.trim())
      setPendingMagicLinkEmail(email.trim())
    } catch (error: any) {
      console.error('🚨 [AUTH-SCREEN] Magic link error:', error)
      let errorMessage = 'Failed to send magic link. Please try again.'
      if (error.message) {
        errorMessage = error.message
      }
      setApiError(errorMessage)
    } finally {
      setIsSendingMagicLink(false)
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
      
      // Check if email verification is required
      if (response.needs_verification) {
        console.log('📧 [AUTH-SCREEN] Email verification required, showing pending screen')
        setPendingVerificationEmail(response.email)
      } else {
        // Fallback for backwards compatibility (shouldn't happen with new backend)
        onAuthSuccess(response as unknown as UserType, true)
      }
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

  // Show verification pending screen if email is set
  if (pendingVerificationEmail) {
    return (
      <EmailVerificationPending
        email={pendingVerificationEmail}
        onBackToSignIn={() => {
          setPendingVerificationEmail(null)
          setActiveTab('signin')
        }}
      />
    )
  }

  // Show magic link pending screen if email is set
  if (pendingMagicLinkEmail) {
    return (
      <MagicLinkPending
        email={pendingMagicLinkEmail}
        onBackToSignIn={() => {
          setPendingMagicLinkEmail(null)
          setActiveTab('signin')
        }}
      />
    )
  }

  // Show forgot password screen
  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBackToSignIn={() => {
          setShowForgotPassword(false)
          setActiveTab('signin')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8 animate-in fade-in duration-500">
          <Image
            src="/logo.png"
            alt="Chidi"
            width={200}
            height={200}
            className="mx-auto mb-3"
            priority
          />
          <p className="text-lg font-serif text-[var(--chidi-text-primary)] tracking-tight">
            Your AI business assistant for WhatsApp & Instagram
          </p>
        </div>

        {/* Email verified success message */}
        {showVerifiedMessage && (
          <div className="flex items-center gap-2 text-sm text-[var(--chidi-success)] bg-[var(--chidi-success)]/5 px-4 py-3 rounded-lg mb-6 animate-in fade-in duration-300">
            <Check className="w-4 h-4" />
            <span>Email verified successfully! Please sign in to continue.</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex bg-[var(--chidi-surface)] rounded-xl p-1 mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-100">
          <button
            onClick={() => {
              setActiveTab('signin')
              setApiError("")
              setFormErrors({})
            }}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === 'signin'
                ? 'bg-white text-[var(--chidi-text-primary)] shadow-card'
                : 'text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]'
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('signup')
              setApiError("")
              setFormErrors({})
            }}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === 'signup'
                ? 'bg-white text-[var(--chidi-text-primary)] shadow-card'
                : 'text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]'
            )}
          >
            Sign Up
          </button>
        </div>

        {/* Auth Form */}
        <div className="animate-in slide-in-from-bottom-4 duration-500 delay-200">
          {activeTab === 'signup' ? (
            <form ref={signUpFormRef} onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="signup-name"
                  name="name"
                  type="text"
                  placeholder="Ciroma Chukwuma Adekunle"
                  className={cn(
                    "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12",
                    formErrors.name && "border-[var(--chidi-danger)] focus:ring-[var(--chidi-danger)]/20 focus:border-[var(--chidi-danger)]"
                  )}
                />
                {formErrors.name && (
                  <p className="text-xs text-[var(--chidi-danger)] mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  className={cn(
                    "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12",
                    formErrors.email && "border-[var(--chidi-danger)] focus:ring-[var(--chidi-danger)]/20 focus:border-[var(--chidi-danger)]"
                  )}
                />
                {formErrors.email && (
                  <p className="text-xs text-[var(--chidi-danger)] mt-1">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-[var(--chidi-text-primary)] text-sm font-medium">
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
                      "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12 pr-12",
                      formErrors.password && "border-[var(--chidi-danger)] focus:ring-[var(--chidi-danger)]/20 focus:border-[var(--chidi-danger)]"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <PasswordRequirements password={passwordValue} />
              </div>

              {apiError && (
                <div className="text-sm text-[var(--chidi-danger)] bg-[var(--chidi-danger)]/5 px-3 py-2 rounded-lg border border-[var(--chidi-danger)]/20">
                  {apiError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full btn-cta h-12 font-medium transition-all duration-300 rounded-xl"
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

              <p className="text-xs text-center text-[var(--chidi-text-muted)] mt-4">
                By signing up, you agree to our{' '}
                <span className="text-[var(--chidi-text-secondary)] hover:underline cursor-pointer">Terms of Service</span>
                {' '}and{' '}
                <span className="text-[var(--chidi-text-secondary)] hover:underline cursor-pointer">Privacy Policy</span>
              </p>
            </form>
          ) : (
            <form ref={signInFormRef} onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className={cn(
                    "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12",
                    formErrors.email && "border-[var(--chidi-danger)] focus:ring-[var(--chidi-danger)]/20 focus:border-[var(--chidi-danger)]"
                  )}
                />
                {formErrors.email && (
                  <p className="text-xs text-[var(--chidi-danger)] mt-1">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-[var(--chidi-accent)] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="signin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={cn(
                      "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12 pr-12",
                      formErrors.password && "border-[var(--chidi-danger)] focus:ring-[var(--chidi-danger)]/20 focus:border-[var(--chidi-danger)]"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {apiError && (
                <div className="text-sm text-[var(--chidi-danger)] bg-[var(--chidi-danger)]/5 px-3 py-2 rounded-lg border border-[var(--chidi-danger)]/20">
                  {apiError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full btn-cta h-12 font-medium transition-all duration-300 rounded-xl"
                disabled={isLoading || isSendingMagicLink}
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

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--chidi-border-default)]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-[var(--background)] text-[var(--chidi-text-muted)]">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleSendMagicLink}
                className="w-full border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] h-12 font-medium transition-all duration-300 rounded-xl shadow-card"
                disabled={isLoading || isSendingMagicLink}
              >
                {isSendingMagicLink ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending magic link...
                  </>
                ) : (
                  'Sign in with magic link'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
