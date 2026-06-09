import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { ensureHighlighter, highlightSync, onHighlighterChange } from './highlighter'
import { detectLanguage } from './detect-language'

const pluginKey = new PluginKey('codeBlockShikiHighlight')

/** Shiki `fontStyle` bitmask → inline CSS. */
function fontStyleCss(fontStyle: number | undefined): string {
  if (!fontStyle) return ''
  let css = ''
  if (fontStyle & 1) css += ';font-style:italic'
  if (fontStyle & 2) css += ';font-weight:bold'
  if (fontStyle & 4) css += ';text-decoration:underline'
  return css
}

/** Build colorizing inline decorations for every `codeBlock` node in the doc. */
function buildDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (node.type.name !== 'codeBlock') return undefined
    const code = node.textContent
    // Use the fence's language; if none, auto-detect so it still highlights.
    const lang = (node.attrs.language as string | null) || detectLanguage(code)
    const lines = highlightSync(code, lang)
    if (!lines) return false // not a highlightable / ready block — recompute later

    // +1 to step inside the code block to its text content.
    const blockStart = pos + 1
    for (const line of lines) {
      for (const token of line) {
        const from = blockStart + token.offset
        const to = from + token.length
        if (to <= from) continue
        // Carry both theme colors; `light-dark()` picks one per color scheme.
        const style =
          `--s-l:${token.lightColor};--s-d:${token.darkColor};` +
          `color:light-dark(var(--s-l),var(--s-d))${fontStyleCss(token.fontStyle)}`
        decorations.push(Decoration.inline(from, to, { style }))
      }
    }
    return false // code blocks hold only text — no children to descend into
  })

  return DecorationSet.create(doc, decorations)
}

/**
 * Live syntax highlighting for the editor's code blocks. A ProseMirror plugin
 * tokenizes each `codeBlock` with Shiki and paints the result as inline
 * decorations over the still-editable text — so highlighting updates as you
 * type without changing the document. Highlighting is applied to whatever
 * `codeBlock` node the editor already provides (e.g. StarterKit's), so this
 * extension adds no node of its own.
 */
export const CodeBlockHighlight = Extension.create({
  name: 'codeBlockShikiHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        view(view) {
          ensureHighlighter()
          // Re-decorate once the highlighter or a requested grammar loads.
          const unsubscribe = onHighlighterChange(() => {
            if (view.isDestroyed) return
            view.dispatch(view.state.tr.setMeta(pluginKey, true))
          })
          return { destroy: unsubscribe }
        },
        state: {
          init: (_config, state) => buildDecorations(state.doc),
          apply(tr, value, _oldState, newState) {
            if (tr.docChanged || tr.getMeta(pluginKey)) return buildDecorations(newState.doc)
            return value.map(tr.mapping, tr.doc)
          }
        },
        props: {
          decorations(state) {
            return pluginKey.getState(state)
          }
        }
      })
    ]
  }
})
