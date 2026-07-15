import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type SmartTooltipProps = {
  children: ReactNode
  content?: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  showDelay?: number
  disabled?: boolean
}

const MARGIN = 10
const ARROW_SIZE = 10

export function SmartTooltip({
  children,
  content,
  position = 'top',
  showDelay = 250,
  disabled = false,
}: SmartTooltipProps) {
  const anchorRef = useRef<HTMLSpanElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const [visible, setVisible] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [finalPosition, setFinalPosition] = useState(position)

  const tooltipContent = content

  const clearTooltipTimer = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const calculatePosition = () => {
    if (!anchorRef.current || !tooltipRef.current) {
      return
    }

    const anchor = anchorRef.current.getBoundingClientRect()
    const tooltip = tooltipRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    }

    let nextX = 0
    let nextY = 0
    let nextPosition = position

    if (position === 'top') {
      nextX = anchor.left + anchor.width / 2 - tooltip.width / 2
      nextY = anchor.top - tooltip.height - ARROW_SIZE
      if (nextY < MARGIN) {
        nextPosition = 'bottom'
        nextY = anchor.bottom + ARROW_SIZE
      }
    } else if (position === 'bottom') {
      nextX = anchor.left + anchor.width / 2 - tooltip.width / 2
      nextY = anchor.bottom + ARROW_SIZE
      if (nextY + tooltip.height > viewport.height - MARGIN) {
        nextPosition = 'top'
        nextY = anchor.top - tooltip.height - ARROW_SIZE
      }
    } else if (position === 'left') {
      nextX = anchor.left - tooltip.width - ARROW_SIZE
      nextY = anchor.top + anchor.height / 2 - tooltip.height / 2
      if (nextX < MARGIN) {
        nextPosition = 'right'
        nextX = anchor.right + ARROW_SIZE
      }
    } else {
      nextX = anchor.right + ARROW_SIZE
      nextY = anchor.top + anchor.height / 2 - tooltip.height / 2
      if (nextX + tooltip.width > viewport.width - MARGIN) {
        nextPosition = 'left'
        nextX = anchor.left - tooltip.width - ARROW_SIZE
      }
    }

    nextX = Math.max(MARGIN, Math.min(nextX, viewport.width - tooltip.width - MARGIN))
    nextY = Math.max(MARGIN, Math.min(nextY, viewport.height - tooltip.height - MARGIN))

    setTooltipPos({ x: Math.round(nextX), y: Math.round(nextY) })
    setFinalPosition(nextPosition)
  }

  useEffect(() => {
    if (!visible) {
      return
    }

    calculatePosition()
    const recalc = () => calculatePosition()
    window.addEventListener('scroll', recalc, true)
    window.addEventListener('resize', recalc)

    return () => {
      window.removeEventListener('scroll', recalc, true)
      window.removeEventListener('resize', recalc)
    }
  }, [visible])

  useEffect(() => () => clearTooltipTimer(), [])

  if (disabled || !tooltipContent) {
    return <>{children}</>
  }

  const arrowClassName =
    finalPosition === 'top'
      ? 'left-1/2 top-full -translate-x-1/2 border-x-[8px] border-t-[8px] border-x-transparent border-t-slate-900/90'
      : finalPosition === 'bottom'
        ? 'bottom-full left-1/2 -translate-x-1/2 border-x-[8px] border-b-[8px] border-x-transparent border-b-slate-900/90'
        : finalPosition === 'left'
          ? 'left-full top-1/2 -translate-y-1/2 border-y-[8px] border-l-[8px] border-y-transparent border-l-slate-900/90'
          : 'right-full top-1/2 -translate-y-1/2 border-y-[8px] border-r-[8px] border-y-transparent border-r-slate-900/90'

  return (
    <>
      <span
        ref={anchorRef}
        className="inline-flex"
        onMouseEnter={() => {
          clearTooltipTimer()
          timeoutRef.current = window.setTimeout(() => {
            setVisible(true)
          }, showDelay)
        }}
        onMouseLeave={() => {
          clearTooltipTimer()
          setVisible(false)
        }}
        onFocus={() => {
          clearTooltipTimer()
          setVisible(true)
        }}
        onBlur={() => {
          clearTooltipTimer()
          setVisible(false)
        }}
      >
        {children}
      </span>
      {visible && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={tooltipRef}
              className="pointer-events-none fixed z-[9999] max-w-[360px] rounded-2xl border border-white/15 bg-slate-900/90 px-4 py-3 text-sm text-white shadow-[0_12px_40px_rgba(15,23,42,0.45)] backdrop-blur-md"
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
            >
              <div className={`absolute h-0 w-0 ${arrowClassName}`} />
              {tooltipContent}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}