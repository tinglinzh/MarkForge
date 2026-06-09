import CodeBlock from '@tiptap/extension-code-block'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CodeBlockView } from './code-block-view'

/**
 * The standard Tiptap CodeBlock node (keeping its ``` input rule and `language`
 * attribute) rendered through a React NodeView that adds a horizontal
 * ScrollArea and a copy button. Pairs with `CodeBlockHighlight`, whose Shiki
 * decorations colorize the still-editable content.
 */
export const CodeBlockWithCopy = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  }
})
