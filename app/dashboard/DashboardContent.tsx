'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DesktopSidebar, SidebarProvider, MobileSidebarTrigger } from '@/components/chidi/desktop-sidebar'
import ChatInterface from '@/components/chidi/home-tab'
import { CatalogTab } from '@/components/chidi/catalog-tab'
import { BusinessProfileContent } from '@/components/chidi/business-profile-content'
import { AddProductModal } from '@/components/chidi/add-product-modal'
import { EditProductModal } from '@/components/chidi/edit-product-modal'
import { QuickEditModal } from '@/components/chidi/quick-edit-modal'
import { ProductDetailModal } from '@/components/chidi/product-detail-modal'
import { BulkCSVImport } from '@/components/chidi/bulk-csv-import'
import { authAPI, productsAPI, type User } from '@/lib/api'
import type { DisplayProduct } from '@/lib/types/product'
import { Loader2, Menu, X, Sparkles } from 'lucide-react'
import { useConversationList } from '@/hooks/use-conversation-list'
import type { ConversationResponse } from '@/lib/types/conversation'
import { useNotifications, mapNotificationForUI, type MappedNotification } from '@/hooks/use-notifications'
import { getStoredInventoryId } from '@/lib/api/products'

interface DashboardContentProps {
  businessSlug?: string;
}

