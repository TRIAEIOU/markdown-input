// @ts-ignore FIXME: how to import correctly?
import * as NoteEditor from "anki/NoteEditor"
import { get } from "svelte/store"
// @ts-ignore FIXME: how to import correctly?
import type { RichTextInputAPI } from "anki/ts/editor/rich-text-input"
// @ts-ignore FIXME: how to import correctly?
import type { PlainTextInputAPI } from "anki/ts/editor/plain-text-input"

/**
 * Asynchronous Generator to fetch <anki-editable>
 * @author Hikaru Yoshiga <github.com/hikaru-y/>
 * @author Matthias Metelka <github.com/kleinerpirat>
 */
export default async function* anki_editable_iterator(): AsyncGenerator<[HTMLElement, number]> {
    // @ts-ignore
    while (!NoteEditor.instances[0]?.fields?.length)
        await new Promise(requestAnimationFrame)
    // @ts-ignore
    for (const [i, fieldApi] of NoteEditor.instances[0].fields.entries()) {
        const inputs = get(fieldApi.editingArea.editingInputs) as (
            | PlainTextInputAPI
            | RichTextInputAPI
        )[];
        const richTextInputApi = inputs.find((input) => {
            return input.name === "rich-text"
        })!
        const ankiEditable = await richTextInputApi.element
        yield [ankiEditable, i]
    }
}
