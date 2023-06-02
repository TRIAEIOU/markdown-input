import { EditorView, ViewUpdate, Decoration, DecorationSet, ViewPlugin } from "@codemirror/view"
import { EditorState, RangeSetBuilder } from "@codemirror/state"

const CLOZE = Decoration.mark({
  attributes: {class: "cm-cloze"}
})
const CLOZE_RE = new RegExp(String.raw`(?:{{c\d+::|}})`, 'g')

function _deco(view: EditorView) {
  let builder = new RangeSetBuilder<Decoration>()
  for (let {from, to} of view.visibleRanges) {
    for (let pos = from; pos <= to;) {
      let line = view.state.doc.lineAt(pos)
      for (const match of line.text.matchAll(CLOZE_RE)) {
        builder.add(line.from + match.index, line.from + match.index + match[0].length, CLOZE)
      }
      pos = line.to + 1
    }
  }
  return builder.finish()
}

const cloze_decorator = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = _deco(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged)
      this.decorations = _deco(update.view)
  }
}, {
  decorations: v => v.decorations
})

export {cloze_decorator}

