import { get } from "svelte/store"
// @ts-ignore FIXME: how to import correctly?
import type { EditorFieldAPI, EditingInputAPI } from "anki/ts/editor/EditorField.svelte"
// @ts-ignore FIXME: how to import correctly?
import type { RichTextInputAPI } from "anki/ts/editor/rich-text-input"
// @ts-ignore FIXME: how to import correctly?
import type { PlainTextInputAPI } from "anki/ts/editor/plain-text-input"

/////////////////////////////////////////////////////////////////////////////
// Get the rich text input of a field
function rich_edit(field: EditorFieldAPI): RichTextInputAPI | undefined {
    return  (get(field.editingArea.editingInputs) as EditingInputAPI[])
            .find(input => input?.name === "rich-text")
}

/////////////////////////////////////////////////////////////////////////////
// Get the plain text input of a field
function plain_edit(field: EditorFieldAPI): PlainTextInputAPI | undefined {
    return  (get(field.editingArea.editingInputs) as EditingInputAPI[])
            .find(input => input?.name === "plain-text")
}

/////////////////////////////////////////////////////////////////////////////
// Return wether an input element is hidden by attribute or class
function hidden(el: HTMLElement) {
    if (!el) return undefined
    return Boolean(el.hidden || el.classList.contains('hidden'))
}

/////////////////////////////////////////////////////////////////////////////
// Get ancestor matching a selector
function ancestor(descendant: HTMLElement, selector: string) {
    while (descendant && !descendant.matches(selector))
            descendant = descendant.parentElement
    return descendant
}

/////////////////////////////////////////////////////////////////////////////
// Add custom Editing Input data to editor field
interface CustomInputAPI {
    container: HTMLElement,
    editor: any,
    badge: HTMLSpanElement,
    stored_selection: any,
    toggle(): void
}

interface CustomInputElement extends HTMLElement {
    custom_input: CustomInputAPI
}

/**
 * Configuration of a custom input type
 *
 * @interface CustomInputConfiguration
 * @member {string} class CSS class name (must be valid & unique)
 * @member {string} title display title (i.e. spaces etc. allowed)
 * @member {string} [shortcut] keyboard shortcut to toggle input visibility
 * @member {boolean} [default_show] set to true to make input visible per default
 * @member {function(container: HTMLDivElement): Any} create_editor function to call to instantiate the input. Will be called with the HTML div that should be set as input parent and must return the instance.
 * @member {function(editor: any, html: string): void} set_content function to call to set the content of an editor instance (i.e. on update from another input). Will be called with the editor instance and the new content HTML string.
 * @member {function(editor: any): any[]} save_selection function to call to get the selection reference of an editor instance; not the contents of the selection but whatever data structure is needed to be able to recreate the selection (to restore selection when focusing out of the window and back). Will be called with the editor instance and must return an array of data.
 * @member {function(editor: any, selections: any []): void} restore_selection function to call to restore a selection previously saved. Will be called with the editor instance and the array of earlier saved data.
 * @member {function(editor: any):} [onshow] function that will be called when a specific editor instance is shown (i.e. unhidden). Will be called with the editor instance.
 * @member {function(editor: any):} [onhide] function that will be called when a specific editor instance is hidden (i.e. unshown). Will be called with the editor instance.
 * @member badge editor field badges.
 * @member {string} badge.active svg HTML tag to be displayed when the editor is visible.
 * @member {string} badge.inactive svg HTML tag to be displayed when the editor is hidden.
 */
interface CustomInputConfiguration {
    class: string,
    title: string,
    shortcut?: string,
    default_show?: boolean,
    create_editor: (container: HTMLDivElement) => any,
    set_content: (editor: any, html: string) => void,
    save_selection: (editor: any) => any[],
    restore_selection: (editor: any, selections: any[]) => void,
    onshow?: Function,
    onhide?: Function,
    badge?: {
        active: string,
        inactive: string
    }
}

/**
 * Instantiate class to create a custom input type. The class handles all
 * interaction with the note editor, however the custom_input.py must be
 * included on the python side for media paste functionality.
 * The main user methods are:
 * - constructor takes the required configurations
 * - update_all() must be called when a note is loaded
 * - update_field() must be called when the custom input content is updated.
 */
class CustomInput {
    protected cfg: CustomInputConfiguration
    protected note_editor: any
    protected flds: {
        element: HTMLElement,
        editingArea: {
            content: any,
            refocus: Function
        }
    }[]
    protected name: string

