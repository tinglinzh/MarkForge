import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ScrollArea } from '@markForge/ui/components/ui/scroll-area'
import { cn } from '@markForge/ui/lib/utils'
import type { SlashItem } from './slash-command'

export type SlashMenuProps = {
  items: SlashItem[]
  /** Provided by the suggestion plugin; routes to the item's `command`. */
  command: (item: SlashItem) => void
}

/** Imperative handle the suggestion renderer calls for keyboard navigation. */
export type SlashMenuRef = {
  onKeyDown: (event: KeyboardEvent) => boolean
}

/** The floating "/" insert menu: a keyboard- and mouse-navigable command list. */
export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(function SlashMenu(
  { items, command },
  ref
) {
  const [selected, setSelected] = useState(0)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Reset the highlight whenever the filtered list changes.
  useEffect(() => setSelected(0), [items])

  // Keep the highlighted item visible — scrolls the ScrollArea when arrowing
  // past the last (or before the first) visible item.
  useEffect(() => {
    itemRefs.current[selected]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    })
  }, [selected])

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: (event) => {
        if (items.length === 0) return false
        if (event.key === 'ArrowUp') {
          setSelected((i) => (i + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelected((i) => (i + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          command(items[selected])
          return true
        }
        return false
      }
    }),
    [items, selected, command]
  )

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      style={{ transformOrigin: 'top left' }}
    >
      {items.length === 0 ? (
        <div className="w-72 rounded-xl bg-card px-3 py-2.5 text-[12px] text-muted-foreground shadow-popover">
          无匹配命令
        </div>
      ) : (
        <ScrollArea className="h-80 w-72 rounded-xl bg-card shadow-popover">
          <div className="p-1.5">
            {items.map((item, index) => (
              <button
                key={item.title}
                type="button"
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                onClick={() => command(item)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                  index === selected ? 'bg-accent text-accent-foreground' : 'text-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    index === selected ? 'text-accent-foreground' : 'text-muted-foreground'
                  )}
                >
                  <item.icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{item.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.subtitle}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
    </motion.div>
  )
})
