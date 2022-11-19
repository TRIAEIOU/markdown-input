import { get } from "svelte/store"
// @ts-ignore FIXME: how to import correctly?
import type { NoteEditorAPI } from "anki/ts/editor/NoteEditor.svelte"
declare var NoteEditor: {
    context: any,
    lifecycle: any,
    instances: NoteEditorAPI[]
}
// @ts-ignore FIXME: how to import correctly?
import type { EditorFieldAPI, EditingInputAPI } from "anki/ts/editor/EditorField.svelte"
// @ts-ignore FIXME: how to import correctly?
import type { RichTextInputAPI } from "anki/ts/editor/rich-text-input"
import { create_editor } from "./editor"
import type { MDIEditorView } from "./editor"
import { html_to_markdown, markdown_to_html } from "./converter"

const FIELD_DEFAULT = 'Default field state'
const MD = '<svg style="vertical-align:baseline;margin-right:5px;" height="12" fill="none" viewBox="0 0 208 128" xmlns="http://www.w3.org/2000/svg"><g fill="#000"><path clip-rule="evenodd" d="m15 10c-2.7614 0-5 2.2386-5 5v98c0 2.761 2.2386 5 5 5h178c2.761 0 5-2.239 5-5v-98c0-2.7614-2.239-5-5-5zm-15 5c0-8.28427 6.71573-15 15-15h178c8.284 0 15 6.71573 15 15v98c0 8.284-6.716 15-15 15h-178c-8.28427 0-15-6.716-15-15z" fill-rule="evenodd"/><path d="m30 98v-68h20l20 25 20-25h20v68h-20v-39l-20 25-20-25v39zm125 0-30-33h20v-35h20v35h20z"/></g></svg>'
const MD_SOLID = '<svg style="vertical-align:baseline;margin-right:5px;" height="12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 208 128"><path d="M193 128H15a15 15 0 0 1-15-15V15A15 15 0 0 1 15 0h178a15 15 0 0 1 15 15v98a15 15 0 0 1-15 15zM50 98V59l20 25 20-25v39h20V30H90L70 55 50 30H30v68zm134-34h-20V30h-20v34h-20l30 35z"/></svg>'

const _config = {
    'Default field state': 'rich text',
    'Cycle rich text/Markdown': false
}

/////////////////////////////////////////////////////////////////////////////
// Add Markdown Input data to editor field
interface MDInputAPI {
    container: HTMLElement,
    editor: MDIEditorView,
    badge: HTMLSpanElement,
    toggle(): void
}

interface MDInputElement extends HTMLElement {
    markdown_input: MDInputAPI
}

function rich_edit(field: EditorFieldAPI): RichTextInputAPI | undefined {
    return  (get(field.editingArea.editingInputs) as EditingInputAPI[])
            .find(input => input?.name === "rich-text")
}

/////////////////////////////////////////////////////////////////////////////
// Add editor to field
async function add_editor(field: EditorFieldAPI, hidden: boolean): Promise<MDInputAPI> {
    const field_el = await field.element as MDInputElement
    const ed_area_el = field_el.querySelector('div.editing-area')
    if (field_el.markdown_input) return field_el.markdown_input
    const container = document.createElement('div')
    container.classList.add('markdown-input')
    container.hidden = hidden
    const editor = create_editor(container,
        async (md: string) => { field.editingArea.content.set(markdown_to_html(md)) },
        {
            wheel(evt: WheelEvent) {
                const fields = field_el.parentElement.parentElement
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
            },
            focusin(evt: FocusEvent) {
                if(editor['unsubscribe']) {
                    editor['unsubscribe']()
                    editor['unsubscribe'] = null
                }
            },
            focusout(evt: FocusEvent) {
                if(!editor['unsubscribe']
                    && !editor.dom.parentElement.hidden) {
                        editor['unsubscribe'] = field.editingArea.content.subscribe(html => {
                            const [md, ord] = html_to_markdown(html)
                            editor.set_doc(md, ord, "end")
                        })
                }
            }
        }
    )
    const markdown_input = {
        container: ed_area_el.insertBefore(container, ed_area_el.firstElementChild),
        badge: ed_area_el.parentElement.querySelector('.markdown-input-badge span') as HTMLSpanElement,
        editor: editor,
        toggle: () => { toggle(field) }
    }
    field_el.markdown_input = markdown_input

    return markdown_input
}

