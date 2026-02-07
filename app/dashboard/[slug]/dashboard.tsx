'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DesktopSidebar, SidebarProvider, MobileSidebarTrigger } from '@/components/chidi/desktop-sidebar'
import { DesktopHeader } from '@/components/chidi/desktop-header'
import ChatInterface from '@/components/chidi/home-tab'
import { CatalogTab } from '@/components/chidi/catalog-tab'
import { AddProductModal } from '@/components/chidi/add-product-modal'
import { QuickEditModal } from '@/components/chidi/quick-edit-modal'
import { ProductDetailPage } from '@/components/chidi/product-detail-page'
import { ProfileEditModal } from '@/components/chidi/profile-edit-modal'
import { ProductDetailModal } from '@/components/chidi/product-detail-modal'
import { WhisperModePanel } from '@/components/chidi/whisper-mode-panel'
import { VoiceInput } from '@/components/chidi/voice-input'
import { NotificationDropdown } from '@/components/chidi/notification-dropdown'
import { BulkCSVImport } from '@/components/chidi/bulk-csv-import'
import { authAPI, productsAPI, conversationsAPI, type User } from '@/lib/api'
import { setStoredInventoryId } from '@/lib/api/products'
import type { DisplayProduct } from '@/lib/types/product'
import { Loader2 } from 'lucide-react'

interface Notification {
  id: string;
  type: 'system' | 'activity' | 'message';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high';
}

export default function SlugDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const businessSlug = params.slug as string
  
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("home")
  const [products, setProducts] = useState<DisplayProduct[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentView, setCurrentView] = useState("main")
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
  const [showVoiceInput, setShowVoiceInput] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [showWhisperMode, setShowWhisperMode] = useState(false)

  // Authentication check on page load
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

        // Validate that the slug matches the user's business slug
        if (userData.businessSlug && userData.businessSlug !== businessSlug) {
          console.log('🔄 [DASHBOARD] Slug mismatch, redirecting to correct slug:', userData.businessSlug)
          router.push(`/dashboard/${userData.businessSlug}`)
          return
        }

        // Load dashboard data
        await loadAppData()
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
      
      // Load data in parallel for better performance
      const [productsRes, conversationsRes] = await Promise.allSettled([
        productsAPI.getProducts(),
        conversationsAPI.getConversations()
      ])

      if (productsRes.status === 'fulfilled') {
        setProducts(productsRes.value.products)
      }
      
      if (conversationsRes.status === 'fulfilled') {
        setConversations(conversationsRes.value.conversations)
      }
      
      // Add welcome notification for first load
      setNotifications([{
        id: `welcome-${Date.now()}`,
        type: 'system',
        title: 'Welcome',
        message: 'Welcome to CHIDI! Your AI business assistant is ready to help.',
        timestamp: new Date().toISOString(),
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

  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const handleEditProduct = (product: DisplayProduct) => {
    setSelectedProduct(product)
    setShowQuickEditModal(true)
  }

  const handleUpdateProduct = async (updatedProduct: DisplayProduct) => {
    try {
      const originalProduct = products.find((p) => p.id === updatedProduct.id)
      const updated = await productsAPI.updateProduct(updatedProduct.id, {
        name: updatedProduct.name,
        selling_price: updatedProduct.sellingPrice,
        cost_price: updatedProduct.costPrice,
        stock_quantity: updatedProduct.stock,
        category: updatedProduct.category,
        description: updatedProduct.description,
      })
      
      setProducts((prev) => prev.map((product) => (product.id === updatedProduct.id ? updated : product)))

      if (originalProduct && updated.stock > originalProduct.stock) {
        const notification: Notification = {
          id: `restock-${Date.now()}`,
          type: 'activity',
          title: 'Product Restocked',
          message: `${updated.name} restocked from ${originalProduct.stock} to ${updated.stock} units`,
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'medium'
        }
        setNotifications((prev) => [notification, ...prev])
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
    setCurrentView("product-detail")
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
      
      const notification: Notification = {
        id: `import-${Date.now()}`,
        type: 'activity',
        title: 'Bulk Import Complete',
        message: `${result.imported} products imported successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'medium'
      }
      setNotifications((prev) => [notification, ...prev])
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
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
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
            setActiveTab('home')
          }}
          onSettingsClick={() => {
            console.log('🔧 [DASHBOARD] Settings click handler called')
            console.log('🔧 [DASHBOARD] businessSlug:', businessSlug)
            const settingsUrl = `/dashboard/${businessSlug}/settings`
            console.log('🔧 [DASHBOARD] Navigating to:', settingsUrl)
            try {
              router.push(settingsUrl)
              console.log('🔧 [DASHBOARD] router.push called successfully')
            } catch (err) {
              console.error('🔧 [DASHBOARD] router.push error:', err)
            }
          }}
          user={user}
          chatHistory={[]}
          onChatSelect={(chatId) => {
            setActiveTab('home')
          }}
          activeChatId={undefined}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-950">
          {/* Mobile Header with sidebar toggle */}
          <div className="md:hidden flex items-center gap-2 p-3 border-b border-gray-800">
            <MobileSidebarTrigger />
            <span className="text-white font-semibold">CHIDI</span>
          </div>
        {activeTab === "home" ? (
          <ChatInterface />
        ) : activeTab === "catalog" ? (
          <div className="mx-auto max-w-7xl p-6 w-full">
            <CatalogTab
              products={products}
              onAddProduct={() => setShowAddProductModal(true)}
              onEditProduct={handleEditProduct}
              onViewProduct={handleViewProduct}
              onBulkExport={handleBulkExport}
            />
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
          product={selectedProduct}
          onClose={() => {
            setShowProductDetailModal(false)
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
