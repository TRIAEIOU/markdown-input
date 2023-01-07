import { get } from "svelte/store"
// @ts-ignore FIXME: how to import correctly?
import type { EditorFieldAPI } from "anki/ts/editor/EditorField.svelte"
import { ancestor } from "./utils"


interface CustomInputConfig {
    /** CSS class name (must be valid & unique) */
    class_name: string
    /** badge tooltip string */
    tooltip: string
    /** badge svg HTML tag to be used as badge */
    badge: string
    /** non-arrow function callback to set the content of an editor instance (i.e. on update from another input). Will be called with the CustomInputAPI as `this` and the new content HTML string as parameter. */
    set_custom_content: (html: string) => void,
    /** non-arrow function callback to focus custom editor instance. Will be called with the CustomInputAPI as `this` and the new content HTML string as parameter. */
    focus: () => void,
    /** non-arrow function callback instantiate custom input editor. Will be called with the HTML div that should be set as input parent and a callback function to be called to update the other inputs. Will be called with the CustomInputAPI as `this` and the new content HTML string as parameter and must return the instance. */
    create_editor: (container: HTMLElement, onchange: (html: string) => void) => any,
    /** non-arrow function callback called after a custom input has been added to a field, use for example to set field input default states. Will be called with the CustomInputAPI as `this`. */
    onadd?: () => void
}

/**
 * Custom Input API for a single field - instantiated by CustomInputClass PRN
 * @readonly
 * @property editor_field_api core Anki/Svelte editor field api to which the CustomInputAPI belongs
 * @property editor_container "root" HTML element in which the custom editor is placed (inside a div.custom-class-name)
 * @property badge_container the HTML element that contains the badge
 * @property class_name custom class CSS class name
 * @property editor the field custom input editor instance (created on demand)
 * @member set_custom_content set content of custom input editor
 * @member focus focus the custom input
 * @member visible is custom input editor visible
 * @member rich_visible is rich text input visible
 * @member plain_visible is plain text input visible
 * @member toggle toggle custom input show/hide state
 * @member show show custom input editor
 * @member hide hide custom input editor
 * @member toggle_rich toggle rich text input show/hide state
 * @member toggle_plain toggle plain text show/hide state
 * @member update call to update editor field content (and set rich and plain text PRN)
 */
class CustomInputAPI {
    // DOM input: .fields → div (field root) → .field-container → .collapsible → .editor-field → .editing-area → .collapsible (root of input) → .rich/.plain/.custom-text-input
    // DOM badge: .fields → div (field root) → .field-container → div → .label-container → .field-state → .plain-text/.custom-badge

    ///////////////////////////////////////////////////////////////////
    // Public properties
    readonly editor_field_api: EditorFieldAPI
    /** .collapsible "root" custom input container element */
    readonly editor_container: HTMLElement
    /** .custom-badge */
    readonly badge_container: HTMLSpanElement
    readonly class_name: string
    _editor: any
    /** custom input editor (created on read) */
    get editor() {
        if (!this._editor) this._editor = this._create_editor(
            this.editor_container.firstElementChild as HTMLElement,
            this.editor_field_api.editingArea.content.set
        )
        return this._editor
    }


    ///////////////////////////////////////////////////////////////////
    // Public methods

    /**
     * Set custom input editor content
     * @param html new content
     */
    readonly set_custom_content: (html: string) => void

    /**
     * User supplied callback to focus custom input
     */
    readonly focus: () => void

    /**
     * Check if custom input editor is visible
     * @returns visible
     */
    visible() { return this._visible(this.class_name) }
    /**
     * Check if rich text input is visible
     * @returns visible
     */
    rich_visible() { return this._visible('rich-text-input') }
    /**
     * Check if plain text input is visible
     * @returns visible
     */
    plain_visible() { return this._visible('plain-text-input') }

    /**
     * Toggle custom input visibility
     * @param force toggle regardless if this leads to no visible input
     */
    toggle(force?: boolean) {
        if (!this._editor || this.editor_container.classList.contains('hidden')) this.show()
        else this.hide(force)
    }

    /**
     * Show custom input
     */
    show() {
        this.editor // ensure instantiated
        this._unsubscribe()
        const html = get(this.editor_field_api.editingArea.content) as string
        this.set_custom_content(html)
        this.editor_container.classList.replace('hidden', 'expanded')
        this.badge_container.parentElement.parentElement.classList.add('highlighted')
        this.focus()
    }

