import { EditorView } from "@codemirror/view"

declare function bridgeCommand(msg: string): void
declare function bridgeCommand(msg: string, cb: (txt: string) => void): string

/**
 * Extension to handle pasting images into editor, adding it to Anki and
 * inserting markdown link
 */
export function ankiImagePaste(options = {}): any {
  return EditorView.domEventHandlers({
    paste(event, view) {
      bridgeCommand("clipboard_image_to_markdown", (txt) => {
        if (txt) {
          const selection = view.state.selection
          const trs: {}[] = []
          selection.ranges.forEach((rng, n) => {
            trs.push({
              changes: {
                from: rng.from, to: rng.to,
                insert: txt
              }
            })
          })
          view.dispatch(...trs)
          view.dispatch({
            selection: {
              anchor: view.state.selection.main.from + 2
            }
          })
          return true
        }
      })
      return false
    }
  })
}
