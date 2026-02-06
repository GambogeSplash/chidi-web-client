'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  MessageCircle, 
  Settings, 
  Loader2,
  ArrowLeft
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { WhatsAppSettings } from '@/components/chidi/whatsapp-settings'
import { WhatsAppConversations } from '@/components/chidi/whatsapp-conversations'
import { authAPI, type User } from '@/lib/api'
import { whatsappAPI, type WhatsAppStatus } from '@/lib/api/whatsapp'

export default function WhatsAppPage() {
  const router = useRouter()
  const params = useParams()
  const businessSlug = params.slug as string
  
  const [user, setUser] = useState<User | null>(null)
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('conversations')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!authAPI.isAuthenticated()) {
          router.push('/auth')
          return
        }

        const userData = await authAPI.getMe()
        setUser(userData)
        
        // Check if user needs onboarding
        if (!userData.businessName) {
          router.push('/onboarding')
          return
        }

        // Validate slug
        if (userData.businessSlug && userData.businessSlug !== businessSlug) {
          router.push(`/dashboard/${userData.businessSlug}/whatsapp`)
          return
        }

        // Load WhatsApp status
        try {
          const status = await whatsappAPI.getStatus()
          setWhatsappStatus(status)
          
          // If not connected, show settings tab
          if (!status.connected) {
            setActiveTab('settings')
          }
        } catch (err) {
          console.error('Failed to load WhatsApp status:', err)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/auth')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, businessSlug])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading WhatsApp...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.push(`/dashboard/${businessSlug}`)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-green-500" />
                <h1 className="text-xl font-semibold text-white">WhatsApp</h1>
              </div>
            </div>
            
            {/* Connection Status Indicator */}
            {whatsappStatus && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  whatsappStatus.connected ? 'bg-green-500' : 'bg-gray-500'
                }`} />
                <span className="text-sm text-gray-400">
                  {whatsappStatus.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-800 border border-gray-700">
            <TabsTrigger 
              value="conversations" 
              className="data-[state=active]:bg-gray-700"
              disabled={!whatsappStatus?.connected}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Conversations
            </TabsTrigger>
            <TabsTrigger 
              value="settings"
              className="data-[state=active]:bg-gray-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations" className="mt-6">
            {whatsappStatus?.connected ? (
              <WhatsAppConversations />
            ) : (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">
                  Connect your WhatsApp Business number to start receiving messages
                </p>
                <Button onClick={() => setActiveTab('settings')}>
                  Go to Settings
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <WhatsAppSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
