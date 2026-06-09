/**
 * Workspace panel icons, backed by Hugeicons (monochrome line style). Each
 * export keeps a `{ size }` prop and inherits `currentColor`, so callers are
 * unchanged.
 */
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  FolderAddIcon,
  FileAddIcon,
  SparklesIcon,
  Folder01Icon,
  FolderOpenIcon as HugeFolderOpenIcon,
  ArrowRight01Icon,
  File01Icon,
  FloppyDiskIcon
} from '@hugeicons/core-free-icons'

type IconProps = { size?: number }

function makeIcon(glyph: IconSvgElement, displayName: string) {
  function Icon({ size = 16 }: IconProps): React.JSX.Element {
    return <HugeiconsIcon icon={glyph} size={size} />
  }
  Icon.displayName = displayName
  return Icon
}

export const FolderPlusIcon = makeIcon(FolderAddIcon, 'FolderPlusIcon')
export const FilePlusIcon = makeIcon(FileAddIcon, 'FilePlusIcon')
export const SparkleIcon = makeIcon(SparklesIcon, 'SparkleIcon')
export const FolderIcon = makeIcon(Folder01Icon, 'FolderIcon')
export const FolderOpenIcon = makeIcon(HugeFolderOpenIcon, 'FolderOpenIcon')
export const ChevronRightIcon = makeIcon(ArrowRight01Icon, 'ChevronRightIcon')
export const FileTextIcon = makeIcon(File01Icon, 'FileTextIcon')
export const SaveIcon = makeIcon(FloppyDiskIcon, 'SaveIcon')
