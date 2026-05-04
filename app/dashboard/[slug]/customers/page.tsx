/**
 * Customers route — `/dashboard/[slug]/customers`.
 *
 * The standalone Customers surface was retired; the full Customers experience
 * now lives inside Insights' "Customers" drill-in lens (single home, no
 * duplication). This page exists ONLY as a redirect so deep-links, the rail's
 * legacy "G U" shortcut, calendar-peek, little-chidi, and any external
 * bookmarks continue to land somewhere coherent.
 */

import { redirect } from "next/navigation"

export default function CustomersPage({ params }: { params: { slug: string } }) {
  redirect(`/dashboard/${params.slug}?tab=insights&lens=customers`)
}
