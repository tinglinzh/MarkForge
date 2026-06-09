import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { ScrollArea } from '@markforge/ui/components/ui/scroll-area'
import { CopyButton } from '@markforge/ui/components/animate-ui/components/buttons/copy'

/**
 * React NodeView for code blocks: keeps the code editable (via NodeViewContent,
 * which Shiki decorations still colorize) while wrapping it in a horizontal
 * ScrollArea and adding a hover copy button. The language label reflects the
 * fence's `language` attribute — no auto-detection.
 */
export function CodeBlockView({ node }: NodeViewProps): React.JSX.Element {
  const language = (node.attrs.language as string | null) ?? ''

  return (
    <NodeViewWrapper className="group/code relative">
      <div
        className="absolute right-2 top-2 z-10 flex items-center gap-2 opacity-0 transition-opacity group-hover/code:opacity-100 focus-within:opacity-100"
        contentEditable={false}
      >
        {language && (
          <span className="select-none font-mono text-[11px] text-muted-foreground">
            {language}
          </span>
        )}
        <CopyButton
          content={node.textContent}
          variant="ghost"
          size="xs"
          className="text-muted-foreground hover:bg-accent hover:text-foreground"
        />
      </div>
      <ScrollArea className="rounded-[10px] bg-muted">
        <pre>
          <NodeViewContent />
        </pre>
      </ScrollArea>
    </NodeViewWrapper>
  )
}
