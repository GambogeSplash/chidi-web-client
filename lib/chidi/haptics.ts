/**
 * Haptic feedback wrapper. Uses navigator.vibrate where available (Android +
 * some iOS PWAs). Silent no-op everywhere else. Tuned to feel like the
 * Chidi sound family — short, warm, never grating.
 *
 * Pattern lengths in milliseconds. iOS Safari ignores vibrate() unless
 * launched as a PWA — that's fine, it just won't fire.
 */

const isClient = typeof window !== "undefined" && typeof navigator !== "undefined"

const vibrate = (pattern: number | number[]) => {
  if (!isClient || !navigator.vibrate) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // ignore — some browsers throw on certain inputs
  }
}

/** Tap — for selecting a tab, opening a thing. ~10ms. */
export const hapticTap = () => vibrate(10)

/** Soft — for button confirmations, sending a reply. ~18ms. */
export const hapticSoft = () => vibrate(18)

/** Win — for sale fulfilled, payment confirmed. Two short pulses. */
export const hapticWin = () => vibrate([15, 60, 25])

/** Attention — needs human, error. Single longer pulse. */
export const hapticAttention = () => vibrate(40)
