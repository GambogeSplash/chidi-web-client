'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { useDashboardSignals } from '@/lib/chidi/use-dashboard-signals'
import { PRIMARY_TABS } from '@/lib/chidi/navigation'
import { cn } from '@/lib/utils'
import { NavRail } from '@/components/chidi/nav-rail'
import { CommandPalette } from '@/components/chidi/command-palette'
import { ShortcutsOverlay } from '@/components/chidi/shortcuts-overlay'
import { ApprovalGuardrailProvider } from '@/components/chidi/approval-guardrail'
import { ChidiWelcome } from '@/components/chidi/chidi-welcome'
import { useDashboardAuth } from '@/lib/providers/dashboard-auth-context'

interface DashboardContentProps {
  businessSlug?: string;
}

const VALID_TABS: TabId[] = ["inbox", "orders", "inventory", "insights", "chidi"]

export default function DashboardContent({ businessSlug }: DashboardContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useDashboardAuth()

  const initialTab = (searchParams?.get("tab") as TabId | null) || "inbox"
  const [activeTab, setActiveTab] = useState<TabId>(
    VALID_TABS.includes(initialTab) ? initialTab : "inbox"
  )

  // Honor ?tab=X navigation when the URL param changes (Notebook page → rail click → back here)
  useEffect(() => {
    const tab = searchParams?.get("tab") as TabId | null
    if (tab && VALID_TABS.includes(tab) && tab !== activeTab) {
      setActiveTab(tab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
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

  // Per-tab count badges via the centralized signals hook. NavRail and BottomNav
  // both consume this; if a new badge is needed, add it to PRIMARY_TABS.countSource
  // and to useDashboardSignals — the rest is wired.
  const signals = useDashboardSignals()
  const tabCounts = useMemo(() => {
    const counts: Partial<Record<TabId, number>> = {}
    for (const tab of PRIMARY_TABS) {
      if (!tab.countSource) continue
      const n =
        tab.countSource === "needsHuman" ? signals.needsHumanCount :
        tab.countSource === "pendingPayment" ? signals.pendingPaymentCount :
        tab.countSource === "lowStock" ? signals.lowStockCount : 0
      if (n > 0) counts[tab.id] = n
    }
    return counts
  }, [signals.needsHumanCount, signals.pendingPaymentCount, signals.lowStockCount])

  // NavRail collapse state — listen for the toggle event the rail dispatches
  // so the content's left padding stays in sync with the rail width.
  const [railCollapsed, setRailCollapsed] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    setRailCollapsed(localStorage.getItem("chidi_navrail_collapsed") === "true")
    const onToggle = (e: Event) => {
      const detail = (e as CustomEvent).detail as { collapsed?: boolean } | undefined
      if (detail) setRailCollapsed(!!detail.collapsed)
    }
    window.addEventListener("chidi:navrail-toggle", onToggle as EventListener)
    return () => window.removeEventListener("chidi:navrail-toggle", onToggle as EventListener)
  }, [])

  // Tab navigation events from inside child surfaces (e.g. Insights KPI cards
  // and product rows). Detail.tab carries the target tab id.
  useEffect(() => {
    if (typeof window === "undefined") return
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { tab?: string } | undefined
      if (detail?.tab) {
        setActiveTab(detail.tab as TabId)
      }
    }
    window.addEventListener("chidi:navigate-tab", onNavigate as EventListener)
    return () => window.removeEventListener("chidi:navigate-tab", onNavigate as EventListener)
  }, [])

  // Notification dropdown anchor — when the rail's bell is clicked we open
  // the existing notifications panel via the AppHeader trigger that already
  // exists on mobile. Simplest: dispatch a custom event the panel listens to.
  const handleRailNotificationsClick = () => {
    window.dispatchEvent(new CustomEvent("chidi:open-notifications"))
  }

  // Loading state is handled by the dashboard layout - we're guaranteed to have user here

  return (
    <div
      className={cn(
        "flex flex-col h-screen w-full bg-[var(--background)] transition-[padding] duration-200",
        railCollapsed ? "lg:pl-[64px]" : "lg:pl-[224px]",
      )}
    >
      {/* Desktop nav rail (≥lg) */}
      <NavRail
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadNotificationCount={unreadCount}
        tabCounts={tabCounts}
        onNotificationsClick={handleRailNotificationsClick}
        onSearchClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))}
      />

      {/* Mobile header (<lg) */}
      <div className="lg:hidden">
        <AppHeader
          notifications={notifications}
          onMarkAsRead={handleMarkNotificationAsRead}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onDismiss={handleDismissNotification}
          onNotificationClick={handleNotificationClick}
        />
      </div>

      {/* SetupChecklist removed (2026-05-03) — it duplicated prompts that
          already live in (a) the inbox/inventory empty states, (b) the Insights
          "Decide today" cards, and (c) the Settings SetupStatus. Asking three
          times read as nag. The single canonical place is now Settings →
          Chidi tab → SetupStatus. */}

      {/* Main Content Area — keyed wrapper triggers chidi-tab-swap-in (260ms
          slide-fade) every time the active tab changes. Reads as motion
          across tabs, not jump-cuts. */}
      <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden pb-16 lg:pb-0">
        <div key={activeTab} className="chidi-tab-swap-in flex-1 flex flex-col">
        {activeTab === "inbox" && (
          <InboxView
            onViewCustomerOrders={() => {
              // Surface this customer's orders. Until we have a per-customer
              // filter on the orders view, just switch tabs — the merchant
              // can scan from there.
              setActiveTab("orders")
            }}
            onAskChidiAboutCustomer={() => {
              setActiveTab("chidi")
            }}
          />
        )}
        
        {activeTab === "orders" && (
          <OrdersView
            initialOrderId={selectedOrderId}
            onOrderSelected={() => setSelectedOrderId(null)}
            onOpenConversation={(conversationId) => {
              setActiveConversationId(conversationId)
              setActiveTab('inbox')
            }}
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
        </div>
      </main>

      {/* Bottom Navigation — mobile only */}
      <div className="lg:hidden">
        <BottomNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabCounts={tabCounts}
        />
      </div>

      {/* Cmd+K command palette — desktop power-user surface */}
      <CommandPalette
        onTabChange={setActiveTab}
        onAddProduct={() => setShowAddProductModal(true)}
      />

      {/* `?` shortcuts overlay — discoverability for keyboard users */}
      <ShortcutsOverlay />

      {/* Approval guardrail — sensitive Chidi actions ask for the merchant's
          OK before they fire. Pattern lifted from Stripe Sessions 2026 Agent
          Toolkit Guardrails. Listens via the requestApproval() event bus. */}
      <ApprovalGuardrailProvider />

      {/* First-launch Chidi introduction — fires once ever per merchant */}
      <ChidiWelcome
        ownerName={user?.name}
        businessName={(user as any)?.businessName}
      />

      {/* ChidiDailyBrief removed (2026-05-04) — the "While you slept" carousel
          read as performative narration without user value. The same data
          (overnight orders, pending payments) lives in the inbox + Insights
          decision cards where the merchant can actually act on it. */}

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
          onAskChidi={() => {
            setShowProductDetailModal(false)
            setActiveTab('chidi')
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