/////////////////////////////////////////////////////////////////////////////
// Toggle md input
async function toggle(field: number | EditorFieldAPI) {
    field = typeof (field) === 'number'
        ? await NoteEditor.instances[0].fields[field]
        : field
    const el = await field.element
    const mi = (el.markdown_input || await add_editor(field, true)) as MDInputAPI
    const rbadge = el.querySelector('span.rich-text-badge') as HTMLElement
    if (_config['Cycle rich text/Markdown']
        && mi.container.hidden === rich_edit(field).focusable)
            rbadge.click()
    mi.container.hidden ? show(mi) : hide(mi)

    async function show(mi: MDInputAPI) {
        const [md, ord] = html_to_markdown(get(field.editingArea.content) as string)
        mi.editor.set_doc(md, ord, 'end')
        mi.container.hidden = false
        mi.badge.innerHTML = MD_SOLID
        mi.editor.focus()
    }

    async function hide(mi: MDInputAPI) {
        mi.container.hidden = true
        mi.badge.innerHTML = MD;
        field.editingArea.refocus()
    }
}

/////////////////////////////////////////////////////////////////////////////
// Toggle rich text input
async function toggle_rich(field: number | EditorFieldAPI) {
    field = typeof (field) === 'number' ? await NoteEditor.instances[0].fields[field] : field
    const el = await field.element as MDInputElement
    const rich = el.querySelector('span.rich-text-badge') as HTMLElement
    rich.click()
    if(rich_edit(field).focusable) el.markdown_input.editor.focus()
}


/////////////////////////////////////////////////////////////////////////////
// Update MD content in all visible MD input on note load
// Add MD icons to all field
async function load_note() {
    const editor = await NoteEditor.instances[0]
    const flds = await editor.fields
    let index = -1
    let focused = false
    for (const field of flds) {
        index++
        const el = await field.element as MDInputElement
        // Add icon if non-existent
        if (!el.querySelector('div.markdown-input-badge')) {
            const badge = document.createElement('span')
            badge.innerHTML = `<div class="markdown-input-badge" onclick="MarkdownInput.toggle(${index});" style="display: inline;"><span title="Toggle Markdown Editor (${_config['Shortcut']})" dropdown="false">${MD}</span></div>`
            const rtb = el.querySelector('span.rich-text-badge')
            rtb.insertBefore(badge, rtb.firstElementChild)
        }

        // "New" field and markdown as default
        if (!el.markdown_input && _config[FIELD_DEFAULT] === 'markdown') {
            el.markdown_input = await add_editor(field, false)
            // Hide rich text if visible
            if (rich_edit(field)?.focusable)
                    (el.querySelector('span.rich-text-badge') as HTMLElement).click()

            // Focus first new field if not already focused
            if (!focused) {
                el.markdown_input.editor.focus()
                focused = true
            }

        // "Old field" with focus, refocus (i.e. keep state)
        } else if (el.contains(document.activeElement)) {
            el.markdown_input.editor.focus()
            focused = true
        }

        if (el?.markdown_input?.container.hidden === false) {
            const [md, ord] = html_to_markdown(get(field.editingArea.content) as string)
            el.markdown_input.editor.set_doc(md, ord, 'end');
        }
    }
}

function init(cfg: {}) {
    for (const key in cfg) _config[key] = cfg[key];

    // Ugly hack to retake focus from Anki Svelte focus trap on refocus
    addEventListener('focus', evt => {
        const ae = document?.activeElement
        if (ae?.classList.contains('focus-trap')) {
            const mi = (ae.parentElement as MDInputElement).markdown_input
            if (mi?.container?.hidden === false) mi.editor.focus()
        }
    })
}

export { init as converter_init } from "./converter"
export { init as editor_init } from "./editor"
export { toggle, toggle_rich, load_note, init }
