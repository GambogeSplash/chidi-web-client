/**
 * Notifications API client for Chidi Business Intelligence Platform.
 * Handles fetching, marking as read, and dismissing notifications.
 */

import { apiClient } from './client';

export type NotificationType = 
  | 'LOW_STOCK' 
  | 'OUT_OF_STOCK' 
  | 'RESTOCK_REMINDER' 
  | 'ORDER_UPDATE' 
  | 'SYSTEM';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Notification {
  id: string;
  business_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  reference_type?: string;
  reference_id?: string;
  read: boolean;
  dismissed: boolean;
  created_at: string;
  read_at?: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkReadResponse {
  success: boolean;
  marked_count: number;
}

export interface DismissResponse {
  success: boolean;
}

/**
 * Fetch notifications for the current user.
 */
export async function getNotifications(options?: {
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}): Promise<Notification[]> {
  const params = new URLSearchParams();
  
  if (options?.unreadOnly) {
    params.append('unread_only', 'true');
  }
  if (options?.type) {
    params.append('notification_type', options.type);
  }
  if (options?.limit) {
    params.append('limit', options.limit.toString());
  }
  if (options?.offset) {
    params.append('offset', options.offset.toString());
  }

  const queryString = params.toString();
  const endpoint = `/api/notifications${queryString ? `?${queryString}` : ''}`;

  return apiClient.get<Notification[]>(endpoint);
}

/**
 * Get the count of unread notifications.
 */
export async function getUnreadCount(): Promise<number> {
  const data = await apiClient.get<UnreadCountResponse>('/api/notifications/count');
  return data.unread_count;
}

/**
 * Get a single notification by ID.
 */
export async function getNotification(notificationId: string): Promise<Notification> {
  return apiClient.get<Notification>(`/api/notifications/${notificationId}`);
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string): Promise<MarkReadResponse> {
  return apiClient.put<MarkReadResponse>(`/api/notifications/${notificationId}/read`);
}

/**
 * Mark all notifications as read.
 */
export async function markAllAsRead(): Promise<MarkReadResponse> {
  return apiClient.put<MarkReadResponse>('/api/notifications/read-all');
}

/**
 * Dismiss (soft delete) a notification.
 */
export async function dismissNotification(notificationId: string): Promise<DismissResponse> {
  return apiClient.delete<DismissResponse>(`/api/notifications/${notificationId}`);
}

/**
 * Dismiss all notifications.
 */
export async function dismissAllNotifications(): Promise<DismissResponse> {
  return apiClient.delete<DismissResponse>('/api/notifications');
}

/**
 * Trigger a check for low stock alerts.
 * Creates notifications for products at or below reorder level.
 */
export async function checkLowStockAlerts(inventoryId: string): Promise<Notification[]> {
  return apiClient.post<Notification[]>(
    `/api/notifications/check-low-stock?inventory_id=${inventoryId}`
  );
}
