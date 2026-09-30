import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

/**
 * Popover-API menu anchored to a trigger. The browser handles light dismiss, Escape and top-layer
 * stacking; this only positions it against the anchor each time it opens: below it (top bar) or above it
 * (the phone's bottom action bar).
 */
export function Menu({
  id,
  anchor,
  align = 'end',
  placement = 'below',
  label,
  children,
}: {
  id: string
  anchor: RefObject<HTMLElement | null>
  align?: 'start' | 'end'
  placement?: 'below' | 'above'
  label: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const menu = ref.current
    if (!menu) return
    const place = (event: Event) => {
      if ((event as ToggleEvent).newState !== 'open' || !anchor.current) return
      const box = anchor.current.getBoundingClientRect()
      if (placement === 'below') {
        menu.style.bottom = 'auto'
        menu.style.top = `${box.bottom + 6}px`
      } else {
        menu.style.top = 'auto'
        menu.style.bottom = `${window.innerHeight - box.top + 6}px`
      }
      if (align === 'end') {
        menu.style.left = 'auto'
        menu.style.right = `${window.innerWidth - box.right}px`
      } else {
        menu.style.right = 'auto'
        menu.style.left = `${box.left}px`
      }
    }
    menu.addEventListener('beforetoggle', place)
    return () => menu.removeEventListener('beforetoggle', place)
  }, [anchor, align, placement])

  return (
    <div id={id} ref={ref} popover="auto" className="menu" role="menu" aria-label={label}>
      {children}
    </div>
  )
}
