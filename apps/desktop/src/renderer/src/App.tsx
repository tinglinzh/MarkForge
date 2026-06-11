import './globals.css'
import { useState } from 'react'
import { motion } from 'motion/react'
import { WorkspacePanel } from './features/workspace/workspace-panel'
import { EditorPanel } from './features/editor/editor-panel'
import { useWorkspace } from './features/workspace/use-workspace'

/** Width of the open workspace sidebar (matches the inner aside's w-67). */
const SIDEBAR_WIDTH = 268

function App(): React.JSX.Element {
  const workspace = useWorkspace()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white/60 backdrop-blur-md text-foreground">
      {/* Animated shell: collapses the sidebar to 0 width while the inner aside
          keeps its fixed width, so content is clipped cleanly instead of squished. */}
      <motion.div
        className="shrink-0 overflow-hidden"
        initial={false}
        animate={{ width: sidebarOpen ? SIDEBAR_WIDTH : 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 38, mass: 0.9 }}
      >
        <WorkspacePanel
          workspaces={workspace.workspaces}
          activeWorkspace={workspace.activeWorkspace}
          activePath={workspace.activePath}
          isOpeningFolder={workspace.isOpeningFolder}
          targetDir={workspace.targetDir}
          onSelectWorkspace={workspace.selectActiveWorkspace}
          onAddWorkspace={workspace.addWorkspace}
          onSelectFile={workspace.openFile}
          onSelectionChange={workspace.setSelection}
          onCreateFile={workspace.createFile}
          onCreateFolder={workspace.createFolder}
          onRenamePath={workspace.renamePath}
          onMovePaths={workspace.movePaths}
          onDeletePath={workspace.deletePath}
          onCollapse={() => setSidebarOpen(false)}
        />
      </motion.div>
      <motion.main
        className="min-w-0 flex-1 py-3 pr-3"
        initial={false}
        animate={{ paddingLeft: sidebarOpen ? 0 : 12 }}
        transition={{ type: 'spring', stiffness: 360, damping: 38, mass: 0.9 }}
      >
        <EditorPanel
          document={workspace.document}
          activePath={workspace.activePath}
          status={workspace.status}
          sidebarOpen={sidebarOpen}
          onSave={workspace.saveFile}
          onRestoreVersion={workspace.restoreVersion}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      </motion.main>
    </div>
  )
}

export default App
