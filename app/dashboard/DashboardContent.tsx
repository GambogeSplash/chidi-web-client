'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
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
import { ManageVariationsSheet } from '@/components/chidi/manage-variations-sheet'
import { productsAPI, type User } from '@/lib/api'
import type { DisplayProduct } from '@/lib/types/product'
import { Loader2 } from 'lucide-react'
import type { ConversationResponse } from '@/lib/types/conversation'
import { useNotifications, mapNotificationForUI, type MappedNotification } from '@/hooks/use-notifications'
import { getStoredInventoryId } from '@/lib/api/products'
import { useProducts, useUpdateProduct, productsKeys } from '@/lib/hooks/use-products'
import { SetupChecklist } from '@/components/chidi/setup-checklist'
import { useDashboardAuth } from '@/lib/providers/dashboard-auth-context'

interface DashboardContentProps {
  businessSlug?: string;
}

export default function DashboardContent({ businessSlug }: DashboardContentProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user } = useDashboardAuth()
  const [activeTab, setActiveTab] = useState<TabId>("inbox")
  const [localNotifications, setLocalNotifications] = useState<MappedNotification[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  // React Query for products
  const { data: productsData } = useProducts()
  const updateProductMutation = useUpdateProduct()
  const products = productsData?.products ?? []

  // Use notifications hook for real-time notifications
  const inventoryId = typeof window !== 'undefined' ? getStoredInventoryId() : null
  const {
    notifications: apiNotifications,
    unreadCount,
    isLoading: notificationsLoading,
    markAsRead: markNotificationAsRead,
    markAllAsRead,
    dismiss: dismissNotification,
  } = useNotifications({
    userId: user?.id || null,
    businessId: user?.businessId || null,
    inventoryId: inventoryId,
    enableRealtime: true,
    autoCheckLowStock: false,
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
  const [variationsProduct, setVariationsProduct] = useState<DisplayProduct | null>(null)

  // Auth is now handled by the dashboard layout - user is guaranteed to be set here

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

  const handleMarkAllNotificationsAsRead = async () => {
    setLocalNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true }))
    )
    await markAllAsRead()
  }

  const handleDismissNotification = async (id: string) => {
    const isLocalNotification = localNotifications.some(n => n.id === id)
    if (isLocalNotification) {
      setLocalNotifications((prev) => prev.filter((n) => n.id !== id))
    } else {
      await dismissNotification(id)
    }
  }

  const handleNotificationClick = (notification: MappedNotification) => {
    if (notification.referenceType === 'product' && notification.referenceId) {
      const product = products.find(p => p.id === notification.referenceId)
      if (product) {
        setSelectedProduct(product)
        setShowProductDetailModal(true)
        setActiveTab('inventory')
      }
    } else if (notification.referenceType === 'order' && notification.referenceId) {
      setSelectedOrderId(notification.referenceId)
      setActiveTab('orders')
    }
  }

  const handleEditProduct = (product: DisplayProduct) => {
    setSelectedProduct(product)
    setShowQuickEditModal(true)
  }

  const handleUpdateProduct = async (updatedProduct: DisplayProduct) => {
    const originalProduct = products.find((p) => p.id === updatedProduct.id)
    
    updateProductMutation.mutate(
      { productId: updatedProduct.id, updates: updatedProduct },
      {
        onSuccess: (updated) => {
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
        },
      }
    )
  }

  const handleViewProduct = (product: DisplayProduct) => {
    setSelectedProduct(product)
    setShowProductDetailModal(true)
  }

  const handleBulkImport = (result: { imported: number; failed: number; products: unknown[] }) => {
    queryClient.invalidateQueries({ queryKey: productsKeys.all })
    
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
  }

  const handleConversationCreated = (conversation: ConversationResponse) => {
    setActiveConversationId(conversation.id)
  }

  const handleConversationSelect = (conversationId: string | undefined) => {
    setActiveConversationId(conversationId)
  }

  const handleProductAdded = (product: DisplayProduct) => {
    const wasFirstProduct = products.length === 0
    queryClient.invalidateQueries({ queryKey: productsKeys.all })
    setShowAddProductModal(false)
    
    if (wasFirstProduct) {
      const notification: MappedNotification = {
        id: `first-product-${Date.now()}`,
        type: 'activity',
        title: 'First Product Added!',
        message: 'Customers on your channels can now ask about it.',
        timestamp: 'Just now',
        read: false,
        priority: 'low'
      }
      setLocalNotifications((prev) => [notification, ...prev])
    }
  }

  const handleProductDeleted = (productId: string) => {
    queryClient.invalidateQueries({ queryKey: productsKeys.all })
    setShowProductDetailModal(false)
    setSelectedProduct(null)
  }

  const handleProductSaved = (updatedProduct: DisplayProduct) => {
    queryClient.invalidateQueries({ queryKey: productsKeys.all })
    setShowEditProductModal(false)
    setSelectedProduct(null)
  }

  const handleManageVariations = (product: DisplayProduct) => {
    setVariationsProduct(product)
  }

  const handleVariationsUpdated = () => {
    queryClient.invalidateQueries({ queryKey: productsKeys.all })
  }

  // Loading state is handled by the dashboard layout - we're guaranteed to have user here

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--background)]">
      {/* Header - consistent across all tabs */}
      <AppHeader 
        notifications={notifications}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onDismiss={handleDismissNotification}
        onNotificationClick={handleNotificationClick}
      />

      {/* Setup Checklist - shown until complete or dismissed */}
      <SetupChecklist
        businessId={user?.businessId || null}
        businessSlug={businessSlug}
        products={products}
        setActiveTab={setActiveTab}
        onAddProduct={() => setShowAddProductModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden pb-16">
        {activeTab === "inbox" && (
          <InboxView />
        )}
        
        {activeTab === "orders" && (
          <OrdersView 
            initialOrderId={selectedOrderId}
            onOrderSelected={() => setSelectedOrderId(null)}
          />
        )}
        
        {activeTab === "inventory" && (
          <InventoryView
            products={products}
            onAddProduct={() => setShowAddProductModal(true)}
            onEditProduct={handleEditProduct}
            onViewProduct={handleViewProduct}
            onProductsUpdated={handleVariationsUpdated}
            onBulkImport={() => setShowBulkImport(true)}
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
          onAddProduct={handleProductAdded}
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
          onDeleteProduct={handleProductDeleted}
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
          onSave={handleProductSaved}
          onManageVariations={handleManageVariations}
        />
      )}

      {showBulkImport && (
        <BulkCSVImport
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onImport={handleBulkImport}
        />
      )}

      {variationsProduct && (
        <ManageVariationsSheet
          isOpen={!!variationsProduct}
          onClose={() => setVariationsProduct(null)}
          product={variationsProduct}
          onUpdate={handleVariationsUpdated}
        />
      )}
    </div>
  )
}
