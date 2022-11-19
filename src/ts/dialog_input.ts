import type {MDIEditorView} from "./editor"
import {create_editor} from "./editor"
import {html_to_markdown, markdown_to_html} from "./converter"

let _codemirror: MDIEditorView = undefined

function set_html(html: string) {
    const [md, ord] = html_to_markdown(html)
    if (!_codemirror) _codemirror = create_editor(document.body)
    _codemirror.set_doc(md, ord, 'end')
    _codemirror.focus()
}

function get_html(): string {
    return markdown_to_html(_codemirror.state.doc.toString())
}

export {init as converter_init} from "./converter"
export {init as editor_init} from "./editor"
export {set_html, get_html}
