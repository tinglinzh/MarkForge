import { Button } from '@heroui/react'
import type { Editor } from '@tiptap/react'
import {
  BoldIcon,
  ItalicIcon,
  StrikeIcon,
  CodeIcon,
  H1Icon,
  H2Icon,
  H3Icon,
  BulletListIcon,
  OrderedListIcon,
  QuoteIcon,
  UndoIcon,
  RedoIcon
} from './icons'

type EditorToolbarProps = {
  editor: Editor
}

type IconComponent = (props: { size?: number }) => React.JSX.Element

/** Formatting toolbar bound to the Tiptap editor. */
export function EditorToolbar({ editor }: EditorToolbarProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-0.5">
      <ToolButton
        icon={BoldIcon}
        label="加粗"
        isActive={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolButton
        icon={ItalicIcon}
        label="斜体"
        isActive={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolButton
        icon={StrikeIcon}
        label="删除线"
        isActive={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolButton
        icon={CodeIcon}
        label="行内代码"
        isActive={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />

      <Divider />

      <ToolButton
        icon={H1Icon}
        label="标题 1"
        isActive={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolButton
        icon={H2Icon}
        label="标题 2"
        isActive={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <ToolButton
        icon={H3Icon}
        label="标题 3"
        isActive={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <Divider />

      <ToolButton
        icon={BulletListIcon}
        label="无序列表"
        isActive={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolButton
        icon={OrderedListIcon}
        label="有序列表"
        isActive={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolButton
        icon={QuoteIcon}
        label="引用"
        isActive={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />

      <Divider />

      <ToolButton
        icon={UndoIcon}
        label="撤销"
        isDisabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <ToolButton
        icon={RedoIcon}
        label="重做"
        isDisabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      />
    </div>
  )
}

type ToolButtonProps = {
  icon: IconComponent
  label: string
  onClick: () => void
  isActive?: boolean
  isDisabled?: boolean
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
  isActive = false,
  isDisabled = false
}: ToolButtonProps): React.JSX.Element {
  return (
    <Button
      isIconOnly
      variant="ghost"
      size="sm"
      aria-label={label}
      aria-pressed={isActive}
      isDisabled={isDisabled}
      onPress={onClick}
      className={[
        'h-8 w-8 min-w-0 bg-transparent text-muted-foreground',
        'hover:bg-accent hover:text-accent-foreground',
        isActive ? 'bg-accent text-accent-foreground' : ''
      ].join(' ')}
    >
      <Icon size={16} />
    </Button>
  )
}

function Divider(): React.JSX.Element {
  return <span className="mx-1 h-4 w-px bg-border" aria-hidden />
}
