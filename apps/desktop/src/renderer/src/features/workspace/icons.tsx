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
  FloppyDiskIcon,
  SidebarLeft01Icon
} from '@hugeicons/core-free-icons'

type IconProps = { size?: number }

function makeIcon(glyph: IconSvgElement) {
  function Icon({ size = 16 }: IconProps): React.JSX.Element {
    return <HugeiconsIcon icon={glyph} size={size} />
  }
  return Icon
}

export const FolderPlusIcon = makeIcon(FolderAddIcon)
export const FilePlusIcon = makeIcon(FileAddIcon)
export const SparkleIcon = makeIcon(SparklesIcon)
export const FolderIcon = makeIcon(Folder01Icon)
export const FolderOpenIcon = makeIcon(HugeFolderOpenIcon)
export const ChevronRightIcon = makeIcon(ArrowRight01Icon)
export const FileTextIcon = makeIcon(File01Icon)
export const SaveIcon = makeIcon(FloppyDiskIcon)
export const SidebarIcon = makeIcon(SidebarLeft01Icon)
