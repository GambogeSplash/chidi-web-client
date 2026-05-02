/**
 * Synthesised brand sounds via Web Audio API. Zero asset files. Each sound
 * uses oscillators + envelopes tuned to feel warm, paper-textured, and brief.
 *
 * Default OFF — user opts in via the chidi_sound_enabled localStorage key.
 * Toggle via setSoundEnabled() (UI affordance to be added in settings later).
 */

const STORAGE_KEY = "chidi_sound_enabled"

let audioCtx: AudioContext | null = null

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null
  if (audioCtx && audioCtx.state !== "closed") return audioCtx
  const Ctx = window.AudioContext || (window as any).webkitAudioContext
  if (!Ctx) return null
  audioCtx = new Ctx()
  return audioCtx
}

export const isSoundEnabled = (): boolean => {
  if (typeof window === "undefined") return false
  return localStorage.getItem(STORAGE_KEY) === "true"
}

export const setSoundEnabled = (enabled: boolean) => {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false")
  // Resume the context so the next play call works without a fresh user gesture
  if (enabled) getCtx()?.resume?.()
}

interface PlayOptions {
  force?: boolean // bypass user opt-in (for "test" buttons in settings)
}

const playTone = (
  freqs: { freq: number; start: number; duration: number; gain?: number }[],
  type: OscillatorType = "sine",
) => {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime
  freqs.forEach(({ freq, start, duration, gain = 0.18 }) => {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    env.gain.value = 0
    osc.connect(env)
    env.connect(ctx.destination)
    const t0 = now + start
    env.gain.setValueAtTime(0, t0)
    env.gain.linearRampToValueAtTime(gain, t0 + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.start(t0)
    osc.stop(t0 + duration + 0.05)
  })
}

/**
 * Win — sale fulfilled, payment confirmed. Two-note rising minor third.
 * Warm + brief. Like a paper receipt slipping out.
 */
export const playWin = (opts?: PlayOptions) => {
  if (!opts?.force && !isSoundEnabled()) return
  playTone(
    [
      { freq: 587.33, start: 0, duration: 0.18, gain: 0.16 }, // D5
      { freq: 698.46, start: 0.08, duration: 0.32, gain: 0.20 }, // F5
    ],
    "sine",
  )
}

/**
 * Tap — new customer message. Single soft tap, like a stylus on paper.
 */
export const playTap = (opts?: PlayOptions) => {
  if (!opts?.force && !isSoundEnabled()) return
  playTone([{ freq: 880, start: 0, duration: 0.08, gain: 0.10 }], "triangle")
}

/**
 * Attention — needs human / urgent. Single low chime, slightly longer.
 */
export const playAttention = (opts?: PlayOptions) => {
  if (!opts?.force && !isSoundEnabled()) return
  playTone(
    [
      { freq: 392.0, start: 0, duration: 0.36, gain: 0.18 }, // G4
      { freq: 261.63, start: 0.12, duration: 0.44, gain: 0.14 }, // C4
    ],
    "sine",
  )
}
