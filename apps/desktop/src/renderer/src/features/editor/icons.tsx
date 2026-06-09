/**
 * Editor toolbar / menu icons, backed by Hugeicons (monochrome line style).
 * Each export keeps a `{ size }` prop and inherits `currentColor`, so callers
 * are unchanged. Decorative/glass icons live elsewhere (nucleo-glass-icons).
 */
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  SourceCodeIcon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  QuoteDownIcon,
  ArrowTurnBackwardIcon,
  ArrowTurnForwardIcon,
  GitCompareIcon,
  Clock01Icon,
  ArrowReloadHorizontalIcon,
  ParagraphIcon,
  MinusSignIcon
} from '@hugeicons/core-free-icons'

type IconProps = { size?: number }

function makeIcon(glyph: IconSvgElement, displayName: string) {
  function Icon({ size = 16 }: IconProps): React.JSX.Element {
    return <HugeiconsIcon icon={glyph} size={size} />
  }
  Icon.displayName = displayName
  return Icon
}

export const BoldIcon = makeIcon(TextBoldIcon, 'BoldIcon')
export const ItalicIcon = makeIcon(TextItalicIcon, 'ItalicIcon')
export const StrikeIcon = makeIcon(TextStrikethroughIcon, 'StrikeIcon')
export const CodeIcon = makeIcon(SourceCodeIcon, 'CodeIcon')
export const H1Icon = makeIcon(Heading01Icon, 'H1Icon')
export const H2Icon = makeIcon(Heading02Icon, 'H2Icon')
export const H3Icon = makeIcon(Heading03Icon, 'H3Icon')
export const BulletListIcon = makeIcon(LeftToRightListBulletIcon, 'BulletListIcon')
export const OrderedListIcon = makeIcon(LeftToRightListNumberIcon, 'OrderedListIcon')
export const QuoteIcon = makeIcon(QuoteDownIcon, 'QuoteIcon')
export const UndoIcon = makeIcon(ArrowTurnBackwardIcon, 'UndoIcon')
export const RedoIcon = makeIcon(ArrowTurnForwardIcon, 'RedoIcon')
export const DiffIcon = makeIcon(GitCompareIcon, 'DiffIcon')
export const HistoryIcon = makeIcon(Clock01Icon, 'HistoryIcon')
export const RestoreIcon = makeIcon(ArrowReloadHorizontalIcon, 'RestoreIcon')
export const TextIcon = makeIcon(ParagraphIcon, 'TextIcon')
export const DividerIcon = makeIcon(MinusSignIcon, 'DividerIcon')