    /**
     * Create a new custom input type
     * @param options
     */
    /////////////////////////////////////////////////////////////////////////////
    // Constructor - supply configuration + call `update_all()` on note load
    // and call `update_field()` on input in the custom editor
    constructor(options: CustomInputConfiguration) {
        this.cfg = options
        this.name = this.cfg.class.replace('-', '_')
        if (!document[this.name]) {
            document.addEventListener('focusin', this.focusin)
            document.addEventListener('focusout', this.focusout)
            document[this.name] = true
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Update custom input content in all visible custom inputs, e.g. on note load
    // Add badges to all field as needed
    public async update_all() {
        this.note_editor = await require('anki/NoteEditor').instances[0]
        this.flds = await this.note_editor.fields
        let focused = false
        for (const field of this.flds) {
            const el = await field.element as CustomInputElement
            // Add badge if non-existent
            if (!el.querySelector(`span.${this.cfg.class}-badge`)) {
                const root = el.querySelector('.rich-text-badge').cloneNode(true) as HTMLElement
                root.classList.replace('rich-text-badge', `${this.cfg.class}-badge`)
                root.onclick = () => this.toggle(field)
                const badge = root.querySelector('.badge') as HTMLElement
                badge.title = `Toggle ${this.cfg.title}`
                if (this.cfg.shortcut) badge.title += ` (${this.cfg.shortcut})`
                badge.querySelector('span').innerHTML = this.cfg.badge.inactive
                const fsel = el.querySelector('span.field-state')
                fsel.insertBefore(root, fsel.firstElementChild)
            }

            // "New" field and markdown as default
            if (!el[this.name] && this.cfg.default_show) {
                el[this.name] = await this.add_editor(field)
                if (this.cfg.onshow) this.cfg.onshow()

                // Focus first new field if not already focused
                if (!focused) {
                    el[this.name].editor.focus()
                    focused = true
                }

            // "Old field" with focus, refocus (i.e. keep state)
            } else if (el.contains(document.activeElement)) {
                el[this.name]?.editor.focus()
                focused = true
            }

            if (el[this.name]?.container.hidden === false) this.cfg.set_content(el[this.name].editor, get(field.editingArea.content) as string)
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Update a specific field with supplied HTML
    public async update_field(field: number | EditorFieldAPI, html: string) {
        field = typeof (field) === 'number'
            ? this.flds[field]
            : field
        field.editingArea.content.set(html)
    }


    /////////////////////////////////////////////////////////////////////////////
    // Toggle custom input
    public async toggle(field: number | EditorFieldAPI) {
        field = typeof (field) === 'number'
            ? this.flds[field]
            : field
        const ci = (await this.add_editor(field)) as CustomInputAPI
        if (ci.container.hidden && this.cfg.onshow) this.cfg.onshow()
        else if (!ci.container.hidden && this.cfg.onhide) this.cfg.onhide()
        ci.container.hidden ? show(ci) : hide(ci)

        async function show(ci: CustomInputAPI) {
            this.cfg.set_content(get(field.editingArea.content) as string)
            ci.container.hidden = false
            ci.badge.innerHTML = this.cfg.badge.active
            ci.editor.focus()
        }

        async function hide(ci: CustomInputAPI) {
            ci.container.hidden = true
            ci.badge.innerHTML = this.cfg.badge.inactive
            field.editingArea.refocus()
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Toggle rich text input
    public async toggle_rich(field: number | EditorFieldAPI) {
        field = typeof (field) === 'number' ? this.flds[field] : field
        const el = await field.element as CustomInputElement
        const rich = el.querySelector('span.rich-text-badge') as HTMLElement
        rich.click()
        if(rich_edit(field).focusable) el[this.name].editor.focus()
    }

    /////////////////////////////////////////////////////////////////////////////
    // Focus the editor (custom, plain or rich text) of a an input element
    protected focus(input: HTMLElement) {
        if (!input || input.hidden) return false
        let editor
        if (input.querySelector(`.${this.cfg.class}`))
            editor  = (ancestor(input, '.editor-field') as CustomInputElement)
                ?.custom_input?.editor
        else editor = input.querySelector('.CodeMirror > div > textarea') as HTMLElement
            || input.querySelector('.rich-text-editable')?.shadowRoot.querySelector('anki-editable')

        editor?.focus()
        return Boolean(editor)
    }

    /////////////////////////////////////////////////////////////////////////////
    // Cycle to next field or first if none active
    public async cycle_next() {
        const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
        // Check for inputs in current field
        let input = older(active)
        // No inputs in current field, find prev field
        if (!input) {
            let fld_root = ancestor(active, '.editor-field')
                .parentElement as HTMLElement
            while (fld_root && !input) {
                fld_root = fld_root.nextElementSibling as HTMLElement
                input = fld_root?.querySelector('.editing-area')?.firstElementChild as HTMLElement
                if (hidden(input)) input = older(input)
            }
        }
        this.focus(input)

        function older(fld: HTMLElement) {
            let nxt = fld?.nextElementSibling as HTMLElement
            while (hidden(nxt)) nxt = nxt.nextElementSibling as HTMLElement
            return nxt
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Cycle to prev field or first if none active
    public async cycle_prev() {
        const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
        // Check for inputs in current field
        let input = younger(active)
        // No inputs in current field, find prev field
        if (!input) {
            let fld_root = ancestor(active, '.editor-field')
                .parentElement as HTMLElement
            while (fld_root && !input) {
                fld_root = fld_root.previousElementSibling as HTMLElement
                input = fld_root?.querySelector('.editing-area')?.lastElementChild as HTMLElement
                if (hidden(input)) input = younger(input)
            }
        }
        this.focus(input)

        function younger(fld: HTMLElement) {
            let prv = fld?.previousElementSibling as HTMLElement
            while (hidden(prv)) prv = prv.previousElementSibling as HTMLElement
            return prv
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Add editor to field
    protected async add_editor(field: EditorFieldAPI): Promise<CustomInputAPI> {
        const field_el = await field.element as CustomInputElement
        const ed_area_el = field_el.querySelector('div.editing-area')
        if (field_el[this.name]) return field_el[this.name]
        const container = document.createElement('div')
        container.classList.add(this.cfg.class)
        container.hidden = true
        const editor = this.cfg.create_editor(container)
        const custom_input = {
            container: ed_area_el.insertBefore(container, ed_area_el.firstElementChild),
            badge: ed_area_el.parentElement.querySelector(`.${this.cfg.class}-badge span span`) as HTMLSpanElement,
            editor: editor,
            stored_selection: undefined,
            toggle: () => { this.toggle(field) }
        }
        field_el[this.name] = custom_input

        return custom_input
    }

    /////////////////////////////////////////////////////////////////////////////
    // Handle focus events for subscribing/unsubscribing and overriding focus-trap
    protected async focusin(evt: FocusEvent) {
        const tgt = evt.target as HTMLElement
        const el = ancestor(tgt, '.editor-field') as CustomInputElement
        if (!el[this.name]) return

        // We focus custom input, unsubscribe
        if (ancestor(tgt, `.${this.cfg.class}`)) {
            if (el[this.name].editor['unsubscribe']) {
                el[this.name].editor['unsubscribe']()
                el[this.name].editor['unsubscribe'] = null
            }
        // We should take back focus when focusing back into document
        } else if (el[this.name]?.refocus !== undefined
            && el[this.name]?.container.hidden === false
        ) {
            this.cfg.restore_selection(el[this.name].editor, el[this.name].stored_selection)
            el[this.name].stored_selection = undefined
            el[this.name].editor.focus() // Event recursion
        // Focus is somewhere else, subscribe
        } else {
            if (!el[this.name].editor['unsubscribe']
                && !el[this.name].container.hidden
            ) {
                for (const fld of this.flds) {
                    if (fld.element === el) {
                        el[this.name].editor['unsubscribe'] = fld.editingArea.content.subscribe(this.cfg.set_content)
                        break
                    }
                }
            }
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Store selection when focusing out from markdown-input
    protected async focusout(evt: FocusEvent) {
        const tgt = evt.target as HTMLElement
        const tgt_el = ancestor(tgt, '.editor-field') as CustomInputElement
        if (ancestor(tgt, `.${this.cfg.class}`)
            && tgt_el !== ancestor(evt.relatedTarget as HTMLElement, '.editor-field'))
            tgt_el[this.name].stored_selection = this.cfg.save_selection(tgt_el[this.name].editor)
    }
}

export type { CustomInputConfiguration }
export { CustomInput }
