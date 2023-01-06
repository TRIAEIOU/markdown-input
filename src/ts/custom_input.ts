import { get } from "svelte/store"
// @ts-ignore FIXME: how to import correctly?
import type { EditorFieldAPI, EditingInputAPI } from "anki/ts/editor/EditorField.svelte"
// @ts-ignore FIXME: how to import correctly?
import type { RichTextInputAPI } from "anki/ts/editor/rich-text-input"
// @ts-ignore FIXME: how to import correctly?
import type { PlainTextInputAPI } from "anki/ts/editor/plain-text-input"
import { ancestor } from "./utils"

/////////////////////////////////////////////////////////////////////////////
// Return wether an input element is hidden by attribute or class
function visible(el: HTMLElement) {
    if (!el) return undefined
    return !Boolean(el.hidden || ancestor(el, '.hidden'))
}

/**
 * Custom input configuration
 * @property {String} class_name CSS class name (must be valid & unique)
 * @property {String} tooltip badge tooltip string
 * @property {String} badge svg HTML tag to be used as badge
 * @member {function(html: string): void} set_content function to call to set the content of an editor instance (i.e. on update from another input). Will be called with the CustomInputAPI as `this` and the new content HTML string as parameter.
 * @member {function(): void} focus function to call to focus an editor instance. Will be called with the CustomInputAPI as `this` and the new content HTML string as parameter.
 * @member {function(container: HTMLDivElement, onchange: (html: string): void): Any} create_editor function to call to instantiate the input. Will be called with the HTML div that should be set as input parent and a callback function to be called to update the other inputs. Will be called with the CustomInputAPI as `this` and the new content HTML string as parameter and must return the instance.
 * @member {function(): void} [onadd] function that will be called after a custom input has been added to a field, use for example to set field input default states. Will be called with the CustomInputAPI as `this`.
 */
interface CustomInputConfig {
    class_name: string
    tooltip: string
    badge: string
    set_custom_content: (html: string) => void,
    focus: () => void,
    create_editor: (container: HTMLElement, onchange: (html: string) => void) => any,
    onadd?: () => void
}

/**
 * Custom Input API for a single field - instantiated by CustomInputClass PRN
 * @readonly
 * @property {EditorFieldAPI} field core Anki/Svelte editor field to which the CustomInputAPI belongs
 * @property {HTMLElement} container HTML element in which the custom editor is placed
 * @property {Any} editor the field custom input editor instance
 * @property {HTMLSpanElement} badge the HTML element that contains the badge
 * @member {function(): void} toggle call to toggle custom input show/hide state
 * @member {function(html: string): void} update call to update editor field content (and set rich and plain text PRN)
 */
class CustomInputAPI {
    readonly editor_field_api: EditorFieldAPI
    readonly editor_container: HTMLElement
    readonly badge_container: HTMLSpanElement
    readonly class_name: string
    readonly focus: () => void
    get editor() {
        if (!this._editor) this._editor = this._create_editor(
            this.editor_container.firstElementChild as HTMLElement,
            this.editor_field_api.editingArea.content.set
        )
        return this._editor
    }
    readonly set_custom_content: (html: string) => void

    _editor: any
    readonly _create_editor: (container: HTMLElement, onchange: (html: string) => void) => any
    _unsub: () => void
    _unsubscribe() {
        if (this._unsub) {
            this._unsub()
            this._unsub = null
        }
    }
    _subscribe() {
        if (this._unsub) return
        this._unsub = this.editor_field_api.editingArea.content.subscribe((html: string) => {
            this.set_custom_content(html)
        })
    }

    constructor(
        cfg: CustomInputConfig,
        editor_field_api: EditorFieldAPI,
        editor_field_el: HTMLElement
    ) {
        this.editor_field_api = editor_field_api
        this.class_name = cfg.class_name
        this.set_custom_content = cfg.set_custom_content
        this.focus = cfg.focus
        this._create_editor = cfg.create_editor

        // Set up editor container (editor not instansiated until use)
        const editing_area = editor_field_el.querySelector('.editing-area')
        const wrapper = editing_area.querySelector('.plain-text-input')
            .parentElement.cloneNode(false) as HTMLDivElement
        wrapper.classList.replace('expanded', 'hidden')
        const inner = document.createElement('div')
        inner.classList.add(this.class_name)
        wrapper.appendChild(inner)
        this.editor_container = editing_area.insertBefore(wrapper, editing_area.firstElementChild)

        // Set up badge
        const badge_container =
            ancestor(this.editor_container, '.field-container')
            .querySelector('.field-state')
        const plain_badge = badge_container.querySelector('.plain-text-badge')
        this.badge_container = plain_badge.cloneNode(true) as HTMLElement
        this.badge_container.classList.replace('plain-text-badge', `${this.class_name}-badge`)
        this.badge_container.onclick = () => this.toggle()
        // Copy `visible` class (hover⇒visible functionality)
        this.badge_container['observer'] =
            new MutationObserver((muts: MutationRecord[], obs: MutationObserver) => {
                muts.forEach(mut => {
                    if ((mut.target as HTMLElement).classList.contains('visible'))
                        this.badge_container.classList.add('visible')
                    else
                        this.badge_container.classList.remove('visible')
                })
        })
        this.badge_container['observer'].observe(plain_badge, {attributeFilter: ['class']})
        const gfx = this.badge_container.querySelector('.badge') as HTMLElement
        gfx.title = cfg.tooltip
        gfx.querySelector('span').innerHTML = cfg.badge
        badge_container.insertBefore(this.badge_container, badge_container.firstElementChild)

        // Handle focus events for subscribing/unsubscribing
        const field_container = ancestor(editor_field_el, '.field-container')
        field_container.addEventListener('focusin', (evt: Event) => {
            // We focus this custom input, unsubscribe
            if (ancestor(evt.target as HTMLElement, `.${this.class_name}`))
                    this._unsubscribe()
            // We focus something else, subscribe
            else
                    this._subscribe()
        })
        field_container.addEventListener('focusout', (evt: Event) => {
            this._subscribe()
        })

        if (cfg.onadd) cfg.onadd()
    }

