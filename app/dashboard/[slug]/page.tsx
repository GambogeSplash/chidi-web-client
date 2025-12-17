'use client'

import { useParams } from 'next/navigation'
import DashboardContent from '../DashboardContent'

export default function SlugDashboardPage() {
  const params = useParams()
  const businessSlug = params.slug as string

  return <DashboardContent businessSlug={businessSlug} />
}
