// @ts-ignore FIXME: how to import correctly?
import type { EditorFieldAPI } from "anki/ts/editor/EditorField.svelte"
import { create_editor as _create_editor } from "./editor"
import { html_to_markdown, markdown_to_html } from "./converter"
import { ancestor } from "./utils"
import { CustomInputClass } from "./custom_input"

const MD = '<!--?xml version="1.0" encoding="UTF-8"?--><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="mdi-md-hollow" width="24" height="24" viewBox="0 0 208 128"><path clip-rule="evenodd" d="m15 10c-2.7614 0-5 2.2386-5 5v98c0 2.761 2.2386 5 5 5h178c2.761 0 5-2.239 5-5v-98c0-2.7614-2.239-5-5-5zm-15 5c0-8.28427 6.71573-15 15-15h178c8.284 0 15 6.71573 15 15v98c0 8.284-6.716 15-15 15h-178c-8.28427 0-15-6.716-15-15z" fill-rule="evenodd"/><path d="m30 98v-68h20l20 25 20-25h20v68h-20v-39l-20 25-20-25v39zm125 0-30-33h20v-35h20v35h20z"/></svg>'

const _config = {
    MDI: null as CustomInputClass,
    'Default field state': 'rich text',
    'Cycle rich text/Markdown': false
}

/////////////////////////////////////////////////////////////////////////////
// Non-arrow function (for `this` use) to instantiate an editor instance
function create_editor(parent: HTMLDivElement, onchange: (html: string) => void) {
    return _create_editor(
        parent,
        (md: string) => {
            onchange(markdown_to_html(md))
        },{
            wheel(evt: WheelEvent) {
                const fields = ancestor(parent, '.fields')
                switch(evt.deltaMode){
                    case 0: //DOM_DELTA_PIXEL
                        fields.scrollTop += evt.deltaY
                        fields.scrollLeft += evt.deltaX
                        break
                    case 1: //DOM_DELTA_LINE
                        fields.scrollTop += 15 * evt.deltaY
                        fields.scrollLeft += 15 * evt.deltaX
                        break
                    case 2: //DOM_DELTA_PAGE
                        fields.scrollTop += 0.03 * evt.deltaY
                        fields.scrollLeft += 0.03 * evt.deltaX
                        break
                }
            }
        }
    )
}


/////////////////////////////////////////////////////////////////////////////
// Non-arrow function (for `this` use) to focus custom input editor
function focus() {
    this.editor.focus()
}

/////////////////////////////////////////////////////////////////////////////
// Non-arrow function (for `this` use) to set content of custom editor
function set_custom_content(html: string) {
    const [md, ord] = html_to_markdown(html)
    this.editor.set_doc(md, ord, 'end')
}

/////////////////////////////////////////////////////////////////////////////
// Non-arrow function (for `this` use) to set field input default state
function onadd() {
    if(_config['Default field state'].toLowerCase() != 'rich text') {
        this.toggle()
        this.toggle_rich()
    }
}


/////////////////////////////////////////////////////////////////////////////
// Setup event listeners and configuration - create CM instances only on demand
function init(cfg: {}) {
    for (const key in cfg) _config[key] = cfg[key]
    let tip = "Toggle Markdown input"
    if(_config['Shortcut']) tip += ` (${_config['Shortcut']})`


    _config.MDI = new CustomInputClass({
        class_name: "markdown-input",
        tooltip: tip,
        create_editor: create_editor,
        focus: focus,
        set_custom_content: set_custom_content,
        onadd: onadd,
        badge: MD
    })
}

/////////////////////////////////////////////////////////////////////////////
// Toggle md input
function toggle(field: number | EditorFieldAPI) {
    _config.MDI.get_api(field).then(api => {
        if (_config['Cycle rich text/Markdown'] && api.visible() !== api.rich_visible()) {
            api.toggle(true)
            api.toggle_rich(true)
        } else api.toggle()
    })
}

/////////////////////////////////////////////////////////////////////////////
// Toggle rich text input
function toggle_rich(field: number | EditorFieldAPI) {
    _config.MDI.get_api(field).then(api => api.toggle_rich())
}

/////////////////////////////////////////////////////////////////////////////
// Update MD content in all visible MD input on note load
function update_all() {
    _config.MDI.update_all()
}

/////////////////////////////////////////////////////////////////////////////
// Cycle to next input, changing field PRN
function cycle_next() {
    _config.MDI.cycle_next()
}

/////////////////////////////////////////////////////////////////////////////
// Cycle to previous input, changing field PRN
function cycle_prev() {
    _config.MDI.cycle_prev()
}


export { init as converter_init } from "./converter"
export { init as editor_init } from "./editor"
export type { CustomInputClass } from "./custom_input"
export { init, toggle, toggle_rich, update_all, cycle_next, cycle_prev }
