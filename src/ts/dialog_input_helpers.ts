import { get } from "svelte/store";
// @ts-ignore FIXME: how to import correctly?
import { NoteEditorAPI } from "@anki/ts/editor/NoteEditor.svelte";
declare var NoteEditor: {
    context: any,
    lifecycle: any,
    instances: NoteEditorAPI[]
};

declare namespace Missing {
    interface ShadowRoot extends globalThis.ShadowRoot {
        // FIXME: Why doesn't TS ShadowRoot type have getSelection()?
        getSelection: () => Selection
    }
}

function get_current_html(index: number): string {
    const editor = NoteEditor.instances[0];
    return get(editor?.fields[index]?.editingArea?.content) as string || "";
}

function set_current_html(index: number, html: string) {
    const editor = NoteEditor.instances[0];
    const ed_area = editor?.fields[index]?.editingArea;
    ed_area?.content.set(html);
    ed_area?.refocus();
}

// This is an ugly hack as I can't figure out how to "flatten" promises
function get_selected_html(index: number): string {
    // Expand selection to complete lines
    const sel = (<Missing.ShadowRoot>document.activeElement.shadowRoot).getSelection();
    const rng = sel.getRangeAt(0);
    const com_anc = rng.commonAncestorContainer;

    let nd = rng.startContainer;
    if (nd != com_anc) { while (nd.parentNode != com_anc) { nd = nd.parentNode; } }
    if (nd.previousSibling) {{ rng.setStartAfter(nd.previousSibling); }}
    else {{ rng.setStartBefore(nd); }}
    
    nd = rng.endContainer;
    if (nd != com_anc) { while (nd.parentNode != com_anc) { nd = nd.parentNode; } }
    if (nd.nextSibling) {{ rng.setEndBefore(nd.nextSibling); }}
    else {{ rng.setEndAfter(nd); }}
    
    sel.removeAllRanges();
    sel.addRange(rng);

    // Get expanded selection
    const tmp = document.createElement('div');
    tmp.append(rng.cloneContents());
    return tmp.innerHTML;
}

function set_selected_html(index: number, html: string) {
    let nd = document.activeElement.shadowRoot.querySelector('anki-editable');
    if (nd.firstChild && nd.firstChild.nodeName.toLowerCase() !== '#text') {{
        const sel = (<Missing.ShadowRoot>document.activeElement.shadowRoot).getSelection();
        let usr_rng = sel.getRangeAt(0);
        document.execCommand('selectAll');
        let all_rng = sel.getRangeAt(0);
        if (usr_rng.toString() === all_rng.toString()) {{
            nd.innerHTML = '<br>' + nd.innerHTML + '<br>';
            document.execCommand('selectAll');
        }} else {{
            sel.removeAllRanges();
            sel.addRange(usr_rng);
        }}
    }}
    // @ts-ignore: FIXME: TS doesn't have pasteHTML
    pasteHTML(html, true);
}

export {get_current_html, set_current_html, get_selected_html, set_selected_html}