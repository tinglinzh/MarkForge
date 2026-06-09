import './globals.css'
import { WorkspacePanel } from './features/workspace/workspace-panel'
import { EditorPanel } from './features/editor/editor-panel'
import { useWorkspace } from './features/workspace/use-workspace'

function App(): React.JSX.Element {
  const workspace = useWorkspace()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white/60 backdrop-blur-md text-foreground">
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
      />
      <main className="min-w-0 flex-1 p-3 pl-0">
        <EditorPanel
          document={workspace.document}
          activePath={workspace.activePath}
          status={workspace.status}
          onSave={workspace.saveFile}
          onRestoreVersion={workspace.restoreVersion}
        />
      </main>
    </div>
  )
}

export default App
