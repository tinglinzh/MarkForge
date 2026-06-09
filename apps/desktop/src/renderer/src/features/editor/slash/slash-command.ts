import { Extension, type Editor, type Range } from '@tiptap/core'
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import {
  TextIcon,
  H1Icon,
  H2Icon,
  H3Icon,
  BulletListIcon,
  OrderedListIcon,
  QuoteIcon,
  CodeIcon,
  DividerIcon
} from '../icons'
import { SlashMenu, type SlashMenuRef, type SlashMenuProps } from './slash-menu'

type IconComponent = (props: { size?: number }) => React.JSX.Element

/** One entry in the "/" insert menu. */
export type SlashItem = {
  title: string
  subtitle: string
  /** Lowercase search terms (incl. English aliases) for filtering. */
  keywords: string[]
  icon: IconComponent
  /** Runs the insertion, having first removed the typed "/query". */
  command: (props: { editor: Editor; range: Range }) => void
}

const ITEMS: SlashItem[] = [
  {
    title: '正文',
    subtitle: '普通段落文本',
    keywords: ['text', 'paragraph', 'p', 'zhengwen'],
    icon: TextIcon,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run()
  },
  {
    title: '标题 1',
    subtitle: '大号章节标题',
    keywords: ['h1', 'heading', 'title', 'biaoti'],
    icon: H1Icon,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
  },
  {
    title: '标题 2',
    subtitle: '中号小节标题',
    keywords: ['h2', 'heading', 'biaoti'],
    icon: H2Icon,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
  },
  {
    title: '标题 3',
    subtitle: '小号子标题',
    keywords: ['h3', 'heading', 'biaoti'],
    icon: H3Icon,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run()
  },
  {
    title: '无序列表',
    subtitle: '以圆点开始的列表',
    keywords: ['bullet', 'ul', 'list', 'liebiao'],
    icon: BulletListIcon,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
  },
  {
    title: '有序列表',
    subtitle: '以数字开始的列表',
    keywords: ['ordered', 'ol', 'number', 'list', 'liebiao'],
    icon: OrderedListIcon,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
  },
  {
    title: '引用',
    subtitle: '引用块',
    keywords: ['quote', 'blockquote', 'yinyong'],
    icon: QuoteIcon,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
  },
  {
    title: '代码块',
    subtitle: '带语法高亮的代码',
    keywords: ['code', 'codeblock', 'daima'],
    icon: CodeIcon,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
  },
  {
    title: '分割线',
    subtitle: '水平分隔线',
    keywords: ['divider', 'hr', 'rule', 'fenge'],
    icon: DividerIcon,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
  }
]

function getItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return ITEMS
  return ITEMS.filter(
    (item) => item.title.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q))
  )
}

/** Keep the popup near the caret, flipping above / clamping to the viewport. */
function positionPopup(popup: HTMLElement, getRect: SuggestionProps['clientRect']): void {
  const rect = getRect?.()
  if (!rect) return
  const { width, height } = popup.getBoundingClientRect()
  let top = rect.bottom + 6
  if (top + height > window.innerHeight - 8) top = rect.top - height - 6
  let left = rect.left
  if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8
  popup.style.top = `${Math.max(8, top)}px`
  popup.style.left = `${Math.max(8, left)}px`
}

function makeRenderer(): {
  onStart: (props: SuggestionProps<SlashItem>) => void
  onUpdate: (props: SuggestionProps<SlashItem>) => void
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
  onExit: () => void
} {
  let component: ReactRenderer<SlashMenuRef, SlashMenuProps> | null = null
  let popup: HTMLDivElement | null = null

  return {
    onStart: (props: SuggestionProps<SlashItem>) => {
      component = new ReactRenderer(SlashMenu, { props, editor: props.editor })
      popup = document.createElement('div')
      popup.style.position = 'fixed'
      popup.style.zIndex = '60'
      popup.appendChild(component.element)
      document.body.appendChild(popup)
      positionPopup(popup, props.clientRect)
    },
    onUpdate: (props: SuggestionProps<SlashItem>) => {
      component?.updateProps(props)
      if (popup) positionPopup(popup, props.clientRect)
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === 'Escape') {
        popup?.remove()
        popup = null
        return true
      }
      return component?.ref?.onKeyDown(props.event) ?? false
    },
    onExit: () => {
      popup?.remove()
      popup = null
      component?.destroy()
      component = null
    }
  }
}

/** Slash ("/") insert menu for adding blocks — headings, lists, quote, code… */
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        // Don't hijack "/" inside code blocks (where slashes are common).
        allow: ({ state, range }) => state.doc.resolve(range.from).parent.type.name !== 'codeBlock',
        command: ({ editor, range, props }) => props.command({ editor, range }),
        items: ({ query }) => getItems(query),
        render: makeRenderer
      })
    ]
  }
})
