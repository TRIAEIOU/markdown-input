import {EditorView} from "@codemirror/view"
declare function bridgeCommand(msg: string): void
declare function bridgeCommand(msg: string, cb: (txt: string) => void): string

function paste_string(view: EditorView, str: string) {
    const selection = view.state.selection
    const trs = []
    selection.ranges.forEach((rng, n) => {
        trs.push({
            changes: {
                from: rng.from, to: rng.to,
                insert: str
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

function ankiImagePaste(options = {}): any {
    return EditorView.domEventHandlers({
        paste(event, view) {
            bridgeCommand("clipboard_image_to_markdown", (txt) => {
                if (txt) paste_string(view, txt)
            })
            return false
        }
    })
}
export {ankiImagePaste}