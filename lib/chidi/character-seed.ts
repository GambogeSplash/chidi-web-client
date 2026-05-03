/**
 * Character generator (v2 — Gen Z) — given a customer ID, deterministically
 * pick a face shape, hair, hair color, expression, accessory, background
 * pattern, and signature mark. Same customer always shows the same character.
 *
 * Library size targets ~10k customers without obvious clashes:
 *   4 face shapes × 12 hair styles × 5 hair colors × 6 expressions ×
 *   8 accessories × 12 background palettes × 6 patterns × 4 marks
 *   = ~13.8M combinations
 *
 * Aesthetic: bold gradient backgrounds (not flat), graphic patterns under
 * the body, layered hair with color streaks, expressive faces, signature
 * "marks" (heart sticker, freckles, beauty spot, star). Reads contemporary
 * and varied — every avatar feels intentional rather than algorithmic.
 */

export type FaceShape = "oval" | "round" | "soft-square" | "heart"
export type SkinTone = "warm" | "deep" | "tan" | "fair" | "olive" | "amber"

export type HairStyle =
  | "afro"
  | "low-cut"
  | "braids"
  | "locs"
  | "headwrap"
  | "gele"
  | "buzz"
  | "bob"
  | "twists"
  | "fringe"
  | "bantu-knots"
  | "halo-braid"

export type HairColor = "noir" | "espresso" | "honey" | "pink-tip" | "violet-tip"

export type Accessory =
  | "none"
  | "glasses-round"
  | "sunglasses"
  | "earring-stud"
  | "earring-hoop"
  | "beanie"
  | "headphones"
  | "nose-stud"

export type Expression =
  | "calm"
  | "smile"
  | "wink"
  | "cool"
  | "surprised"
  | "smirk"

export type BackgroundPattern =
  | "solid"
  | "dots"
  | "stripes"
  | "halfmoon"
  | "starburst"
  | "wave"

export type Mark = "none" | "heart-cheek" | "freckles" | "beauty-spot" | "star-tear"

export interface CharacterTraits {
  face: FaceShape
  skinTone: SkinTone
  hair: HairStyle
  hairColor: HairColor
  bgIndex: number
  pattern: BackgroundPattern
  accessory: Accessory
  expression: Expression
  mark: Mark
}

const FACES: FaceShape[] = ["oval", "round", "soft-square", "heart"]
const SKIN_TONES: SkinTone[] = ["warm", "deep", "tan", "fair", "olive", "amber"]
const HAIR: HairStyle[] = [
  "afro",
  "low-cut",
  "braids",
  "locs",
  "headwrap",
  "gele",
  "buzz",
  "bob",
  "twists",
  "fringe",
  "bantu-knots",
  "halo-braid",
]
const HAIR_COLORS: HairColor[] = ["noir", "espresso", "honey", "pink-tip", "violet-tip"]
// Weight "none" higher so most characters don't feel costumed
const ACCESSORIES: Accessory[] = [
  "none", "none", "none", "none",
  "glasses-round", "sunglasses",
  "earring-stud", "earring-hoop",
  "beanie", "headphones", "nose-stud",
]
// Slight bias toward calm + smile — they read most natural
const EXPRESSIONS: Expression[] = [
  "calm", "calm", "smile", "smile", "wink", "cool", "surprised", "smirk",
]
const PATTERNS: BackgroundPattern[] = [
  "solid", "solid",
  "dots", "stripes", "halfmoon", "starburst", "wave",
]
const MARKS: Mark[] = ["none", "none", "none", "heart-cheek", "freckles", "beauty-spot", "star-tear"]

// === Skin tones (foreground for face fill) =================================
export const SKIN_PALETTE: Record<SkinTone, { fill: string; stroke: string }> = {
  warm:   { fill: "#C68A6F", stroke: "#3E1F12" }, // warm brown
  deep:   { fill: "#7A4630", stroke: "#2A1108" }, // deep cocoa
  tan:    { fill: "#D9A982", stroke: "#4A2510" }, // tan
  fair:   { fill: "#F4D2B5", stroke: "#5A3520" }, // fair
  olive:  { fill: "#B58860", stroke: "#3A2010" }, // olive
  amber:  { fill: "#A66A48", stroke: "#371810" }, // amber
}

// === Hair color overrides — strokes and fills tinted distinctly ============
export const HAIR_PALETTE: Record<HairColor, { fill: string; tip?: string }> = {
  noir:        { fill: "#0F0A0A" },
  espresso:    { fill: "#3A1F12" },
  honey:       { fill: "#8C5A2A" },
  "pink-tip":  { fill: "#1A0D0D", tip: "#FF6FAA" },
  "violet-tip":{ fill: "#1A0D0D", tip: "#9264FF" },
}

// === 12 vibrant background palettes — gradient-ready =======================
// Each is a {top, bottom} duotone for radial/linear gradients. Saturated
// and confident; designed against the warm-paper app background.
export const BACKGROUND_PALETTE = [
  { top: "#FF8C42", bottom: "#E55B3C", textile: "Lagos sunset" },     // 0
  { top: "#FFD56B", bottom: "#F5A623", textile: "honey market" },     // 1
  { top: "#7BC4FF", bottom: "#3B5FB5", textile: "adire indigo" },     // 2
  { top: "#FFAEB7", bottom: "#F08880", textile: "coral pink" },       // 3
  { top: "#A5D8A0", bottom: "#5B9F5B", textile: "fresh sage" },       // 4
  { top: "#FFC6A0", bottom: "#FF7A3C", textile: "papaya" },           // 5
  { top: "#C9A6E0", bottom: "#8E5FB0", textile: "plum night" },       // 6
  { top: "#7AD1D5", bottom: "#2DA1A5", textile: "teal lagoon" },      // 7
  { top: "#F0E68C", bottom: "#C2A03A", textile: "khaki sun" },        // 8
  { top: "#FFB3C8", bottom: "#FF6FAA", textile: "y2k bubblegum" },    // 9
  { top: "#B8E6FF", bottom: "#5BB3F2", textile: "ice pop" },          // 10
  { top: "#D4FF6B", bottom: "#9BC53D", textile: "neon lime" },        // 11
] as const

// Mark accent colors (for the stickers/spots on cheeks)
export const MARK_PALETTE: Record<Mark, string> = {
  none: "transparent",
  "heart-cheek": "#FF4D6D",
  freckles: "#5A2818",
  "beauty-spot": "#1A1A1A",
  "star-tear": "#FFD56B",
}

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
  // Use different prime divisors per dimension so independent variation reads
  const pick = <T>(arr: readonly T[], salt: number): T =>
    arr[Math.floor(h / salt) % arr.length] as T

  return {
    face: pick(FACES, 1),
    skinTone: pick(SKIN_TONES, 7),
    hair: pick(HAIR, 23),
    hairColor: pick(HAIR_COLORS, 41),
    bgIndex: Math.floor(h / 67) % BACKGROUND_PALETTE.length,
    pattern: pick(PATTERNS, 89),
    accessory: pick(ACCESSORIES, 109),
    expression: pick(EXPRESSIONS, 137),
    mark: pick(MARKS, 173),
  }
}
