import { useEffect } from 'react'
import { useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import { Markdown } from '@tiptap/markdown'
import { CodeBlockWithCopy } from './code-highlight/code-block'
import { CodeBlockHighlight } from './code-highlight/code-block-highlight'
import { SlashCommand } from './slash/slash-command'

type UseMarkdownEditorOptions = {
  /** Raw markdown to render, or null when no document is open. */
  content: string | null
  /** Called on user edits with the serialized markdown. */
  onChange?: (markdown: string) => void
}

/**
 * Creates a Tiptap WYSIWYG editor that reads and writes Markdown via the
 * official `@tiptap/markdown` extension. The editor instance lives for the
 * component's lifetime; document switches are pushed in through `setContent`.
 */
export function useMarkdownEditor({ content, onChange }: UseMarkdownEditorOptions): Editor | null {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, link: { openOnClick: false } }),
      Markdown,
      Placeholder.configure({ placeholder: '输入正文，或按 “/” 选择要插入的元素…' }),
      CodeBlockWithCopy,
      CodeBlockHighlight,
      SlashCommand
    ],
    content: content ?? '',
    contentType: 'markdown',
    editorProps: {
      attributes: {
        class: 'tiptap ProseMirror max-w-[720px] mx-auto'
      }
    },
    onUpdate: ({ editor: instance }) => {
      onChange?.(instance.getMarkdown())
    }
  })

  // Reflect external document changes (file switch / save) into the editor.
  useEffect(() => {
    if (!editor) return
    const next = content ?? ''
    if (editor.getMarkdown() === next) return
    editor.commands.setContent(next, { contentType: 'markdown' })
  }, [editor, content])

  return editor
}
