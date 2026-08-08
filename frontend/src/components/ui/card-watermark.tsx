'use client'

import { cn } from '@/lib/utils'

interface CardWatermarkProps {
  className?: string
  /**
   * Opacity of the watermark (0-100)
   * @default 3
   */
  opacity?: number
  /**
   * Position of the watermark
   * @default 'bottom-right'
   */
  position?: 'bottom-right' | 'top-right' | 'center'
  /**
   * Size multiplier for the watermark
   * @default 1
   */
  scale?: number
}

/**
 * PulseWise pulse-mark watermark for cards.
 * Creates a subtle branded texture inside card components.
 *
 * @example
 * <Card className="relative overflow-hidden">
 *   <CardWatermark />
 *   <CardContent>...</CardContent>
 * </Card>
 */
export function CardWatermark({
  className,
  opacity = 3,
  position = 'bottom-right',
  scale = 1,
}: CardWatermarkProps) {
  const positionClasses = {
    'bottom-right': '-bottom-12 -right-12',
    'top-right': '-top-12 -right-12',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  }

  const size = 180 * scale

  return (
    <div
      className={cn(
        'pointer-events-none absolute z-0',
        positionClasses[position],
        className
      )}
      aria-hidden='true'
      style={{
        opacity: opacity / 100,
        width: size,
        height: size,
      }}
    >
      {/* The PulseWise pulse-mark as an SVG watermark */}
      <svg
        viewBox='0 0 200 200'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className='h-full w-full'
      >
        <polyline
          points='183,100 150,100 125,175 75,25 50,100 17,100'
          fill='none'
          strokeWidth='16'
          strokeLinecap='round'
          strokeLinejoin='round'
          stroke='currentColor'
          className='text-brand-navy'
        />
      </svg>
    </div>
  )
}