    /**
     * Hide custom input unless no visible sibling inputs
     * (with all inputs hidden there is no way to focus the field)
     * @param force hide regardless if this leads to no visible input
     */
    hide(force?: boolean) {
        // When all fields are hidden there is no way to focus the field ⇒
        // prevent hiding of last visible input
        if (!force && !this._visible_siblings(this.class_name)) return
        this._unsubscribe()
        this.editor_container.classList.replace('expanded', 'hidden')
        this.badge_container.parentElement.parentElement.classList.remove('highlighted')
        this.editor_field_api.editingArea.refocus()
    }

    /**
     * Toggle rich text input visibility
     * @param force toggle regardless if this leads to no visible input
     */
    toggle_rich(force?: boolean) {
        if (!force && !this._visible_siblings('rich-text-input')) return
        this._toggle_builtin('rich-text-input')
    }

    /**
     * Toggle plain text input visibility
     * @param force toggle regardless if this leads to no visible input
     */
    toggle_plain(force?: boolean) {
        if (!force && !this._visible_siblings('plain-text-input')) return
        this._toggle_builtin('plain-text-input')
    }

    /**
     * @param cfg configuration for custom input
     * @param editor_field_api field EditorFieldAPI (promise must be resolved)
     * @param editor_field_el EditorFieldAPI.element (promise must be resolved)
     */
    constructor(cfg: CustomInputConfig, editor_field_api: EditorFieldAPI, editor_field_el: HTMLElement) {
        this.editor_field_api = editor_field_api
        this.class_name = cfg.class_name
        this.set_custom_content = cfg.set_custom_content
        this.focus = cfg.focus
        this._create_editor = cfg.create_editor

        const editing_area = editor_field_el.querySelector('.editing-area') as HTMLElement
        const field_container = ancestor(editor_field_el, '.field-container')

        // Set up editor container (editor not instansiated until use)
        const wrapper = editing_area.querySelector('.plain-text-input').parentElement
            .cloneNode(false) as HTMLDivElement
        wrapper.classList.replace('expanded', 'hidden')
        const inner = document.createElement('div')
        inner.classList.add(this.class_name)
        wrapper.appendChild(inner)
        this.editor_container = editing_area.insertBefore(wrapper, editing_area.firstElementChild)

        // Set up badge
        const badge_container = field_container.querySelector('.field-state')
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
        field_container.addEventListener('focusin', (evt: Event) => {
            // We focus this custom input, unsubscribe
            if (ancestor(evt.target as HTMLElement, `.${this.class_name}`)) this._unsubscribe()
            // We focus something else, subscribe
            else this._subscribe()
        })
        field_container.addEventListener('focusout', evt => {this._subscribe()})

        if (cfg.onadd) cfg.onadd()
    }

    ///////////////////////////////////////////////////////////////////
    // Private

    /**
     * User supplied callback to call to instantiate the custom editor
     * @param container HTML parent element of editor instance
     * @param onchange callback that the custom editor should call on each change with the new HTML content (will update the field content)
     */
    readonly _create_editor: (container: HTMLElement, onchange: (html: string) => void) => any


    /** Unsubscribe function if custom input is currently subscribed */
    _unsub: () => void

    /**
     * Unsubscribe custom input (i.e. now inputing into custom editor)
     */
    _unsubscribe() {
        if (this._unsub) {
            this._unsub()
            this._unsub = null
        }
    }

    /**
     * Subscribe custom input to field content updates (i.e. now not inputing into custom editor)
     */
    _subscribe() {
        if (this._unsub) return
        this._unsub = this.editor_field_api.editingArea.content.subscribe((html: string) => {
            this.set_custom_content(html)
        })
    }

    /**
     * Toggle rich/plain-text-inputs based on class name
     * @param class_name `rich-text-input` or `plain-text-input`
     */
    _toggle_builtin(class_name: string) {
        const el = this.editor_container.parentElement
        const input = el.querySelector(`.${class_name}`).parentElement
        if (input.classList.contains('hidden'))
            input.classList.replace('hidden', 'expanded')
        else if (this._visible_siblings(class_name))
            input.classList.replace('expanded', 'hidden')
    }

    /**
     * Check if input is visible (not hidden)
     * @param class_name class (rich-text/plain-text/custom - input) of input to check
     * @returns visible
     */
    _visible(class_name: string) {
        return Boolean(
            this.editor_container.parentElement
            .querySelector(`:scope > div:not(.hidden) > div.${class_name}`)
        )
    }

