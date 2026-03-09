"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  settingsAPI,
  type AccountInfo,
  type UserPreferences,
  type UserPreferencesUpdate,
  type UpdateAccountRequest,
  type BusinessPreferences,
  type UpdateBusinessPreferencesRequest,
  type PaymentSettings,
  type UpdatePaymentSettingsRequest,
} from "@/lib/api/settings"

export const settingsKeys = {
  all: ["settings"] as const,
  account: () => [...settingsKeys.all, "account"] as const,
  preferences: () => [...settingsKeys.all, "preferences"] as const,
  businessPreferences: (businessId: string) =>
    [...settingsKeys.all, "businessPreferences", businessId] as const,
  paymentSettings: (businessId: string) =>
    [...settingsKeys.all, "paymentSettings", businessId] as const,
}

/**
 * Hook for fetching account info
 */
export function useAccountSettings() {
  return useQuery<AccountInfo>({
    queryKey: settingsKeys.account(),
    queryFn: () => settingsAPI.getAccount(),
    staleTime: 5 * 60 * 1000, // 5 minutes - account info rarely changes
  })
}

/**
 * Hook for fetching user preferences
 */
export function usePreferences() {
  return useQuery<UserPreferences>({
    queryKey: settingsKeys.preferences(),
    queryFn: () => settingsAPI.getPreferences(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for fetching business preferences
 */
export function useBusinessPreferences(businessId: string | null) {
  return useQuery<BusinessPreferences>({
    queryKey: settingsKeys.businessPreferences(businessId || ""),
    queryFn: () => settingsAPI.getBusinessPreferences(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for fetching payment settings
 */
export function usePaymentSettings(businessId: string | null) {
  return useQuery<PaymentSettings>({
    queryKey: settingsKeys.paymentSettings(businessId || ""),
    queryFn: () => settingsAPI.getPaymentSettings(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook for updating account info
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateAccountRequest) => settingsAPI.updateAccount(data),
    onSuccess: (updatedAccount) => {
      queryClient.setQueryData(settingsKeys.account(), updatedAccount)
    },
  })
}

/**
 * Hook for updating user preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UserPreferencesUpdate) =>
      settingsAPI.updatePreferences(data),
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(settingsKeys.preferences(), updatedPreferences)
    },
  })
}

/**
 * Hook for updating business preferences
 */
export function useUpdateBusinessPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      businessId,
      data,
    }: {
      businessId: string
      data: UpdateBusinessPreferencesRequest
    }) => settingsAPI.updateBusinessPreferences(businessId, data),
    onSuccess: (updatedPreferences, { businessId }) => {
      queryClient.setQueryData(
        settingsKeys.businessPreferences(businessId),
        updatedPreferences
      )
    },
  })
}

/**
 * Hook for updating payment settings
 */
export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      businessId,
      data,
    }: {
      businessId: string
      data: UpdatePaymentSettingsRequest
    }) => settingsAPI.updatePaymentSettings(businessId, data),
    onSuccess: (updatedSettings, { businessId }) => {
      queryClient.setQueryData(
        settingsKeys.paymentSettings(businessId),
        updatedSettings
      )
    },
  })
}

/**
 * Hook for changing password
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string
      newPassword: string
    }) => settingsAPI.changePassword(currentPassword, newPassword),
  })
}
