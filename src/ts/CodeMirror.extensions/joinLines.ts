import {EditorView} from "@codemirror/view"
const doJoinLines = (view: EditorView) => {
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

// Create extension with current ordinal
function joinLines(options: {} = {}): [] {
    return []
}

// Keyboard shortcuts
const joinLinesKeymap = [
    { key: 'Ctrl-Shift-j', run: doJoinLines }
]


export {joinLines, joinLinesKeymap}