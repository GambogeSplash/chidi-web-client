'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import { Loader2, MessageCircle, Bot, Package, CreditCard, Bell, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

// Activity ticker messages - updated per user feedback
const ACTIVITY_MESSAGES = [
  { icon: 'whatsapp', text: 'New WhatsApp order placed' },
  { icon: 'package', text: '5 items running out of stock' },
  { icon: 'whatsapp', text: 'New message from customer' },
  { icon: 'bot', text: 'Product catalog shared with customer' },
  { icon: 'payment', text: 'Payment confirmed for order: 12XXX' },
  { icon: 'bell', text: 'Daily summary alert' },
]

function ActivityIcon({ type }: { type: string }) {
  const iconClass = "w-3.5 h-3.5"
  switch (type) {
    case 'whatsapp':
      return <MessageCircle className={`${iconClass} text-green-600`} />
    case 'bot':
      return <Bot className={`${iconClass} text-neutral-700`} />
    case 'package':
      return <Package className={`${iconClass} text-amber-600`} />
    case 'payment':
      return <CreditCard className={`${iconClass} text-emerald-600`} />
    case 'bell':
      return <Bell className={`${iconClass} text-blue-600`} />
    case 'cart':
      return <ShoppingBag className={`${iconClass} text-purple-600`} />
    default:
      return <MessageCircle className={iconClass} />
  }
}

export default function HomePage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const [activityIndex, setActivityIndex] = useState(0)
  const [activityKey, setActivityKey] = useState(0)

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const isAuth = authAPI.isAuthenticated()
        
        if (!isAuth) {
          setIsChecking(false)
          setShowWelcome(true)
          return
        }

        const user = await authAPI.getMe()
        
        if (!user.businessName) {
          router.push('/onboarding')
        } else if (user.businessSlug) {
          router.push(`/dashboard/${user.businessSlug}`)
        } else {
          router.push('/onboarding')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsChecking(false)
        setShowWelcome(true)
      }
    }

    checkAuthAndRedirect()
  }, [router])

  // Cycle activity ticker
  useEffect(() => {
    if (!showWelcome) return

    const interval = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % ACTIVITY_MESSAGES.length)
      setActivityKey((prev) => prev + 1)
    }, 3000)

    return () => clearInterval(interval)
  }, [showWelcome])

  // Loading state
  if (isChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[var(--chidi-accent)] animate-spin mx-auto mb-4" />
          <p className="text-[var(--chidi-text-muted)]">Loading...</p>
        </div>
      </div>
    )
  }

  // Welcome screen with animated warm gradient background
  if (showWelcome) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-[#fafafa]">
        {/* Animated Background - warm, light, professional */}
        <div className="absolute inset-0 z-0">
          {/* Soft warm gradient base */}
          <div 
            className="absolute inset-0 animate-gradient-shift"
            style={{
              background: 'linear-gradient(-45deg, #fafafa, #f5f5f0, #faf8f5, #f8f8f8, #f5f0e8)',
              backgroundSize: '400% 400%',
            }}
          />
          
          {/* Floating orbs - warm neutrals and subtle accents */}
          <div 
            className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-amber-200/30 to-orange-100/20 blur-3xl animate-floating-orb"
            style={{ animationDelay: '0s' }}
          />
          <div 
            className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-br from-stone-200/40 to-neutral-100/30 blur-3xl animate-floating-orb"
            style={{ animationDelay: '-5s' }}
          />
          <div 
            className="absolute top-1/2 right-1/3 w-[350px] h-[350px] rounded-full bg-gradient-to-br from-rose-100/25 to-pink-50/20 blur-3xl animate-floating-orb"
            style={{ animationDelay: '-10s' }}
          />
          <div 
            className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-emerald-100/20 to-teal-50/15 blur-3xl animate-floating-orb"
            style={{ animationDelay: '-15s' }}
          />
          
          {/* Subtle dot pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage: `radial-gradient(circle, #d4d4d4 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        {/* Content */}
        <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-8">
          {/* Hero Section */}
          <div className="text-center mb-8 max-w-md">
            {/* Brand */}
            <h1 
              className="text-6xl sm:text-7xl font-bold text-[var(--chidi-text-primary)] tracking-tight mb-6 animate-fade-scale-in"
              style={{ animationDelay: '0ms' }}
            >
              Chidi
            </h1>
            
            {/* Statement */}
            <p 
              className="text-xl sm:text-2xl text-[var(--chidi-text-primary)] font-medium mb-3 animate-fade-slide-up"
              style={{ animationDelay: '200ms' }}
            >
              Let's do business the Chidi way.
            </p>
            
            {/* Curiosity hook */}
            <p 
              className="text-base sm:text-lg text-[var(--chidi-text-secondary)] animate-fade-slide-up"
              style={{ animationDelay: '500ms' }}
            >
              Want to know what that means?
            </p>
          </div>

          {/* CTAs */}
          <div 
            className="w-full max-w-xs mb-8 animate-fade-slide-up"
            style={{ animationDelay: '800ms' }}
          >
            <Link
              href="/auth?tab=signup"
              className="group relative block w-full py-4 px-6 text-center rounded-xl bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)] font-semibold text-base overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/10 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="relative z-10">Get Started</span>
              {/* Subtle shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
          </div>

          <p 
            className="text-sm text-[var(--chidi-text-muted)] mb-12 animate-fade-slide-up"
            style={{ animationDelay: '1000ms' }}
          >
            Already have an account?{' '}
            <Link 
              href="/auth?tab=signin" 
              className="text-[var(--chidi-text-secondary)] hover:text-[var(--chidi-text-primary)] underline underline-offset-2 transition-colors font-medium"
            >
              Sign In
            </Link>
          </p>

          {/* Activity Ticker */}
          <div 
            className="w-full max-w-sm h-10 flex items-center justify-center mb-8 animate-fade-slide-up"
            style={{ animationDelay: '1200ms' }}
          >
            <div 
              key={activityKey}
              className="flex items-center gap-2.5 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-[var(--chidi-border-subtle)] shadow-sm animate-toast-cycle"
            >
              <ActivityIcon type={ACTIVITY_MESSAGES[activityIndex].icon} />
              <span className="text-sm text-[var(--chidi-text-secondary)] font-medium">
                {ACTIVITY_MESSAGES[activityIndex].text}
              </span>
            </div>
          </div>

          {/* Trust Line */}
          <p 
            className="text-xs text-[var(--chidi-text-muted)] text-center animate-fade-slide-up"
            style={{ animationDelay: '1400ms' }}
          >
            Trusted by businesses across Lagos, Accra, and Nairobi
          </p>
        </main>
      </div>
    )
  }

  return null
}
