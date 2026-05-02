'use client'

/**
 * GutterStrip — the decorative 45-degree hatch pattern that sits in the left
 * and right gutters of the contained 1060px sections. A signature piece of
 * chrome we preserve from the waitlist.
 *
 * `count` controls how tall the strip is (more lines = taller fill).
 */
interface GutterStripProps {
  count?: number
}

export function GutterStrip({ count = 50 }: GutterStripProps) {
  return (
    <div className="w-4 sm:w-6 md:w-8 lg:w-12 self-stretch relative overflow-hidden">
      <div className="w-[120px] sm:w-[140px] md:w-[162px] left-[-40px] sm:left-[-50px] md:left-[-58px] top-[-120px] absolute flex flex-col justify-start items-start">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="self-stretch h-3 sm:h-4 rotate-[-45deg] origin-top-left outline outline-[0.5px] outline-[var(--chidi-border-subtle)] outline-offset-[-0.25px]"
          />
        ))}
      </div>
    </div>
  )
}
