"use client"

import { useState, useEffect } from "react"
import { DesktopSidebar } from "@/components/chidi/desktop-sidebar"
import { DesktopHeader } from "@/components/chidi/desktop-header"
import ChatInterface from "@/components/chidi/home-tab"
import { Onboarding } from "@/components/chidi/onboarding"
import { CatalogTab } from "@/components/chidi/catalog-tab"
import { SettingsTab } from "@/components/chidi/settings-tab"
import { AuthScreen } from "@/components/auth/auth-screen"
import { AddProductModal } from "@/components/chidi/add-product-modal"
import { QuickEditModal } from "@/components/chidi/quick-edit-modal"
import { ProductDetailPage } from "@/components/chidi/product-detail-page"
import { ProfileEditModal } from "@/components/chidi/profile-edit-modal"
import { ProductDetailModal } from "@/components/chidi/product-detail-modal"
import { WhisperModePanel } from "@/components/chidi/whisper-mode-panel"
import { VoiceInput } from "@/components/chidi/voice-input"
import { NotificationDropdown } from "@/components/chidi/notification-dropdown"
import { BulkCSVImport } from "@/components/chidi/bulk-csv-import"
import { authAPI, productsAPI, conversationsAPI, type User } from "@/lib/api"
import type { Product } from "@/lib/types"

interface APIError {
  message: string;
  status: number;
}

interface Notification {
  id: string;
  type: 'system' | 'activity' | 'message';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high';
}


export default function ChidiApp() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("home")
  const [products, setProducts] = useState<Product[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentView, setCurrentView] = useState("main")
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
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

  // Close sidebar overlay with Escape key (helpful on small screens)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sidebarCollapsed) {
        setSidebarCollapsed(true)
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [sidebarCollapsed])

  // Authentication check on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true)
        if (authAPI.isAuthenticated()) {
          const userData = await authAPI.getMe()
          setUser(userData)
          setIsAuthenticated(true)
          
          if (!userData.businessName) {
            setShowOnboarding(true)
          } else {
            setShowOnboarding(false)
            // Load all data after authentication
            await loadAppData()
          }
        } else {
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setIsAuthenticated(false)
        setApiError('Authentication failed')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

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

  // Analytics removed - no longer needed without orders/customers

  // Removed webhook polling - payment status updates will come from external backend

  const handleAuthSuccess = async (user: User, isNewUser: boolean = false) => {
    setUser(user)
    setIsLoading(false)
    setIsAuthenticated(true)

    // Only show onboarding for new users (signup) or users without business info
    if (isNewUser || !user.businessName) {
      setShowOnboarding(true)
    } else {
      setShowOnboarding(false)
      // Load app data after successful authentication (login)
      await loadAppData()
    }
  }

  const handleOnboardingComplete = async (userData: any) => {
    try {
      const updatedUser = await authAPI.updateProfile({
        ...user,
        businessName: userData.businessName,
        name: userData.ownerName
      })
      
      setUser(updatedUser)
      setShowOnboarding(false)

      const welcomeNotification: Notification = {
        id: `welcome-${Date.now()}`,
        type: 'system',
        title: 'Welcome to CHIDI!',
        message: `Hi ${userData.ownerName}! Your AI business assistant is ready to help you manage ${userData.businessName}.`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'low'
      }
      setNotifications((prev) => [welcomeNotification, ...prev])
      
      // Load app data after onboarding
      await loadAppData()
    } catch (error) {
      console.error('Onboarding update failed:', error)
      setApiError('Failed to update profile')
    }
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      // Clear all state regardless of API response
      setUser(null)
      setIsAuthenticated(false)
      setShowOnboarding(false)
      setNotifications([])
      setProducts([])
      setConversations([])
      setApiError(null)
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

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product)
    setShowQuickEditModal(true)
  }

  const handleUpdateProduct = async (updatedProduct: any) => {
    try {
      const originalProduct = products.find((p) => p.id === updatedProduct.id)
      const updated = await productsAPI.updateProduct(updatedProduct.id, updatedProduct)
      
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

  const handleViewProduct = (product: any) => {
    setSelectedProduct(product)
    setCurrentView("product-detail")
  }

  // Sales-related view handlers removed

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

  const handleOpenProductModal = (product: any) => {
    setSelectedProduct(product)
    setShowProductDetailModal(true)
  }

  // Customer recovery function removed

  // Chat message handler simplified - removed customer context

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />
  }

  if (showOnboarding) {
    return <Onboarding user={user!} onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* New Chat Sidebar */}
      <DesktopSidebar
        activeSection={activeTab === 'catalog' ? 'inventory' : 'chat'}
        onSectionChange={(section) => {
          if (section === 'inventory') setActiveTab('catalog')
          else setActiveTab('home')
        }}
        onNewChat={() => {
          setActiveTab('home')
          // Could trigger a new chat creation here
        }}
        onSettingsClick={() => setShowProfile(true)}
        user={user}
        chatHistory={[]} // TODO: Implement chat history state
        onChatSelect={(chatId) => {
          // TODO: Handle chat selection
          setActiveTab('home')
        }}
        activeChatId={undefined} // TODO: Track active chat
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden bg-gray-950">
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
  )
}
