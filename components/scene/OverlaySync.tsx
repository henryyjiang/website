'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { setOverlay, type HotspotId } from '@/lib/store'
import { HOTSPOTS } from './hotspots'

/**
 * Tells the scene which overlay is open.
 *
 * React owns routing; the scene needs to know so it can stop hit testing under an
 * open panel — otherwise the room would keep highlighting objects behind the thing
 * the visitor is actually reading. The route is the source of truth, and this is the
 * one place it crosses into the store (docs/ARCHITECTURE.md § The Pixi / React
 * boundary).
 *
 * Renders nothing.
 */
export function OverlaySync() {
  const pathname = usePathname()

  useEffect(() => {
    const match = HOTSPOTS.find((hotspot) => hotspot.href === pathname)
    setOverlay(match ? (match.id as HotspotId) : null)
  }, [pathname])

  return null
}
