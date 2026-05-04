/**
 * Customers route — `/dashboard/[slug]/customers`.
 *
 * The standalone Customers surface was retired; the full Customers experience
 * now lives inside the Orders page as a top-level "Customers" tab (one home
 * for "people I've sold to", paired with the orders themselves). This page
 * exists ONLY as a redirect so deep-links, the rail's legacy "G U" shortcut,
 * calendar-peek, little-chidi, and any external bookmarks continue to land
 * somewhere coherent.
 */

import { redirect } from "next/navigation"

export default function CustomersPage({ params }: { params: { slug: string } }) {
  redirect(`/dashboard/${params.slug}?tab=orders&view=customers`)
}
