import {EditorView} from "@codemirror/view"

// Keep track of ordinal
export class Ordinal {
    static base = 0
}

// Wrap selection(s) in cloze tags
const CLOZE_ORD_RE = new RegExp(String.raw`{{c(\d+)::`, 'g')
const clozeSelections = (inc: boolean) => (view: EditorView) => {
    const selection = view.state.selection
    let i = Ordinal.base
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

// Public functions 
const clozeNext = clozeSelections(true)
const clozeCurrent = clozeSelections(false)

// Keyboard shortcuts
const ankiClozeKeymap = [
    { key: 'Ctrl-Shift-c', run: clozeNext },
    { key: 'Ctrl-Alt-Shift-c', run: clozeCurrent }
]

// Create extension with current ordinal
function ankiCloze(options: {} = {}): [] {
    Ordinal.base = options.hasOwnProperty('ordinal') ? options['ordinal'] : 0
    return []
}

export {clozeNext, clozeCurrent, ankiClozeKeymap, ankiCloze}