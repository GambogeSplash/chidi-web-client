/**
 * React hook for managing notifications with Supabase Realtime support.
 * Provides real-time updates for low-stock alerts and other notifications.
 */

"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast'
import {
  Notification,
  NotificationType,
  getNotifications,
  getUnreadCount,
  markAsRead as apiMarkAsRead,
  markAllAsRead as apiMarkAllAsRead,
  dismissNotification as apiDismissNotification,
  checkLowStockAlerts,
} from '@/lib/api/notifications'

// Initialize Supabase client for realtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export interface UseNotificationsOptions {
  userId: string | null
  businessId?: string | null
  inventoryId?: string | null
  enableRealtime?: boolean
  autoCheckLowStock?: boolean
}

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: Error | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  dismiss: (id: string) => Promise<void>
  refetch: () => Promise<void>
  checkLowStock: () => Promise<void>
}

// Map backend notification types to UI-friendly types
export function mapNotificationType(type: NotificationType): 'stock' | 'message' | 'sale' | 'system' | 'activity' {
  switch (type) {
    case 'LOW_STOCK':
    case 'OUT_OF_STOCK':
    case 'RESTOCK_REMINDER':
      return 'stock'
    case 'ORDER_UPDATE':
      return 'sale'
    case 'SYSTEM':
    default:
      return 'system'
  }
}

// Map backend priority to UI priority
export function mapPriority(priority: string): 'low' | 'medium' | 'high' {
  switch (priority) {
    case 'CRITICAL':
    case 'HIGH':
      return 'high'
    case 'MEDIUM':
      return 'medium'
    case 'LOW':
    default:
      return 'low'
  }
}

// Format timestamp for display
export function formatNotificationTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}

export function useNotifications({
  userId,
  businessId,
  inventoryId,
  enableRealtime = true,
  autoCheckLowStock = false,
}: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { toast } = useToast()
  
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const [notifs, count] = await Promise.all([
        getNotifications({ limit: 50 }),
        getUnreadCount(),
      ])
      
      setNotifications(notifs)
      setUnreadCount(count)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'))
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Check for low stock alerts
  const checkLowStock = useCallback(async () => {
    if (!inventoryId) return

    try {
      const newAlerts = await checkLowStockAlerts(inventoryId)
      
      if (newAlerts.length > 0) {
        // Add new alerts to state
        setNotifications(prev => [...newAlerts, ...prev])
        setUnreadCount(prev => prev + newAlerts.length)
        
        // Show toast for new alerts
        toast({
          title: `${newAlerts.length} Low Stock Alert${newAlerts.length > 1 ? 's' : ''}`,
          description: newAlerts[0].title,
          variant: newAlerts[0].priority === 'CRITICAL' ? 'destructive' : 'default',
        })
      }
    } catch (err) {
      console.error('Failed to check low stock alerts:', err)
    }
  }, [inventoryId, toast])

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      // Optimistically update local state first (atomic update)
      setNotifications(prev => {
        const updated = prev.map(n => 
          n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
        // Compute unread count from the updated array to keep in sync
        const newUnreadCount = updated.filter(n => !n.read && !n.dismissed).length
        setUnreadCount(newUnreadCount)
        return updated
      })
      
      // Then call the API
      await apiMarkAsRead(id)
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      // Revert on error - refetch to get correct state
      fetchNotifications()
      throw err
    }
  }, [fetchNotifications])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistically update local state first
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
        setUnreadCount(0)
        return updated
      })
      
      // Then call the API
      await apiMarkAllAsRead()
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
      // Revert on error - refetch to get correct state
      fetchNotifications()
      throw err
    }
  }, [fetchNotifications])

  // Dismiss notification
  const dismiss = useCallback(async (id: string) => {
    try {
      // Optimistically update local state first (atomic update)
      setNotifications(prev => {
        const notification = prev.find(n => n.id === id)
        const updated = prev.filter(n => n.id !== id)
        // Recompute unread count if the dismissed notification was unread
        if (notification && !notification.read) {
          const newUnreadCount = updated.filter(n => !n.read && !n.dismissed).length
          setUnreadCount(newUnreadCount)
        }
        return updated
      })
      
      // Then call the API
      await apiDismissNotification(id)
    } catch (err) {
      console.error('Failed to dismiss notification:', err)
      // Revert on error - refetch to get correct state
      fetchNotifications()
      throw err
    }
  }, [fetchNotifications])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Auto-check low stock on mount if enabled
  useEffect(() => {
    if (autoCheckLowStock && inventoryId) {
      checkLowStock()
    }
  }, [autoCheckLowStock, inventoryId, checkLowStock])

  // Setup Supabase Realtime subscription
  useEffect(() => {
    if (!enableRealtime || !userId || !supabase) {
      return
    }

    console.log('🔔 [NOTIFICATIONS] Setting up realtime subscription for user:', userId)

    // Subscribe to new notifications for this user
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          console.log('🔔 [NOTIFICATIONS] Received realtime notification:', payload)
          
          const newNotification = payload.new as Notification
          
          // Add to state (prepend to show newest first)
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)
          
          // Show toast for high-priority notifications
          if (newNotification.priority === 'HIGH' || newNotification.priority === 'CRITICAL') {
            toast({
              title: newNotification.title,
              description: newNotification.message,
              variant: newNotification.priority === 'CRITICAL' ? 'destructive' : 'default',
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          console.log('🔔 [NOTIFICATIONS] Notification updated:', payload)
          
          const updatedNotification = payload.new as Notification
          
          setNotifications(prev =>
            prev.map(n => (n.id === updatedNotification.id ? updatedNotification : n))
          )
          
          // Recalculate unread count
          setNotifications(prev => {
            const newUnread = prev.filter(n => !n.read && !n.dismissed).length
            setUnreadCount(newUnread)
            return prev
          })
        }
      )
      .subscribe((status: string) => {
        console.log('🔔 [NOTIFICATIONS] Subscription status:', status)
      })

    channelRef.current = channel

    return () => {
      console.log('🔔 [NOTIFICATIONS] Cleaning up realtime subscription')
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [enableRealtime, userId, toast])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    refetch: fetchNotifications,
    checkLowStock,
  }
}

// Export a mapped version for UI components
export interface MappedNotification {
  id: string
  type: 'stock' | 'message' | 'sale' | 'system' | 'activity'
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: 'low' | 'medium' | 'high'
  referenceType?: string
  referenceId?: string
}

export function mapNotificationForUI(notification: Notification): MappedNotification {
  return {
    id: notification.id,
    type: mapNotificationType(notification.type),
    title: notification.title,
    message: notification.message,
    timestamp: formatNotificationTime(notification.created_at),
    read: notification.read,
    priority: mapPriority(notification.priority),
    referenceType: notification.reference_type,
    referenceId: notification.reference_id,
  }
}