export default function DashboardContent({ businessSlug }: DashboardContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("home")
  const [products, setProducts] = useState<DisplayProduct[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [localNotifications, setLocalNotifications] = useState<MappedNotification[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentView, setCurrentView] = useState("main")
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined)
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false)

  // Use conversation list hook for chat history
  const {
    conversations: chatConversations,
    isLoading: conversationsLoading,
    loadConversations,
    addConversation,
  } = useConversationList(false) // Don't auto-load, we'll load after auth

  // Use notifications hook for real-time notifications
  const inventoryId = typeof window !== 'undefined' ? getStoredInventoryId() : null
  const {
    notifications: apiNotifications,
    unreadCount,
    isLoading: notificationsLoading,
    markAsRead: markNotificationAsRead,
    markAllAsRead,
    dismiss: dismissNotification,
    checkLowStock,
  } = useNotifications({
    userId: user?.id || null,
    businessId: user?.businessId || null,
    inventoryId: inventoryId,
    enableRealtime: true,
    autoCheckLowStock: true,
  })

  // Combine API notifications with local notifications
  const notifications = [
    ...apiNotifications.map(mapNotificationForUI),
    ...localNotifications,
  ]
  const [selectedProduct, setSelectedProduct] = useState<DisplayProduct | null>(null)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [showQuickEditModal, setShowQuickEditModal] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showProfileEditModal, setShowProfileEditModal] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showBusinessHours, setShowBusinessHours] = useState(false)
  const [showIntegrations, setShowIntegrations] = useState(false)
  const [showDataExport, setShowDataExport] = useState(false)
  const [showProductDetailModal, setShowProductDetailModal] = useState(false)
  const [showEditProductModal, setShowEditProductModal] = useState(false)
  const [showVoiceInput, setShowVoiceInput] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [showWhisperMode, setShowWhisperMode] = useState(false)

  // Check for welcome parameter (from onboarding redirect)
  useEffect(() => {
    const welcome = searchParams.get('welcome')
    if (welcome === 'true') {
      setShowWelcomeBanner(true)
      // Remove the query param from URL without refresh
      const url = new URL(window.location.href)
      url.searchParams.delete('welcome')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [searchParams])

  // Authentication check on page load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!authAPI.isAuthenticated()) {
          router.push('/auth')
          return
        }

        const userData = await authAPI.getMe()
        console.log('👤 [DASHBOARD] userData from getMe():', userData)
        console.log('👤 [DASHBOARD] businessName:', userData.businessName)
        console.log('👤 [DASHBOARD] businessSlug:', userData.businessSlug)
        setUser(userData)
        
        // Check if user needs onboarding
        if (!userData.businessName) {
          console.log('⚠️ [DASHBOARD] No businessName found, redirecting to onboarding')
          router.push('/onboarding')
          return
        }
        console.log('✅ [DASHBOARD] businessName found:', userData.businessName)

        // Validate slug matches user's business (redirect if mismatch)
        if (businessSlug && userData.businessSlug && userData.businessSlug !== businessSlug) {
          console.log('🔄 [DASHBOARD] Slug mismatch, redirecting to correct slug:', userData.businessSlug)
          router.push(`/dashboard/${userData.businessSlug}`)
          return
        }

        console.log('✅ [DASHBOARD] Slug validated, loading dashboard for:', businessSlug)

        // Load dashboard data
        await loadAppData()
        // Load conversations after auth
        await loadConversations()
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/auth')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, businessSlug])

  // Load all app data from APIs
  const loadAppData = async () => {
    try {
      setDataLoading(true)
      setApiError(null)
      
      // Load products
      const productsRes = await productsAPI.getProducts()
      setProducts(productsRes.products)
      
      // Add welcome notification for first load (local notification)
      setLocalNotifications([{
        id: `welcome-${Date.now()}`,
        type: 'system',
        title: 'Welcome',
        message: 'Welcome to CHIDI! Your AI business assistant is ready to help.',
        timestamp: 'Just now',
        read: false,
        priority: 'low'
      }])
      
    } catch (error) {
      console.error('Failed to load app data:', error)
      setApiError('Failed to load data')
    } finally {
      setDataLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      // Clear all state and redirect to auth
      router.push('/auth')
    }
  }

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications)
  }

  const handleMarkNotificationAsRead = async (id: string) => {
    // Check if it's a local notification or API notification
    const isLocalNotification = localNotifications.some(n => n.id === id)
    if (isLocalNotification) {
      setLocalNotifications((prev) =>
        prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
      )
    } else {
      await markNotificationAsRead(id)
    }
  }

  const handleEditProduct = (product: DisplayProduct) => {
    setSelectedProduct(product)
    setShowQuickEditModal(true)
  }

  const handleUpdateProduct = async (updatedProduct: DisplayProduct) => {
    try {
      const originalProduct = products.find((p) => p.id === updatedProduct.id)
      const updated = await productsAPI.updateProduct(updatedProduct.id, updatedProduct)
      
      setProducts((prev) => prev.map((product) => (product.id === updatedProduct.id ? updated : product)))

      if (originalProduct && updated.stock > originalProduct.stock) {
        const notification: MappedNotification = {
          id: `restock-${Date.now()}`,
          type: 'activity',
          title: 'Product Restocked',
          message: `${updated.name} restocked from ${originalProduct.stock} to ${updated.stock} units`,
          timestamp: 'Just now',
          read: false,
          priority: 'medium'
        }
        setLocalNotifications((prev) => [notification, ...prev])
      }
      
      setShowQuickEditModal(false)
      setSelectedProduct(null)
    } catch (error) {
      console.error('Failed to update product:', error)
      setApiError('Failed to update product')
    }
  }

  const handleBulkExport = () => {
    // Implement bulk export functionality here
  }

  const handleViewProduct = (product: DisplayProduct) => {
    setSelectedProduct(product)
    setShowProductDetailModal(true)
  }

  const handleEditProfile = () => {
    setShowEditProfile(true)
  }

  const handleManageTemplates = () => {
    setShowTemplateManager(true)
  }

  const handleManageBusinessHours = () => {
    setShowBusinessHours(true)
  }

  const handleManageIntegrations = () => {
    setShowIntegrations(true)
  }

  const handleDataExport = () => {
    setShowDataExport(true)
  }

  const handleAddTeamMember = (member: any) => {
    setTeamMembers((prev) => [...prev, member])
  }

  const handleBulkImport = async (csvData: string) => {
    try {
      const result = await productsAPI.bulkImport(csvData)
      // Reload products after bulk import
      const updatedProducts = await productsAPI.getProducts()
      setProducts(updatedProducts.products)
      
      const notification: MappedNotification = {
        id: `import-${Date.now()}`,
        type: 'activity',
        title: 'Bulk Import Complete',
        message: `${result.imported} products imported successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        timestamp: 'Just now',
        read: false,
        priority: 'medium'
      }
      setLocalNotifications((prev) => [notification, ...prev])
    } catch (error) {
      console.error('Failed to import products:', error)
      setApiError('Failed to import products')
    }
  }

  const handleOpenProductModal = (product: DisplayProduct) => {
    setSelectedProduct(product)
    setShowProductDetailModal(true)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-gray-950">
        {/* Skeleton Sidebar */}
        <div className="w-64 border-r border-gray-800 bg-gray-900 p-4 hidden md:block">
          {/* Logo skeleton */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-gray-700 rounded-lg animate-pulse" />
            <div className="w-16 h-4 bg-gray-700 rounded animate-pulse" />
          </div>
          {/* Nav items skeleton */}
          <div className="space-y-2">
            <div className="w-full h-10 bg-gray-800 rounded-lg animate-pulse" />
            <div className="w-full h-10 bg-gray-800 rounded-lg animate-pulse" />
            <div className="w-full h-10 bg-gray-800 rounded-lg animate-pulse" />
          </div>
          {/* Chat history skeleton */}
          <div className="mt-6 space-y-2">
            <div className="w-12 h-3 bg-gray-700 rounded animate-pulse mb-3" />
            <div className="w-full h-8 bg-gray-800 rounded animate-pulse" />
            <div className="w-full h-8 bg-gray-800 rounded animate-pulse" />
            <div className="w-3/4 h-8 bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
        {/* Skeleton Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl animate-pulse mb-6" />
          <div className="w-48 h-6 bg-gray-800 rounded animate-pulse mb-8" />
          <div className="w-full max-w-xl px-4">
            <div className="w-full h-14 bg-gray-800 rounded-xl animate-pulse" />
          </div>
          <p className="text-gray-500 text-sm mt-4">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden bg-gray-950">
        {/* Sidebar */}
        <DesktopSidebar
          activeSection={activeTab === 'catalog' ? 'inventory' : 'chat'}
          onSectionChange={(section) => {
            if (section === 'inventory') setActiveTab('catalog')
            else setActiveTab('home')
          }}
          onNewChat={() => {
            setActiveConversationId(undefined) // Clear active conversation for new chat
            setActiveTab('home')
          }}
          onSettingsClick={() => {
            const slug = businessSlug || user?.businessSlug
            console.log('🔧 [DASHBOARD] Navigating to settings, slug:', slug)
            if (slug) {
              router.push(`/dashboard/${slug}/settings`)
            } else {
              console.error('🔧 [DASHBOARD] No business slug available')
            }
          }}
          onBusinessProfileClick={() => setActiveTab('business-profile')}
          user={user}
          chatHistory={chatConversations.map(conv => ({
            id: conv.id,
            title: conv.title,
            lastMessage: conv.lastMessage || '',
            timestamp: conv.lastActivity.toLocaleDateString()
          }))}
          onChatSelect={(chatId) => {
            setActiveConversationId(chatId)
            setActiveTab('home')
          }}
          activeChatId={activeConversationId}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-950">
          {/* Mobile Header with sidebar toggle */}
          <div className="md:hidden flex items-center gap-2 p-3 border-b border-gray-800">
            <MobileSidebarTrigger />
            <span className="text-white font-semibold">CHIDI</span>
          </div>

          {/* Welcome Banner - shows after onboarding */}
          {showWelcomeBanner && (
            <div className="mx-4 mt-4 mb-2 animate-in slide-in-from-top-2 duration-300">
              <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 shadow-lg">
                <button
                  onClick={() => setShowWelcomeBanner(false)}
                  className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div className="pr-8">
                    <h3 className="text-white font-semibold text-lg mb-1">
                      Welcome to CHIDI, {user?.name?.split(' ')[0] || 'there'}! 🎉
                    </h3>
                    <p className="text-white/80 text-sm">
                      Your AI business assistant is ready. Start by chatting below or add products to your catalog.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        {activeTab === "home" ? (
          <ChatInterface
            conversationId={activeConversationId}
            onConversationCreated={(conversation) => {
              addConversation(conversation)
              setActiveConversationId(conversation.id)
            }}
          />
        ) : activeTab === "catalog" ? (
          <CatalogTab
            products={products}
            onAddProduct={() => setShowAddProductModal(true)}
            onEditProduct={handleEditProduct}
            onViewProduct={handleViewProduct}
            onBulkExport={handleBulkExport}
          />
        ) : activeTab === "business-profile" ? (
          <div className="h-full overflow-auto">
            <BusinessProfileContent businessSlug={user?.businessSlug || businessSlug || ''} embedded={true} />
          </div>
        ) : activeTab === "settings" ? (
          <div className="mx-auto max-w-7xl p-6 w-full">
            <div className="text-white">Settings view coming soon...</div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-white">Select a section from the sidebar</div>
          </div>
        )}
        </main>
      </div>

      {/* Modals */}
      {showAddProductModal && (
        <AddProductModal
          isOpen={showAddProductModal}
          onClose={() => setShowAddProductModal(false)}
          onAddProduct={(product) => {
            setProducts((prev) => [...prev, product])
            setShowAddProductModal(false)
          }}
        />
      )}

      {showQuickEditModal && selectedProduct && (
        <QuickEditModal
          product={selectedProduct}
          onClose={() => {
            setShowQuickEditModal(false)
            setSelectedProduct(null)
          }}
          onSave={handleUpdateProduct}
        />
      )}

      {showProductDetailModal && selectedProduct && (
        <ProductDetailModal
          isOpen={showProductDetailModal}
          product={selectedProduct}
          onClose={() => {
            setShowProductDetailModal(false)
            setSelectedProduct(null)
          }}
          onEditProduct={(product) => {
            setShowProductDetailModal(false)
            setSelectedProduct(product)
            setShowEditProductModal(true)
          }}
          onDeleteProduct={(productId) => {
            setProducts((prev) => prev.filter((p) => p.id !== productId))
            setShowProductDetailModal(false)
            setSelectedProduct(null)
          }}
        />
      )}

      {showEditProductModal && selectedProduct && (
        <EditProductModal
          isOpen={showEditProductModal}
          product={selectedProduct}
          onClose={() => {
            setShowEditProductModal(false)
            setSelectedProduct(null)
          }}
          onSave={(updatedProduct) => {
            setProducts((prev) => 
              prev.map((p) => p.id === updatedProduct.id ? updatedProduct : p)
            )
            setShowEditProductModal(false)
            setSelectedProduct(null)
          }}
        />
      )}

      {showBulkImport && (
        <BulkCSVImport
          onClose={() => setShowBulkImport(false)}
          onImport={handleBulkImport}
        />
      )}
    </SidebarProvider>
  )
}
