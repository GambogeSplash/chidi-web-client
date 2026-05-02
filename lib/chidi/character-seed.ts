/**
 * Character generator seed system. Given a customer ID, deterministically
 * pick a face shape, hair style, top color, accessory, expression. Same
 * customer always shows the same character.
 *
 * Library sized for ~1k customers without obvious clashes:
 * 3 faces × 6 hair × 8 backgrounds × 4 accessories × 2 expressions = 1,152 combos
 *
 * Aesthetic: line-drawn (currentColor stroke), warm-paper textile-tone fill
 * background, single-color foreground. Aligns with EmptyArt + ChidiMark
 * vocabulary. Built for the diaspora: hair textures, headwraps, gele included.
 */

export type FaceShape = "oval" | "round" | "soft-square"
export type HairStyle = "afro" | "low-cut" | "braids" | "locs" | "headwrap" | "gele"
export type Accessory = "none" | "glasses" | "earring" | "hat-cap"
export type Expression = "calm" | "smile"

export interface CharacterTraits {
  face: FaceShape
  hair: HairStyle
  bgIndex: number
  accessory: Accessory
  expression: Expression
}

const FACES: FaceShape[] = ["oval", "round", "soft-square"]
const HAIR: HairStyle[] = ["afro", "low-cut", "braids", "locs", "headwrap", "gele"]
const ACCESSORIES: Accessory[] = ["none", "none", "none", "glasses", "earring", "hat-cap"] // weight "none" higher
const EXPRESSIONS: Expression[] = ["calm", "calm", "smile"]

// 8 vibrant Lagos-textile-inspired backgrounds. Saturated and confident,
// not pale-paper. Inspired by adire indigo, ankara prints, market awnings.
// Strokes stay deep for line legibility against the saturated bg.
export const BACKGROUND_PALETTE = [
  { bg: "#E55B3C", stroke: "#3F1808" }, // brick terracotta
  { bg: "#F5B14C", stroke: "#3F2308" }, // honey yellow
  { bg: "#3B5FB5", stroke: "#0F1F4F" }, // royal blue (adire)
  { bg: "#F08880", stroke: "#4F1814" }, // coral pink
  { bg: "#7FB47F", stroke: "#1F4023" }, // fresh sage
  { bg: "#FF8C42", stroke: "#4F2008" }, // sunset orange
  { bg: "#9B6FAF", stroke: "#2F1840" }, // plum
  { bg: "#2DA1A5", stroke: "#0A3F40" }, // teal
] as const

function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i)
    h = h & h // 32-bit
  }
  return Math.abs(h)
}

export function deriveTraits(seed: string): CharacterTraits {
  const h = hash(seed)
  return {
    face: FACES[h % FACES.length],
    hair: HAIR[Math.floor(h / 7) % HAIR.length],
    bgIndex: Math.floor(h / 53) % BACKGROUND_PALETTE.length,
    accessory: ACCESSORIES[Math.floor(h / 211) % ACCESSORIES.length],
    expression: EXPRESSIONS[Math.floor(h / 911) % EXPRESSIONS.length],
  }
}
