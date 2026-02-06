'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/chidi/app-header'
import { BottomNavigation, type TabId } from '@/components/chidi/bottom-navigation'
import { InboxView } from '@/components/chidi/inbox-view'
import { OrdersView } from '@/components/chidi/orders-view'
import { InventoryView } from '@/components/chidi/inventory-view'
import { InsightsView } from '@/components/chidi/insights-view'
import { CopilotView } from '@/components/chidi/copilot-view'
import { AddProductModal } from '@/components/chidi/add-product-modal'
import { EditProductModal } from '@/components/chidi/edit-product-modal'
import { QuickEditModal } from '@/components/chidi/quick-edit-modal'
import { ProductDetailModal } from '@/components/chidi/product-detail-modal'
import { BulkCSVImport } from '@/components/chidi/bulk-csv-import'
import { authAPI, productsAPI, type User } from '@/lib/api'
import type { DisplayProduct } from '@/lib/types/product'
import { Loader2 } from 'lucide-react'
import type { ConversationResponse } from '@/lib/types/conversation'
import { useNotifications, mapNotificationForUI, type MappedNotification } from '@/hooks/use-notifications'
import { getStoredInventoryId } from '@/lib/api/products'

interface DashboardContentProps {
  businessSlug?: string;
}

export default function DashboardContent({ businessSlug }: DashboardContentProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>("inbox")
  const [products, setProducts] = useState<DisplayProduct[]>([])
  const [localNotifications, setLocalNotifications] = useState<MappedNotification[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined)

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
  const [showProductDetailModal, setShowProductDetailModal] = useState(false)
  const [showEditProductModal, setShowEditProductModal] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)

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

        // Validate slug matches user's business (redirect if mismatch)
        if (businessSlug && userData.businessSlug && userData.businessSlug !== businessSlug) {
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
      
      // Load products
      const productsRes = await productsAPI.getProducts()
      setProducts(productsRes.products)
      
    } catch (error) {
      console.error('Failed to load app data:', error)
      setApiError('Failed to load data')
    } finally {
      setDataLoading(false)
    }
  }

  const handleMarkNotificationAsRead = async (id: string) => {
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

  const handleViewProduct = (product: DisplayProduct) => {
    setSelectedProduct(product)
    setShowProductDetailModal(true)
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

  const handleConversationCreated = (conversation: ConversationResponse) => {
    setActiveConversationId(conversation.id)
  }

  const handleConversationSelect = (conversationId: string | undefined) => {
    setActiveConversationId(conversationId)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--chidi-text-muted)] mx-auto mb-4" />
          <p className="text-sm text-[var(--chidi-text-muted)]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white">
      {/* Header - hidden on Chidi tab for more immersive experience */}
      {activeTab !== "chidi" && <AppHeader />}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16">
        {activeTab === "inbox" && (
          <InboxView />
        )}
        
        {activeTab === "orders" && (
          <OrdersView />
        )}
        
        {activeTab === "inventory" && (
          <InventoryView
            products={products}
            onAddProduct={() => setShowAddProductModal(true)}
            onEditProduct={handleEditProduct}
            onViewProduct={handleViewProduct}
          />
        )}
        
        {activeTab === "insights" && (
          <InsightsView />
        )}
        
        {activeTab === "chidi" && (
          <CopilotView
            conversationId={activeConversationId}
            onConversationCreated={handleConversationCreated}
            onConversationSelect={handleConversationSelect}
            products={products}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

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
    </div>
  )
}
