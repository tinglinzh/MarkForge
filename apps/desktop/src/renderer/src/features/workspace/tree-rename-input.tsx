import { useEffect, useRef, useState } from 'react'
import { Input } from '@heroui/react'

type TreeRenameInputProps = {
  initialName: string
  placeholder?: string
  onSubmit: (name: string) => void
  onCancel: () => void
}

/** Inline field shown in place of a node's label (rename or new-entry draft). */
export function TreeRenameInput({
  initialName,
  placeholder,
  onSubmit,
  onCancel
}: TreeRenameInputProps): React.JSX.Element {
  const [value, setValue] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.focus()
    // Select the stem (exclude a trailing extension) for quick renaming.
    const dot = initialName.lastIndexOf('.')
    input.setSelectionRange(0, dot > 0 ? dot : initialName.length)
  }, [initialName])

  function commit(): void {
    const name = value.trim()
    if (name && name !== initialName) onSubmit(name)
    else onCancel()
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      placeholder={placeholder}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
      onClick={(event) => event.stopPropagation()}
      className="h-6 w-full rounded-md bg-card px-1.5 text-[13px] text-foreground shadow-xs"
    />
  )
}
