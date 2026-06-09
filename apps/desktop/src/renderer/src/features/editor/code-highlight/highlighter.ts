import type { BundledLanguage, Highlighter } from 'shiki'

/**
 * Shared Shiki highlighter for the editor's code blocks.
 *
 * - Shiki (core + JS RegExp engine, no Oniguruma WASM) is imported lazily on
 *   first use, so it stays out of the initial bundle; grammars then load on
 *   demand per language.
 * - Highlights with two built-in themes — One Light / GitHub Dark — and exposes
 *   both colors per token so the editor can switch via CSS `light-dark()`.
 * - `notify()` lets the editor re-highlight once the highlighter (or a newly
 *   requested grammar) becomes available.
 */

const LIGHT_THEME = 'one-light'
const DARK_THEME = 'github-dark'

/** Fence languages that need no highlighting (rendered as plain text). */
const PLAIN_LANGS = new Set(['', 'text', 'txt', 'plaintext', 'plain', 'ansi'])

/** A token with both theme colors, ready to render with CSS `light-dark()`. */
export type DualToken = {
  offset: number
  length: number
  lightColor: string
  darkColor: string
  fontStyle: number
}

let highlighter: Highlighter | null = null
let highlighterPromise: Promise<Highlighter> | null = null
let supportedLangs = new Set<string>()
const loadedLangs = new Set<string>()
const loadingLangs = new Set<string>()

const listeners = new Set<() => void>()

/** Subscribe to "highlighter or a language became ready" — returns an unsubscribe. */
export function onHighlighterChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(): void {
  for (const listener of listeners) listener()
}

/** Kick off lazy highlighter creation (idempotent); notifies listeners when ready. */
export function ensureHighlighter(): void {
  if (highlighter || highlighterPromise) return
  highlighterPromise = (async () => {
    const [shiki, { createJavaScriptRegexEngine }] = await Promise.all([
      import('shiki'),
      import('shiki/engine/javascript')
    ])
    supportedLangs = new Set(Object.keys(shiki.bundledLanguages))
    return shiki.createHighlighter({
      themes: [LIGHT_THEME, DARK_THEME],
      langs: [],
      engine: createJavaScriptRegexEngine()
    })
  })()
  void highlighterPromise.then((instance) => {
    highlighter = instance
    notify()
  })
}

function ensureLanguage(lang: string): void {
  if (!highlighter || loadedLangs.has(lang) || loadingLangs.has(lang)) return
  if (!supportedLangs.has(lang)) return
  loadingLangs.add(lang)
  void highlighter
    .loadLanguage(lang as BundledLanguage)
    .then(() => {
      loadedLangs.add(lang)
      notify()
    })
    .catch(() => {
      // Unsupported / failed grammar: leave the block as plain text.
    })
    .finally(() => {
      loadingLangs.delete(lang)
    })
}

/**
 * Tokenize `code` synchronously if the highlighter and grammar are ready.
 * Returns null otherwise, having scheduled the necessary loads — callers should
 * re-run on the next {@link onHighlighterChange} notification.
 */
export function highlightSync(code: string, lang: string): DualToken[][] | null {
  if (PLAIN_LANGS.has(lang)) return null
  if (!highlighter) {
    ensureHighlighter()
    return null
  }
  if (!loadedLangs.has(lang)) {
    ensureLanguage(lang)
    return null
  }
  try {
    const lines = highlighter.codeToTokensWithThemes(code, {
      lang: lang as BundledLanguage,
      themes: { light: LIGHT_THEME, dark: DARK_THEME }
    })
    return lines.map((line) =>
      line.map((token) => ({
        offset: token.offset,
        length: token.content.length,
        lightColor: token.variants.light?.color ?? 'inherit',
        darkColor: token.variants.dark?.color ?? 'inherit',
        fontStyle: token.variants.light?.fontStyle ?? 0
      }))
    )
  } catch {
    return null
  }
}
