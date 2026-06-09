/** Posix-style path helpers for workspace-relative paths (always `/`). */

export function posixDirname(path: string): string {
  const index = path.lastIndexOf('/')
  return index < 0 ? '' : path.slice(0, index)
}

export function posixBasename(path: string): string {
  const index = path.lastIndexOf('/')
  return index < 0 ? path : path.slice(index + 1)
}

export function posixJoin(dir: string, name: string): string {
  const clean = dir.replace(/^\/+|\/+$/g, '')
  return clean ? `${clean}/${name}` : name
}

/** True when `path` is inside (or equal to) directory `dir`. */
export function isInsideDir(path: string, dir: string): boolean {
  if (!dir) return true
  return path === dir || path.startsWith(`${dir}/`)
}
