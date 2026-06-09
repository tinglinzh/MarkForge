import detect from 'flourite'

/**
 * Guesses a Shiki language id for a code block that has no language set, so it
 * still gets syntax highlighting. Uses flourite's `shiki` mode (which returns
 * Shiki-compatible ids directly) and caches by content to avoid re-detecting on
 * every keystroke. Returns '' when the language can't be determined.
 */

const cache = new Map<string, string>()
const MAX_CACHE = 200

export function detectLanguage(code: string): string {
  const trimmed = code.trim()
  // Too little to guess reliably — leave it plain.
  if (trimmed.length < 3) return ''

  const cached = cache.get(code)
  if (cached !== undefined) return cached

  let lang = ''
  try {
    const { language } = detect(code, { shiki: true, noUnknown: false })
    if (language && language.toLowerCase() !== 'unknown') lang = language
  } catch {
    lang = ''
  }

  if (cache.size >= MAX_CACHE) cache.clear()
  cache.set(code, lang)
  return lang
}
