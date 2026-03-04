"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Store, MessageCircle, BarChart3, ArrowRight, Check, Clock, Loader2 } from "lucide-react"
import type { User } from "@/lib/api"
import { authAPI } from "@/lib/api"
import { cn } from "@/lib/utils"

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
      <h1 className="text-2xl font-bold text-[var(--chidi-text-primary)] tracking-tight mb-2">
        {title}
      </h1>
      <p className="text-[var(--chidi-text-secondary)] text-sm">{subtitle}</p>
    </div>
  )
}

export function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Check if user needs to set their name (magic link users have placeholder name)
  const needsNameUpdate = user.name === PLACEHOLDER_NAME || 
    (typeof window !== 'undefined' && localStorage.getItem('chidi_needs_name_update') === 'true')
  
  const [userData, setUserData] = useState({
    name: user.name === PLACEHOLDER_NAME ? "" : user.name,  // Empty if placeholder, otherwise prefill
    businessName: "",
    phone: "",
    categories: [] as string[],
    whatsappNumber: "",
    instagramHandle: "",
  })
  const [nameError, setNameError] = useState("")
  
  // Clear the needs_name_update flag when component unmounts or user completes onboarding
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('chidi_needs_name_update')
      }
    }
  }, [])

  const totalSteps = 4

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
      // Complete onboarding by calling the API (step 4 is the last step)
      setIsLoading(true)
      try {
        const response = await authAPI.completeOnboarding({
          name: needsNameUpdate ? userData.name.trim() : undefined,  // Only send name if it needs updating
          business_name: userData.businessName,
          business_industry: selectedCategories.length > 0 ? selectedCategories[0] : undefined,
          phone: userData.phone,
          categories: selectedCategories,
          whatsapp_number: userData.whatsappNumber,
          instagram_handle: userData.instagramHandle
        })
        
        // Call the parent completion handler with the API response
        // This will redirect directly to the dashboard
        // Use updated name if user needed to set it, otherwise use original name
        const finalName = needsNameUpdate ? userData.name.trim() : user.name
        onComplete({
          ...response.user,
          name: finalName,
          businessName: userData.businessName,
          ownerName: finalName,
          business_id: response.business_id,
          workspace_id: response.workspace_id,
          inventory_id: response.inventory_id,
          businessSlug: response.businessSlug
        })
      } catch (error) {
        console.error('Onboarding completion failed:', error)
        // Fallback to local completion if API fails
        onComplete({
          ...user,
          ...userData,
          categories: selectedCategories,
          ownerName: user.name,
        })
      } finally {
        setIsLoading(false)
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
  }

  const handleSkip = () => {
    onComplete({
      ...user,
      ownerName: user.name,
      businessName: userData.businessName || "My Business",
      phone: userData.phone || "",
      categories: selectedCategories.length > 0 ? selectedCategories : ["other"],
    })
  }

  // Step 1: Welcome Screen
  if (step === 1) {
    // Use generic greeting if user has placeholder name
    const welcomeTitle = needsNameUpdate 
      ? "Welcome to Chidi!" 
      : `Welcome to Chidi, ${user.name}!`
    
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-in fade-in duration-500">
          <ProgressBar currentStep={step} totalSteps={totalSteps} />

          <OnboardingHeader 
            title={welcomeTitle}
            subtitle="Set up your AI business assistant in just a few steps"
          />

          {/* Features */}
          <div className="grid grid-cols-1 gap-3 mb-8">
            <div className="flex items-center p-4 bg-[var(--chidi-surface)] rounded-xl border border-[var(--chidi-border-subtle)]">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-4 border border-[var(--chidi-border-subtle)]">
                <Store className="w-6 h-6 text-[var(--chidi-text-secondary)]" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--chidi-text-primary)] mb-0.5">Manage Inventory</h3>
                <p className="text-sm text-[var(--chidi-text-muted)]">Track products, stock levels, and get low-stock alerts</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-[var(--chidi-surface)] rounded-xl border border-[var(--chidi-border-subtle)]">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-4 border border-[var(--chidi-border-subtle)]">
                <MessageCircle className="w-6 h-6 text-[var(--chidi-text-secondary)]" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--chidi-text-primary)] mb-0.5">AI Customer Chat</h3>
                <p className="text-sm text-[var(--chidi-text-muted)]">Auto-respond to WhatsApp and Instagram messages</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-[var(--chidi-surface)] rounded-xl border border-[var(--chidi-border-subtle)]">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mr-4 border border-[var(--chidi-border-subtle)]">
                <BarChart3 className="w-6 h-6 text-[var(--chidi-text-secondary)]" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--chidi-text-primary)] mb-0.5">Sales Analytics</h3>
                <p className="text-sm text-[var(--chidi-text-muted)]">Real-time insights on revenue and customer behavior</p>
              </div>
            </div>
          </div>

          {/* Quick Setup Notice */}
          <div className="flex items-center p-4 bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] rounded-xl mb-8">
            <Clock className="w-5 h-5 text-[var(--chidi-text-muted)] mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-[var(--chidi-text-primary)] text-sm mb-0.5">Quick Setup</h4>
              <p className="text-xs text-[var(--chidi-text-muted)]">This will only take 2 minutes. You can always customize later.</p>
            </div>
          </div>

          <Button
            onClick={handleNext}
            className="w-full bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-[var(--chidi-accent-foreground)] h-12 font-medium transition-all duration-200 rounded-xl"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
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
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-in fade-in duration-500">
          <ProgressBar currentStep={step} totalSteps={totalSteps} />

          <OnboardingHeader 
            title={needsNameUpdate ? "Let's get to know you" : "Tell us about your business"}
            subtitle={needsNameUpdate ? "First, tell us your name, then about your business" : "This helps Chidi personalize your experience"}
          />

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
                onChange={(e) => handleInputChange("businessName", e.target.value)}
                className="bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12"
              />
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
                className="flex-1 bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-[var(--chidi-accent-foreground)] h-12 font-medium transition-all duration-200 rounded-xl"
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
    const businessTypes = [
      { id: "fashion", label: "Fashion & Clothing", icon: "👗" },
      { id: "electronics", label: "Electronics", icon: "📱" },
      { id: "beauty", label: "Beauty & Cosmetics", icon: "💄" },
      { id: "food", label: "Food & Beverages", icon: "🍔" },
      { id: "home", label: "Home & Living", icon: "🏠" },
      { id: "other", label: "Other", icon: "📦" },
    ]

    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-in fade-in duration-500">
          <ProgressBar currentStep={step} totalSteps={totalSteps} />

          <OnboardingHeader 
            title="What type of business do you run?"
            subtitle="We'll set up relevant product categories for you"
          />

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
              className="flex-1 bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-[var(--chidi-accent-foreground)] h-12 font-medium transition-all duration-200 rounded-xl"
              disabled={selectedCategories.length === 0}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Connect Channels
  if (step === 4) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-in fade-in duration-500">
          <ProgressBar currentStep={step} totalSteps={totalSteps} />

          <OnboardingHeader 
            title="Connect your channels"
            subtitle="Link WhatsApp and Instagram to start receiving messages"
          />

          {/* Form */}
          <div className="space-y-5 mb-6">
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                WhatsApp Business Number <span className="text-[var(--chidi-text-muted)]">(Optional)</span>
              </Label>
              <Input
                id="whatsappNumber"
                placeholder="e.g., +234 801 234 5678"
                value={userData.whatsappNumber}
                onChange={(e) => handleInputChange("whatsappNumber", e.target.value)}
                className="bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instagramHandle" className="text-[var(--chidi-text-primary)] text-sm font-medium">
                Instagram Handle <span className="text-[var(--chidi-text-muted)]">(Optional)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--chidi-text-muted)]">@</span>
                <Input
                  id="instagramHandle"
                  placeholder="e.g., bellasfashion"
                  value={userData.instagramHandle}
                  onChange={(e) => handleInputChange("instagramHandle", e.target.value)}
                  className="bg-white border-[var(--chidi-border-default)] text-[var(--chidi-text-primary)] placeholder:text-[var(--chidi-text-muted)] focus:ring-2 focus:ring-[var(--chidi-accent)]/20 focus:border-[var(--chidi-accent)] h-12 pl-8"
                />
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-[var(--chidi-surface)] rounded-xl p-4 border border-[var(--chidi-border-subtle)] mb-8">
            <h4 className="font-medium text-[var(--chidi-text-primary)] text-sm mb-2">What happens next?</h4>
            <ul className="text-sm text-[var(--chidi-text-muted)] space-y-1">
              <li>• You'll be able to connect these channels from Settings</li>
              <li>• Chidi will start monitoring for customer messages</li>
              <li>• AI will help respond to common questions automatically</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex-1 h-12 font-medium rounded-xl border-[var(--chidi-border-default)] text-[var(--chidi-text-secondary)] hover:bg-[var(--chidi-surface)]"
              disabled={isLoading}
            >
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 bg-[var(--chidi-accent)] hover:bg-[var(--chidi-accent)]/90 text-[var(--chidi-accent-foreground)] h-12 font-medium transition-all duration-200 rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Complete Setup
                  <Check className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Fallback - should not reach here
  return null
}
