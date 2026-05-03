"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Store, ArrowRight, Check, Globe } from "lucide-react"
import { ChidiAvatar } from "./chidi-mark"
import { ChidiLoader } from "./chidi-loader"
import { SetupCelebration } from "./setup-celebration"
import type { User } from "@/lib/api"
import { authAPI } from "@/lib/api"
import { cn } from "@/lib/utils"
import { CURRENCIES, DEFAULT_CURRENCY, type CurrencyInfo } from "@/lib/utils/currency"
import { usePersistedState } from "@/lib/hooks/use-persisted-state"

const PLACEHOLDER_NAME = "Chidi User"

interface OnboardingProps {
  user: User
  onComplete: (userData: any) => void
}

// Progress bar component
function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="mb-8">
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum) => (
          <div
            key={stepNum}
            className={cn(
              "flex-1 h-1 rounded-full transition-all duration-300",
              stepNum <= currentStep 
                ? "bg-[var(--chidi-accent)]" 
                : "bg-[var(--chidi-border-subtle)]"
            )}
          />
        ))}
      </div>
    </div>
  )
}

// Header component
function OnboardingHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center mb-8">
      <h1 className="text-2xl font-serif text-[var(--chidi-text-primary)] tracking-tight mb-2">
        {title}
      </h1>
      <p className="text-[var(--chidi-text-secondary)] text-sm font-chidi-voice">{subtitle}</p>
    </div>
  )
}

