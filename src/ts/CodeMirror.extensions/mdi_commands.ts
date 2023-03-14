/**
 * Custom editor commands for mapping to keymap
 */
import { EditorView } from "@codemirror/view"

const CLOZE_ORD_RE = new RegExp(String.raw`{{c(\d+)::`, 'g')
/**
 * Wrap selection(s) in cloze tags
 * @param inc increase ordinal or not
 * @returns
 */
const clozeSelections = (inc: boolean) => (view: EditorView) => {
  const selection = view.state.selection
  let i = 0
  let itr = view.state.doc.iter()
  while (!itr.done) {
    if (!itr.lineBreak) {
      let match: RegExpExecArray
      while ((match = CLOZE_ORD_RE.exec(itr.value)) !== null) {
        const n = parseInt(match[1])
        if (n > i) i = n
      }
    }
    itr.next()
  }

  const trs = []
  selection.ranges.forEach((rng, n) => {
    if (inc) i++
    if (rng.empty) {
      trs.push({
        changes: {
          from: rng.from, to: rng.from,
          insert: `{{c${i || 1}::}}`
        }
      })
    } else {
      trs.push(
        {
          changes: {
            from: rng.from, to: rng.from,
            insert: `{{c${i || 1}::`
          }
        },
        {
          changes: {
            from: rng.to, to: rng.to,
            insert: '}}'
          }
        }
      )

    }
  })
  view.dispatch(...trs)
  const mrng = view.state.selection.main
  const startl = `\{\{c${i}::`.length
  view.dispatch({
    selection: {
      anchor: mrng.empty
        ? mrng.from + startl
        : mrng.head > mrng.anchor
          ? mrng.head + 2
          : mrng.head - startl
    }
  })
  return true
}

// Public cloze commands
/** Encloze selection(s) incrementing cloze ordinal */
export const clozeNext = clozeSelections(true)
/** Encloze selection(s) without incrementing cloze ordinal */
export const clozeCurrent = clozeSelections(false)

/** Joint lines in selection(s) (or next line if no selection) */
export const joinLines = (view: EditorView) => {
  const selection = view.state.selection
  const trs = []
  const text = view.state.doc.toString()
  selection.ranges.forEach((rng, n) => {
      const to = rng.empty ? text.length : rng.to
      const tin = text.substring(rng.from, to)
      const tout = rng.empty
          ? tin.replace(/\s*\n[\n\s]*/, ' ')
          : tin.replace(/\s*\n[\n\s]*/g, ' ')
      if (tout !== tin)
          trs.push({
              changes: {
                  from: rng.from, to: to,
                  insert: tout
              }
          })
  })

  if (!trs.length) return false
  view.dispatch(...trs)
  return true
}
