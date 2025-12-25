'use client'

import { useParams } from 'next/navigation'
import { BusinessProfileContent } from '@/components/chidi/business-profile-content'

export default function BusinessProfilePage() {
  const params = useParams()
  const businessSlug = params.slug as string

  return <BusinessProfileContent businessSlug={businessSlug} />
}