// Conversational header — Chidi speaks at the top of each step, framing it
// as a chat instead of a form.
function ChidiSays({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6 chidi-brief-card">
      <ChidiAvatar size="md" tone="default" />
      <div className="flex-1 min-w-0">
        <p className="ty-page-title text-[var(--chidi-text-primary)]">{title}</p>
        {subtitle && (
          <p className="ty-body-voice text-[var(--chidi-text-secondary)] mt-1.5 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}

// Setup progress phases - calibrated to match typical API response time
const SETUP_PHASES = [
  { label: "Creating your business", icon: Store },
  { label: "Setting up your profile", icon: Store },
  { label: "Configuring preferences", icon: Store },
  { label: "Setting up inventory", icon: Store },
  { label: "Configuring categories", icon: Store },
  { label: "Finalizing setup", icon: Store },
  { label: "Almost ready", icon: Check },
] as const

// Setup progress — branded ChidiLoader replaces generic spinner. Skeleton rows
// build up underneath so the user sees scaffolding take shape, not a stalled
// page.
function SetupProgress({ currentPhase }: { currentPhase: number }) {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] flex items-center justify-center p-4 overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
      <div className="w-full max-w-lg animate-in fade-in duration-500">
        <div className="text-center mb-10">
          <ChidiLoader context="general" size="lg" phrases={[SETUP_PHASES[Math.min(currentPhase, SETUP_PHASES.length - 1)].label]} />
        </div>

        <div className="space-y-3">
          {SETUP_PHASES.map((phase, index) => {
            const isCompleted = index < currentPhase
            const isCurrent = index === currentPhase
            const isPending = index > currentPhase

            return (
              <div
                key={index}
                className={cn(
                  "flex items-center p-3.5 rounded-xl border transition-all duration-300",
                  isCompleted && "bg-[var(--chidi-success)]/5 border-[var(--chidi-success)]/20",
                  isCurrent && "bg-[var(--chidi-accent)]/5 border-[var(--chidi-accent)]/30",
                  isPending && "bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)] opacity-50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mr-4 transition-all duration-300 flex-shrink-0",
                  isCompleted && "bg-[var(--chidi-success)] text-white",
                  isCurrent && "bg-[var(--chidi-accent)] text-white",
                  isPending && "bg-[var(--chidi-border-subtle)] text-[var(--chidi-text-muted)]"
                )}>
                  {isCompleted ? (
                    <Check className="w-4 h-4 animate-in zoom-in duration-200" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-white chidi-loader-breathe" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                {isPending ? (
                  // Skeleton bar in place of pending text — shows scaffolding
                  // building, not a list of "not yet" labels.
                  <span className="flex-1 h-3 rounded-full bg-[var(--chidi-border-subtle)]/60 animate-pulse" />
                ) : (
                  <span className={cn(
                    "font-medium text-sm transition-colors duration-300 font-chidi-voice",
                    isCompleted && "text-[var(--chidi-success)]",
                    isCurrent && "text-[var(--chidi-text-primary)]"
                  )}>
                    {phase.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function Onboarding({ user, onComplete }: OnboardingProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [setupPhase, setSetupPhase] = useState(0)
  // Holds the completed user payload so we can render <SetupCelebration> for
  // a beat before handing off. Null means we haven't celebrated yet.
  const [celebratingPayload, setCelebratingPayload] = useState<any>(null)
  
  // Check if user needs to set their name (magic link users have placeholder name)
  const needsNameUpdate = user.name === PLACEHOLDER_NAME || 
    (typeof window !== 'undefined' && localStorage.getItem('chidi_needs_name_update') === 'true')
  
  // Use persisted state for form data - survives page navigation
  const [step, setStep, clearStep] = usePersistedState('onboarding:step', 1)
  const [selectedCategories, setSelectedCategories, clearCategories] = usePersistedState<string[]>('onboarding:categories', [])
  const [userData, setUserData, clearUserData] = usePersistedState('onboarding:userData', {
    name: user.name === PLACEHOLDER_NAME ? "" : user.name,  // Empty if placeholder, otherwise prefill
    businessName: "",
    phone: "",
    categories: [] as string[],
    currency: DEFAULT_CURRENCY,
  })
  
  // Clear all persisted onboarding drafts
  const clearAllDrafts = useCallback(() => {
    clearStep()
    clearCategories()
    clearUserData()
  }, [clearStep, clearCategories, clearUserData])
  const [nameError, setNameError] = useState("")
  const [businessNameError, setBusinessNameError] = useState("")
  const [apiError, setApiError] = useState("")
  
  // Cycle through setup phases when loading
  // Interval is calibrated so animation covers typical API response time (~5-8 seconds)
  useEffect(() => {
    if (!isLoading) {
      setSetupPhase(0)
      return
    }
    
    const interval = setInterval(() => {
      setSetupPhase(prev => {
        if (prev < SETUP_PHASES.length - 1) {
          return prev + 1
        }
        return prev  // Stay on "Almost ready..." until API returns
      })
    }, 1500)  // 1.5 seconds per phase = ~10.5 seconds total before reaching final phase
    
    return () => clearInterval(interval)
  }, [isLoading])
  
  // Clear the needs_name_update flag when component unmounts or user completes onboarding
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_needs_name_update')
      }
    }
  }, [])

  const totalSteps = 3

  const handleNext = async () => {
    // Validate name if user needs to update it (step 2)
    if (step === 2 && needsNameUpdate) {
      if (!userData.name.trim()) {
        setNameError("Please enter your name")
        return
      }
      if (userData.name.trim().length < 2) {
        setNameError("Name must be at least 2 characters")
        return
      }
      if (userData.name.trim() === PLACEHOLDER_NAME) {
        setNameError("Please enter your actual name")
        return
      }
      setNameError("")
    }
    
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      // Complete onboarding by calling the API (step 3 is the last step)
      setIsLoading(true)
      try {
        const response = await authAPI.completeOnboarding({
          name: needsNameUpdate ? userData.name.trim() : undefined,  // Only send name if it needs updating
          business_name: userData.businessName,
          business_industry: selectedCategories.length > 0 ? selectedCategories[0] : undefined,
          phone: userData.phone,
          categories: selectedCategories,
          default_currency: userData.currency,
        })
        
        // Clear persisted drafts on successful completion
        clearAllDrafts()
        
        // Stash the payload — render <SetupCelebration> for a beat, THEN
        // hand off to onComplete. Makes the moment of "you're in" feel earned.
        const finalName = needsNameUpdate ? userData.name.trim() : user.name
        setCelebratingPayload({
          ...response.user,
          name: finalName,
          businessName: userData.businessName,
          ownerName: finalName,
          business_id: response.business_id,
          workspace_id: response.workspace_id,
          inventory_id: response.inventory_id,
          businessSlug: response.businessSlug,
        })
        setIsLoading(false)
      } catch (error: any) {
        console.error('Onboarding completion failed:', error)
        setIsLoading(false)
        
        // Handle duplicate business name error (409 Conflict)
        if (error?.response?.status === 409) {
          const detail = error?.response?.data?.detail
          const suggestions = detail?.suggestions
          if (suggestions && suggestions.length > 0) {
            setBusinessNameError(`This business name is taken. Try: ${suggestions.join(', ')}`)
          } else {
            setBusinessNameError('This business name is already taken. Please choose another.')
          }
          // Go back to step 2 where business name is entered
          setStep(2)
          return
        }
        
        // For other errors, show a generic error message
        setApiError(error?.response?.data?.detail || error?.message || 'Failed to complete setup. Please try again.')
      }
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setUserData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
    setApiError("")  // Clear any API error when user interacts
  }

  const handleSkip = () => {
    clearAllDrafts()
    onComplete({
      ...user,
      ownerName: user.name,
      businessName: userData.businessName || "My Business",
      phone: userData.phone || "",
      categories: selectedCategories.length > 0 ? selectedCategories : ["other"],
    })
  }

  // Crescendo — renders the celebration sequence once the API confirms.
  // Then fires onComplete, handing off to the dashboard.
  if (celebratingPayload) {
    return (
      <SetupCelebration
        ownerName={celebratingPayload.ownerName || celebratingPayload.name}
        businessName={celebratingPayload.businessName}
        onDone={() => onComplete(celebratingPayload)}
      />
    )
  }

  // Step 1: Welcome — opens as a conversation with Chidi, not a 3-feature pitch
  if (step === 1) {
    const firstName = needsNameUpdate ? "" : (user.name?.split(" ")[0] || "")
    const greeting = firstName ? `Hi ${firstName}, I'm Chidi.` : "Hi, I'm Chidi."

    return (
      <div className="min-h-[100dvh] bg-[var(--background)] flex items-center justify-center p-4 overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="w-full max-w-lg animate-in fade-in duration-500">
          <ProgressBar currentStep={step} totalSteps={totalSteps} />

          <ChidiSays
            title={greeting}
            subtitle="I'll handle your WhatsApp, track every order, and learn your business. Two minutes to set me up."
          />

          {/* Step preview — what's coming, in plain language */}
          <ol className="space-y-2.5 mb-8">
            {[
              { n: 1, label: "Tell me about your business", time: "30 seconds" },
              { n: 2, label: "Pick what you sell so I know your inventory shape", time: "30 seconds" },
              { n: 3, label: "Connect WhatsApp so I can start helping", time: "1 minute" },
            ].map((s, idx) => (
              <li
                key={s.n}
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] chidi-brief-card"
                style={{ animationDelay: `${150 + idx * 80}ms` }}
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-[var(--chidi-border-subtle)] flex items-center justify-center text-xs font-medium font-chidi-voice text-[var(--chidi-text-secondary)] tabular-nums">
                  {s.n}
                </span>
                <span className="flex-1 text-sm text-[var(--chidi-text-primary)] font-chidi-voice">
                  {s.label}
                </span>
                <span className="text-[11px] text-[var(--chidi-text-muted)] font-chidi-voice tabular-nums">
                  {s.time}
                </span>
              </li>
            ))}
          </ol>

          <Button
            onClick={handleNext}
            className="w-full btn-cta h-12 font-medium transition-all duration-300 rounded-xl"
          >
            Let's go
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-xs text-[var(--chidi-text-muted)] font-chidi-voice text-center mt-4">
            You can change anything later. Nothing here is final.
          </p>
        </div>
      </div>
    )
  }

  // Step 2: Business Details (and Name for magic link users)
  if (step === 2) {
    // Determine if form is valid to proceed
    const isStep2Valid = userData.businessName && userData.phone && 
      (!needsNameUpdate || (userData.name.trim().length >= 2 && userData.name.trim() !== PLACEHOLDER_NAME))
    
    return (
      <div className="min-h-[100dvh] bg-[var(--background)] flex items-center justify-center p-4 overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="w-full max-w-lg animate-in fade-in duration-500">
          <ProgressBar currentStep={step} totalSteps={totalSteps} />

          <ChidiSays
            title={needsNameUpdate ? "First — what should I call you?" : "Tell me about your business."}
            subtitle={needsNameUpdate
              ? "Your name, your business name, and where you're based. Quick stuff."
              : "What you call it, your phone number, and which currency you sell in."}
          />

          {/* API Error Banner — message + inline retry. Re-tapping the
              primary CTA also retries; this is for moments when the user
              wants the failure acknowledged without leaving the banner. */}
          {apiError && (
            <div className="mb-6 p-4 bg-[var(--chidi-danger)]/10 border border-[var(--chidi-danger)]/20 rounded-xl flex items-start justify-between gap-3">
              <p className="text-sm text-[var(--chidi-danger)] flex-1">{apiError}</p>
              <button
                type="button"
                onClick={() => {
                  setApiError("")
                  void handleNext()
                }}
                className="text-xs font-medium font-chidi-voice text-[var(--chidi-danger)] underline underline-offset-2 hover:no-underline flex-shrink-0"
              >
                Try again
              </button>
            </div>
          )}

          {/* Form */}
          <div className="space-y-5">
            {/* Name field - shown for magic link users who need to set their name */}
            {needsNameUpdate && (
              <div className="space-y-2">
                <Label htmlFor="userName" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                  Your Name <span className="text-[var(--chidi-danger)]">*</span>
                </Label>
                <Input
                  id="userName"
                  placeholder="e.g., Ciroma Chukwuma"
                  value={userData.name}
                  onChange={(e) => {
                    handleInputChange("name", e.target.value)
                    setNameError("")  // Clear error when user types
                  }}
                  className={cn(
                    "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12",
                    nameError && "border-[var(--chidi-danger)] focus:ring-[var(--chidi-danger)]/20 focus:border-[var(--chidi-danger)]"
                  )}
                />
                {nameError && (
                  <p className="text-xs text-[var(--chidi-danger)] mt-1">{nameError}</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                Business Name <span className="text-[var(--chidi-danger)]">*</span>
              </Label>
              <Input
                id="businessName"
                placeholder="e.g., Bella's Fashion Store"
                value={userData.businessName}
                onChange={(e) => {
                  handleInputChange("businessName", e.target.value)
                  setBusinessNameError("")  // Clear error when user types
                  setApiError("")  // Clear any API error
                }}
                className={cn(
                  "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12",
                  businessNameError && "border-[var(--chidi-danger)] focus:ring-[var(--chidi-danger)]/20 focus:border-[var(--chidi-danger)]"
                )}
              />
              {businessNameError && (
                <p className="text-xs text-[var(--chidi-danger)] mt-1">{businessNameError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                Phone Number <span className="text-[var(--chidi-danger)]">*</span>
              </Label>
              <Input
                id="phone"
                placeholder="e.g., +234 801 234 5678"
                value={userData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12"
              />
            </div>
            
            {/* Currency Selection */}
            <div className="space-y-2">
              <Label className="text-[var(--chidi-text-primary)] text-sm font-medium flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Currency <span className="text-[var(--chidi-danger)]">*</span>
              </Label>
              <p className="text-xs text-[var(--chidi-text-muted)] mb-2">
                Select the currency your business uses
              </p>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(CURRENCIES)
                  .filter(c => c.code !== 'USD') // Only show African currencies
                  .map((currency) => (
                    <button
                      key={currency.code}
                      type="button"
                      onClick={() => handleInputChange("currency", currency.code)}
                      className={cn(
                        "p-3 rounded-xl border transition-all duration-200 text-center",
                        userData.currency === currency.code
                          ? "bg-[var(--chidi-accent)] border-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)]"
                          : "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] hover:border-[var(--chidi-text-muted)]"
                      )}
                    >
                      <div className="text-lg font-semibold">{currency.symbol}</div>
                      <div className="text-xs mt-1">{currency.code}</div>
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex-1 h-12 font-medium rounded-xl border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1 btn-cta h-12 font-medium transition-all duration-300 rounded-xl"
                disabled={!isStep2Valid}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Business Type Selection
  // This determines the default product categories seeded for the business
  if (step === 3) {
    // Show stepped progress animation when loading
    if (isLoading) {
      return <SetupProgress currentPhase={setupPhase} />
    }
    
    const businessTypes = [
      { id: "fashion", label: "Fashion & Clothing", icon: "👗" },
      { id: "electronics", label: "Electronics", icon: "📱" },
      { id: "beauty", label: "Beauty & Cosmetics", icon: "💄" },
      { id: "food", label: "Food & Beverages", icon: "🍔" },
      { id: "home", label: "Home & Living", icon: "🏠" },
      { id: "other", label: "Other", icon: "📦" },
    ]

    return (
      <div className="min-h-[100dvh] bg-[var(--background)] flex items-center justify-center p-4 overflow-y-auto pb-[max(env(safe-area-inset-bottom),16px)]">
        <div className="w-full max-w-lg animate-in fade-in duration-500">
          <ProgressBar currentStep={step} totalSteps={totalSteps} />

          <ChidiSays
            title="What kind of business?"
            subtitle="Pick whatever fits — I'll set up the right product categories for you. You can pick more than one."
          />

          {/* API Error Banner — message + inline retry. Re-tapping the
              primary CTA also retries; this is for moments when the user
              wants the failure acknowledged without leaving the banner. */}
          {apiError && (
            <div className="mb-6 p-4 bg-[var(--chidi-danger)]/10 border border-[var(--chidi-danger)]/20 rounded-xl flex items-start justify-between gap-3">
              <p className="text-sm text-[var(--chidi-danger)] flex-1">{apiError}</p>
              <button
                type="button"
                onClick={() => {
                  setApiError("")
                  void handleNext()
                }}
                className="text-xs font-medium font-chidi-voice text-[var(--chidi-danger)] underline underline-offset-2 hover:no-underline flex-shrink-0"
              >
                Try again
              </button>
            </div>
          )}

          {/* Business Types Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {businessTypes.map((businessType) => (
              <button
                key={businessType.id}
                onClick={() => handleCategoryToggle(businessType.id)}
                className={cn(
                  "p-4 rounded-xl border transition-all duration-200 text-left",
                  selectedCategories.includes(businessType.id)
                    ? "bg-[var(--chidi-accent)] border-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)]"
                    : "bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] hover:border-[var(--chidi-text-muted)]"
                )}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{businessType.icon}</span>
                  <span className="font-medium text-sm">{businessType.label}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex-1 h-12 font-medium rounded-xl border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]"
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 btn-cta h-12 font-medium transition-all duration-300 rounded-xl"
              disabled={selectedCategories.length === 0}
            >
              Complete Setup
              <Check className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Fallback - should not reach here
  return null
}
