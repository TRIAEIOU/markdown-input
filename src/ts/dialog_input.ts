import { EditorView } from "@codemirror/view";
import { create } from "./editor"
import { html_to_markdown, markdown_to_html } from "./converter";

let _codemirror: EditorView = undefined;

async function set_html(html: string) {
    const [md, ord] = await html_to_markdown(html);
    if (!_codemirror) _codemirror = create(document.body, md, ord);
    _codemirror.focus();
}

async function get_html(): Promise<string> {
    return await markdown_to_html(_codemirror.state.doc.toString())
}

export {configure as converter_configure} from "./converter";
export {configure as editor_configure} from "./editor";
export {set_html, get_html}