    /**
     * Check if there are visible input siblings
     * @param class_name CSS of class to check for siblings for
     */
    _visible_siblings(class_name: string) {
        return Boolean(
            this.editor_container.parentElement
            .querySelector(`:scope > div:not(.hidden) > div:not(.${class_name})`)
        )
    }
}


/**
 * Instantiate to create a custom input class. The class handles all
 * interaction with the note editor, however the custom_input.py must be
 * included on the python side for media paste functionality.
 * @member constructor create a new custom input class
 * @member get_api get custom input api for specified field
 * @member update_all update all custom input editor contents, e.g. on note load,
 * will also add CustomInputAPI to any field missing (e.g. on note type switch)
 * @member cycle_next Move focus to the next input/down
 * @member cycle_prev Move focus to the preceeding input/up
 */
class CustomInputClass {
    readonly cfg: CustomInputConfig
    readonly _name: string

    /**
     * Class managing the addition and setup/configuration of CustomInputAPI's for
     * fields as necessary as well as note level functionality
     * @param config configuration for the CustomInputAPI's
     */
    constructor(config: CustomInputConfig) {
        this.cfg = config
        this._name = this.cfg.class_name.replace('-', '_')
    }

    /**
     * Get CustomInputAPI for field by index orEditorFieldAPI instance
     * @param field field to get EditorFieldAPI for
     * @returns
     */
    async get_api(field: number | EditorFieldAPI): Promise<CustomInputAPI> {
        const el = await (typeof (field) === 'number'
            ? require('anki/NoteEditor').instances[0].fields[field]
            : field
        ).element
        return el[this._name]
    }

    /**
     * Update custom input content in all visible custom inputs, e.g. on note load
     * Add custom inputs, inc. badges, to fields PRN
     */
    async update_all() {
        const note_editor = await require('anki/NoteEditor').instances[0]
        const flds = await note_editor.fields
        for (const field of flds) {
            const editor_field = await field.element as HTMLElement // await necessary
            let ci = editor_field[this._name]
            if (!ci)
                ci = editor_field[this._name] = new CustomInputAPI(this.cfg, await field, await field.element)
            else if (editor_field.contains(document.activeElement))
                this.cfg.focus.call(ci)

            // Update custom input contents PRN
            if (ci.editor_container.classList.contains('expanded'))
                ci.update(get(field.editingArea.content) as string)
        }

    }

    /**
     * Cycle focus to next field/down or first if none active
     */
    async cycle_next() {
        const active = ancestor(document.activeElement as HTMLElement, '.editing-area > div')
        // Check for inputs in current field
        let nxt = older(active)
        // No inputs in current field, find first visible in next field
        if (!nxt) {
            let fld_root = ancestor(active, '.fields > div') as HTMLElement
            while (fld_root && !nxt) {
                fld_root = fld_root.nextElementSibling as HTMLElement
                nxt = fld_root?.querySelector('.editing-area > div:not(.hidden)') as HTMLElement
            }
        }
        if (nxt) this._focus_input(nxt)

        function older(fld: HTMLElement) {
            let nxt = fld?.nextElementSibling as HTMLElement
            while (nxt?.classList.contains('hidden'))
                nxt = nxt.nextElementSibling as HTMLElement
            return nxt
        }
    }

    /**
     * Cycle focus to preceeding field/up or first if none active
     */
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
                if (prevs?.length) prev = prevs[prevs.length - 1] as HTMLElement
            }
        }
        if (prev) this._focus_input(prev)

        function younger(fld: HTMLElement) {
            let prev = fld?.previousElementSibling as HTMLElement
            while (prev?.classList.contains('hidden'))
                prev = prev.previousElementSibling as HTMLElement
            return prev
        }
    }


    /**
     * Focus the editor (custom, plain or rich text) of a an input element
     * @param input container element of editor to focus
     */
    _focus_input(input: HTMLElement) {
        let el
        if (input.querySelector(`.${this.cfg.class_name}`))
            el = ancestor(input, '.editor-field')[this._name]
        else el = (
            input.querySelector('.CodeMirror > div > textarea')
            || input.querySelector('.rich-text-editable')?.shadowRoot.querySelector('anki-editable')
        )
        if (el) el.focus()
    }
}

export { CustomInputClass, CustomInputAPI }
