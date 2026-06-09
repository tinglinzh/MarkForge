import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export type WorkspaceKind = 'playground' | 'folder'

export type WorkspaceEntries = {
  files: string[]
  dirs: string[]
}

export type WorkspaceFolder = WorkspaceEntries & {
  root: string
  name: string
  kind: WorkspaceKind
}

export type MutationResult = WorkspaceEntries & {
  path: string | null
}

export type InitialWorkspaces = {
  workspaces: WorkspaceFolder[]
  activeRoot: string
}

export type HistoryEntry = {
  id: string
  timestamp: number
  size: number
}

// Custom APIs for renderer
const api = {
  workspace: {
    getInitial: (): Promise<InitialWorkspaces> => ipcRenderer.invoke('workspace:get-initial'),
    persist: (folders: string[], activeRoot: string | null): Promise<void> =>
      ipcRenderer.invoke('workspace:persist', folders, activeRoot),
    getPlayground: (): Promise<WorkspaceFolder> => ipcRenderer.invoke('workspace:get-playground'),
    selectFolder: (): Promise<WorkspaceFolder | null> =>
      ipcRenderer.invoke('workspace:select-folder'),
    readFile: (root: string, relativePath: string): Promise<string> =>
      ipcRenderer.invoke('workspace:read-file', root, relativePath),
    writeFile: (root: string, relativePath: string, content: string): Promise<void> =>
      ipcRenderer.invoke('workspace:write-file', root, relativePath, content),
    createFile: (root: string, dir: string, name: string): Promise<MutationResult> =>
      ipcRenderer.invoke('workspace:create-file', root, dir, name),
    createFolder: (root: string, dir: string, name: string): Promise<MutationResult> =>
      ipcRenderer.invoke('workspace:create-folder', root, dir, name),
    rename: (root: string, fromRel: string, toRel: string): Promise<MutationResult> =>
      ipcRenderer.invoke('workspace:rename', root, fromRel, toRel),
    move: (root: string, fromRel: string, toDir: string): Promise<MutationResult> =>
      ipcRenderer.invoke('workspace:move', root, fromRel, toDir),
    delete: (root: string, rel: string): Promise<MutationResult> =>
      ipcRenderer.invoke('workspace:delete', root, rel),
    restoreVersion: (root: string, rel: string, id: string): Promise<string> =>
      ipcRenderer.invoke('workspace:restore-version', root, rel, id)
  },
  history: {
    list: (root: string, relativePath: string): Promise<HistoryEntry[]> =>
      ipcRenderer.invoke('history:list', root, relativePath),
    read: (root: string, relativePath: string, id: string): Promise<string> =>
      ipcRenderer.invoke('history:read', root, relativePath, id)
  }
}

export type WorkspaceApi = typeof api

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
