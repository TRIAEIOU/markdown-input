import {get} from "svelte/store"
// @ts-ignore FIXME: how to import correctly?
import type {NoteEditorAPI} from "anki/ts/editor/NoteEditor.svelte"
declare var NoteEditor: {
    context: any,
    lifecycle: any,
    instances: NoteEditorAPI[]
}
// @ts-ignore FIXME: how to import correctly?
import type {EditorFieldAPI} from "anki/ts/editor/EditorField.svelte"
// @ts-ignore FIXME: how to import correctly?
import type {PlainTextInputAPI} from "anki/ts/editor/plain-text-input"
// @ts-ignore FIXME: how to import correctly?
import type {RichTextInputAPI} from "anki/ts/editor/rich-text-input"
import {create, set_doc} from "./editor"
import {html_to_markdown, markdown_to_html} from "./converter"
import {EditorView} from "@codemirror/view"

const FIELD_DEFAULT = 'Default field state'
const HIDE_PLAIN = 'Hide plain text on toggle'
const HIDE_RICH = 'Hide rich text on toggle'
const RESTORE = 'Restore state on toggle'

const _config = {
    'Default field state': 'rich text',
    'Hide plain text on toggle': true,
    'Hide rich text on toggle': true,
    'Restore state on toggle': false
}

/////////////////////////////////////////////////////////////////////////////
// Add Markdown Input data to editor field
interface md_input_api {
    container: HTMLElement,
    editor: EditorView,
    show(): void,
    hide(): void,
    toggle(): void
}

interface md_input_element extends HTMLElement {
    markdown_input: md_input_api
}

/////////////////////////////////////////////////////////////////////////////
// Add editor to field
async function add_editor(field: EditorFieldAPI): Promise<md_input_api> {
    const field_el = <md_input_element>(await field.element)
    const ed_area_el = field_el.querySelector('div.editing-area')
    if(field_el.markdown_input) return field_el.markdown_input
    let container = document.createElement('div')
    container.classList.add('markdown-input', 'hidden')
    const markdown_input = {
        container: ed_area_el.insertBefore(container, ed_area_el.firstElementChild),
        editor: create(container, '', 0, async (md: string) => {
            field.editingArea.content.set(markdown_to_html(md))
        }),
        show: () => { show(field) },
        hide: () => { hide(field) },
        toggle: () => { toggle(field) }
    }
    field_el.markdown_input = markdown_input
    return markdown_input
}

/////////////////////////////////////////////////////////////////////////////
// Set field to MD input
async function show(field: EditorFieldAPI) {
    const inputs = get(field.editingArea.editingInputs) as
        (PlainTextInputAPI | RichTextInputAPI)[]
    const plain = inputs.find(o => o.name === "plain-text") as PlainTextInputAPI
    const rich = inputs.find(o => o.name === "rich-text") as RichTextInputAPI
    const el = await field.element as md_input_element
    const mi = el.markdown_input || await add_editor(field)
    const html = get(field.editingArea.content) as string
    const [md, ord] = html_to_markdown(html)
    set_doc(mi.editor , md, ord, 'end')
    
    if (!mi.container.classList.contains('hidden')) return
    mi.container.classList.remove('hidden')

    if (plain?.focusable && _config[HIDE_PLAIN])
        (<HTMLElement>el.querySelector('span.plain-text-badge'))?.click()
    plain?.codeMirror?.setOption('readOnly', true); // Anki uses CM5
    if (rich?.focusable && _config[HIDE_RICH])
        (<HTMLElement>el.querySelector('span.rich-text-badge'))?.click()
    rich?.element.then((p: HTMLElement) => p.contentEditable = 'false')
    mi.editor.focus()
}

/////////////////////////////////////////////////////////////////////////////
// Hide md input (and set field to rich-text input)
async function hide(field: EditorFieldAPI) {
    field.element.then((el: md_input_element) => {
        const mi = el.markdown_input
        if (!mi || mi.container.classList.contains('hidden')) return
        mi.container.classList.add('hidden')
        const inputs = get(field.editingArea.editingInputs) as
            (PlainTextInputAPI | RichTextInputAPI)[]
        const plain = inputs.find((o: (PlainTextInputAPI | RichTextInputAPI)) =>
            o.name === "plain-text") as PlainTextInputAPI
        const rich = inputs.find((o: (PlainTextInputAPI | RichTextInputAPI)) =>
            o.name === "rich-text") as RichTextInputAPI

        if (plain?.focusable && _config[HIDE_PLAIN])
            (<HTMLElement>el.querySelector('span.plain-text-badge'))?.click()
        plain?.codeMirror?.setOption('readOnly', false); // Anki uses CM5
        if (!rich?.focusable)
            (<HTMLElement>el.querySelector('span.rich-text-badge'))?.click()
        rich?.element.then((p: HTMLElement) => p.contentEditable = 'true')
        rich.focus()
    })
}

/////////////////////////////////////////////////////////////////////////////
// Toggle md input
async function toggle(field: number | EditorFieldAPI) {
    const _field = typeof(field) === 'number' ? await NoteEditor.instances[0].fields[field] : field
    const el = await _field.element
    const mi = el.markdown_input ? el.markdown_input : await add_editor(_field)
    await mi.container.classList.contains('hidden') ? show(_field) : hide(_field)
}

/////////////////////////////////////////////////////////////////////////////
// Update MD content in all visible MD input (on note load for instance)
async function update() {
    const editor = NoteEditor.instances[0]
    for (const field of await editor.fields) {
        field.element.then(async (el: md_input_element) => {
            let mi = el.markdown_input
            let show = (_config[FIELD_DEFAULT] === 'markdown' && (!mi || _config[RESTORE]))
                || (_config[FIELD_DEFAULT] !== 'markdown' && (mi && !mi.container.classList.contains('hidden')) && !_config[RESTORE])
            if (show) {
                if (!mi) {
                    await add_editor(field)
                    mi = el.markdown_input
                }
                mi.container.classList.remove('hidden')
                const html = get(field.editingArea.content) as string
                const [md, ord] = html_to_markdown(html)
                set_doc(mi.editor, md, ord, 'end')
            } else mi?.container.classList.add('hidden')
        })
    }
}

function init(cfg: {}) {
    for (const key in cfg) _config[key] = cfg[key];

    // Ugly hack to retake focus from Anki Svelte focus trap on refocus
    addEventListener('focus', evt => {
        const ae = document?.activeElement
        if (ae?.classList.contains('focus-trap')) {
            const mi = ae.parentElement['markdown_input']
            if (mi?.container?.hidden === false) mi.editor.focus()
        }
    })
}

export {init as converter_init} from "./converter"
export {init as editor_init} from "./editor"
export {toggle, update, init}
// Include utils used by dialog_input.ts
export {get_current_html, set_current_html, get_selected_html, set_selected_html} from './dialog_input_utils'