    /////////////////////////////////////////////////////////////////////////////
    // Toggle/show/hide custom input
    toggle() {
        if (!this._editor || !visible(this.editor_container)) this.show()
        else this.hide()
    }

    show() {
        this.editor // ensure instantiated
        this._unsubscribe()
        const html = get(this.editor_field_api.editingArea.content) as string
        this.set_custom_content(html)
        this.editor_container.classList.replace('hidden', 'expanded')
        this.badge_container.parentElement.parentElement.classList.add('highlighted')
        this.focus()
    }

    hide() {
        this._unsubscribe()
        this.editor_container.classList.replace('expanded', 'hidden')
        this.badge_container.parentElement.parentElement.classList.remove('highlighted')
        this.editor_field_api.editingArea.refocus()
    }

    /////////////////////////////////////////////////////////////////////////////
    // Toggle built in editing inputs
    toggle_rich() { this._toggle_builtin('rich') }
    toggle_plain() { this._toggle_builtin('plain') }
    _toggle_builtin(type: string) {
        const el = this.editor_container.parentElement
        const input = el.querySelector(`.${type}-text-input`).parentElement
        if (input.classList.contains('hidden'))
            input.classList.replace('hidden', 'expanded')
        else
            input.classList.replace('expanded', 'hidden')
    }
}


/**
 * Instantiate to create a custom input class. The class handles all
 * interaction with the note editor, however the custom_input.py must be
 * included on the python side for media paste functionality.
 * The main user methods are:
 * - constructor takes the required configurations
 * - update_all() must be called when a note is loaded
 */
class CustomInputClass {
    readonly cfg: CustomInputConfig
    readonly _name: string

    constructor(config: CustomInputConfig) {
        this.cfg = config
        this._name = this.cfg.class_name.replace('-', '_')
    }

    /////////////////////////////////////////////////////////////////////////////
    // Get CustomInputAPI for field by index of EditorFieldAPI
    async get_api(field: number | EditorFieldAPI) {
        const el = await (typeof (field) === 'number'
            ? require('anki/NoteEditor').instances[0].fields[field]
            : field
        ).element
        return await el[this._name]
    }

    /////////////////////////////////////////////////////////////////////////////
    // Update custom input content in all visible custom inputs, e.g. on note load
    // Add badges to all field as needed
    async update_all() {
        const note_editor = await require('anki/NoteEditor').instances[0]
        const flds = await note_editor.fields
        for (const field of flds) {
            const editor_field = await field.element as HTMLElement // await necessary
            if (!editor_field[this._name]) {
                editor_field[this._name] = new CustomInputAPI(this.cfg, await field, await field.element)
            } else if (editor_field.contains(document.activeElement))
                this.cfg.focus.call(editor_field[this._name])

            // Update custom input contents PRN
            if (visible(editor_field[this._name]?._editor))
                editor_field[this._name].update(get(field.editingArea.content) as string)
        }

    }

    /////////////////////////////////////////////////////////////////////////////
    // Cycle to next field or first if none active
    async cycle_next() {
        const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
        // Check for inputs in current field
        let nxt = older(active)
        // No inputs in current field, find first visible in next field
        if (!nxt) {
            let fld_root = ancestor(active, '.fields > div') as HTMLElement
            console.log(">>>" + fld_root.classList)
            while (fld_root && !nxt) {
                fld_root = fld_root.nextElementSibling as HTMLElement
                nxt = fld_root?.querySelector('.editing-area > div:not(.hidden)') as HTMLElement
            }
            console.log("<<<" + nxt?.classList)
        }
        if (nxt) (ancestor(nxt, '.editor-field'))[this._name].focus()

        function older(fld: HTMLElement) {
            let nxt = fld?.nextElementSibling as HTMLElement
            while (nxt?.classList.contains('hidden'))
                nxt = nxt.nextElementSibling as HTMLElement
            return nxt
        }
    }

    /////////////////////////////////////////////////////////////////////////////
    // Cycle to prev field or first if none active
    async cycle_prev() {
        const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
        // Check for inputs in current field
        let prev = younger(active)
        // No inputs in current field, find first visible in next field
        if (!prev) {
            let fld_root = ancestor(active, '.fields > div') as HTMLElement
            while (fld_root && !prev) {
                fld_root = fld_root.previousElementSibling as HTMLElement
                const prevs = fld_root?.querySelectorAll('.editing-area > div:not(.hidden)')
                if (prevs && prevs.length) prev = prevs[prevs.length - 1] as HTMLElement
            }
        }
        if (prev) (ancestor(prev, '.editor-field'))[this._name].focus()

        function younger(fld: HTMLElement) {
            let prev = fld?.previousElementSibling as HTMLElement
            while (prev?.classList.contains('hidden'))
                prev = prev.previousElementSibling as HTMLElement
            return prev
        }
    }
}

export { CustomInputClass, CustomInputAPI }
