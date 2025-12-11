"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Zap, Store, MessageCircle, BarChart3, ArrowRight, Check, Smartphone, Clock } from "lucide-react"
import type { User } from "@/lib/api"
import { authAPI } from "@/lib/api"

interface OnboardingProps {
  user: User
  onComplete: (userData: any) => void
}

export function Onboarding({ user, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState({
    businessName: "",
    phone: "",
    categories: [] as string[],
    whatsappNumber: "",
    instagramHandle: "",
  })

  const totalSteps = 5

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      // Complete onboarding by calling the API
      setIsLoading(true)
      try {
        const response = await authAPI.completeOnboarding({
          business_name: userData.businessName,
          business_industry: selectedCategories.length > 0 ? selectedCategories[0] : undefined,
          phone: userData.phone,
          categories: selectedCategories,
          whatsapp_number: userData.whatsappNumber,
          instagram_handle: userData.instagramHandle
        })
        
        // Call the parent completion handler with the API response
        onComplete({
          ...response.user,
          businessName: userData.businessName,
          ownerName: user.name,
          business_id: response.business_id,
          workspace_id: response.workspace_id,
          inventory_id: response.inventory_id
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
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-in fade-in duration-500">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`w-8 h-1 rounded-full transition-all duration-300 ${
                    stepNum <= step ? 'bg-indigo-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Welcome to CHIDI, {user.name}!</h1>
            <p className="text-gray-400 text-sm">Set up your AI business assistant in just a few steps</p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 gap-4 mb-8">
            <div className="flex items-center p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center mr-4">
                <Store className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Manage Inventory</h3>
                <p className="text-sm text-gray-400">Track products, stock levels, and get low-stock alerts</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center mr-4">
                <MessageCircle className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">AI Customer Chat</h3>
                <p className="text-sm text-gray-400">Auto-respond to WhatsApp and Instagram messages</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center mr-4">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-medium text-white mb-1">Sales Analytics</h3>
                <p className="text-sm text-gray-400">Real-time insights on revenue and customer behavior</p>
              </div>
            </div>
          </div>

          {/* Quick Setup Notice */}
          <div className="flex items-center p-4 bg-indigo-900/20 border border-indigo-800 rounded-xl mb-8">
            <Clock className="w-5 h-5 text-indigo-400 mr-3" />
            <div>
              <h4 className="font-medium text-white text-sm mb-1">Quick Setup</h4>
              <p className="text-xs text-gray-400">This will only take 2 minutes. You can always customize later.</p>
            </div>
          </div>

          <Button
            onClick={handleNext}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 font-medium transition-all duration-200"
          >
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // Step 2: Business Details
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-in fade-in duration-500">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`w-8 h-1 rounded-full transition-all duration-300 ${
                    stepNum <= step ? 'bg-indigo-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Tell us about your business</h1>
            <p className="text-gray-400 text-sm">This helps CHIDI personalize your experience</p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-gray-300 text-sm font-medium">
                Business Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="businessName"
                placeholder="e.g., Bella's Fashion Store"
                value={userData.businessName}
                onChange={(e) => handleInputChange("businessName", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300 text-sm font-medium">
                Phone Number <span className="text-red-400">*</span>
              </Label>
              <Input
                id="phone"
                placeholder="e.g., +234 801 234 5678"
                value={userData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12"
              />
            </div>

            <Button
              onClick={handleNext}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 font-medium transition-all duration-200 mt-8"
              disabled={!userData.businessName || !userData.phone}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Business Categories
  if (step === 3) {
    const categories = [
      { id: "fashion", label: "Fashion & Clothing", icon: "👗" },
      { id: "electronics", label: "Electronics", icon: "📱" },
      { id: "beauty", label: "Beauty & Cosmetics", icon: "💄" },
      { id: "food", label: "Food & Beverages", icon: "🍔" },
      { id: "home", label: "Home & Living", icon: "🏠" },
      { id: "other", label: "Other", icon: "📦" },
    ]

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-in fade-in duration-500">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`w-8 h-1 rounded-full transition-all duration-300 ${
                    stepNum <= step ? 'bg-indigo-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">What do you sell?</h1>
            <p className="text-gray-400 text-sm">This helps CHIDI understand your products better</p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryToggle(category.id)}
                className={`p-4 rounded-xl border transition-all duration-200 text-left ${
                  selectedCategories.includes(category.id)
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{category.icon}</span>
                  <span className="font-medium text-sm">{category.label}</span>
                </div>
              </button>
            ))}
          </div>

          <Button
            onClick={handleNext}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 font-medium transition-all duration-200"
            disabled={selectedCategories.length === 0}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // Step 4: Connect Channels
  if (step === 4) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-in fade-in duration-500">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`w-8 h-1 rounded-full transition-all duration-300 ${
                    stepNum <= step ? 'bg-indigo-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Connect your channels</h1>
            <p className="text-gray-400 text-sm">Link WhatsApp and Instagram to start receiving messages</p>
          </div>

          {/* Form */}
          <div className="space-y-6 mb-8">
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber" className="text-gray-300 text-sm font-medium">
                WhatsApp Business Number (Optional)
              </Label>
              <Input
                id="whatsappNumber"
                placeholder="e.g., +234 801 234 5678"
                value={userData.whatsappNumber}
                onChange={(e) => handleInputChange("whatsappNumber", e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instagramHandle" className="text-gray-300 text-sm font-medium">
                Instagram Handle (Optional)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                <Input
                  id="instagramHandle"
                  placeholder="e.g., bellasfashion"
                  value={userData.instagramHandle}
                  onChange={(e) => handleInputChange("instagramHandle", e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-12 pl-8"
                />
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-8">
            <h4 className="font-medium text-white text-sm mb-2">What happens next?</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• You'll be able to connect these channels from Settings</li>
              <li>• CHIDI will start monitoring for customer messages</li>
              <li>• AI will help respond to common questions automatically</li>
            </ul>
          </div>

          <Button
            onClick={handleNext}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 font-medium transition-all duration-200"
          >
            Complete Setup
            <Check className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  // Step 5: Completion (fallback)
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-in fade-in duration-500">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Setup Complete!</h1>
          <p className="text-gray-400 text-sm mb-8">Welcome to CHIDI. Let's get started with your business.</p>
          
          <Button
            onClick={handleNext}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 font-medium transition-all duration-200"
          >
            Enter Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
