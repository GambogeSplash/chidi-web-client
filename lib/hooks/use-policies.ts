"use client"

import { useQuery } from "@tanstack/react-query"
import { policiesAPI, type BusinessPolicy } from "@/lib/api/policies"

export const policiesKeys = {
  all: ["policies"] as const,
  list: (businessId: string) => [...policiesKeys.all, "list", businessId] as const,
}

/**
 * Hook for fetching business policies
 */
export function usePolicies(businessId: string | null) {
  return useQuery<BusinessPolicy[]>({
    queryKey: policiesKeys.list(businessId || ""),
    queryFn: () => policiesAPI.list(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  })
}
