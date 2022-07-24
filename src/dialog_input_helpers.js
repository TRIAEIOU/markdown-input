var MarkdownInputHelpers = (function (exports) {
    'use strict';

    function noop() { }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    Promise.resolve();

    function get_current_html(index) {
        var _a, _b;
        const editor = NoteEditor.instances[0];
        return get_store_value((_b = (_a = editor === null || editor === void 0 ? void 0 : editor.fields[index]) === null || _a === void 0 ? void 0 : _a.editingArea) === null || _b === void 0 ? void 0 : _b.content) || "";
    }
    function set_current_html(index, html) {
        var _a;
        const editor = NoteEditor.instances[0];
        const ed_area = (_a = editor === null || editor === void 0 ? void 0 : editor.fields[index]) === null || _a === void 0 ? void 0 : _a.editingArea;
        ed_area === null || ed_area === void 0 ? void 0 : ed_area.content.set(html);
        ed_area === null || ed_area === void 0 ? void 0 : ed_area.refocus();
    }
    // This is an ugly hack as I can't figure out how to "flatten" promises
    function get_selected_html(index) {
        // Expand selection to complete lines
        const sel = document.activeElement.shadowRoot.getSelection();
        const rng = sel.getRangeAt(0);
        const com_anc = rng.commonAncestorContainer;
        let nd = rng.startContainer;
        if (nd != com_anc) {
            while (nd.parentNode != com_anc) {
                nd = nd.parentNode;
            }
        }
        if (nd.previousSibling) {
            {
                rng.setStartAfter(nd.previousSibling);
            }
        }
        else {
            {
                rng.setStartBefore(nd);
            }
        }
        nd = rng.endContainer;
        if (nd != com_anc) {
            while (nd.parentNode != com_anc) {
                nd = nd.parentNode;
            }
        }
        if (nd.nextSibling) {
            {
                rng.setEndBefore(nd.nextSibling);
            }
        }
        else {
            {
                rng.setEndAfter(nd);
            }
        }
        sel.removeAllRanges();
        sel.addRange(rng);
        // Get expanded selection
        const tmp = document.createElement('div');
        tmp.append(rng.cloneContents());
        return tmp.innerHTML;
    }
    function set_selected_html(index, html) {
        let nd = document.activeElement.shadowRoot.querySelector('anki-editable');
        if (nd.firstChild && nd.firstChild.nodeName.toLowerCase() !== '#text') {
            {
                const sel = document.activeElement.shadowRoot.getSelection();
                let usr_rng = sel.getRangeAt(0);
                document.execCommand('selectAll');
                let all_rng = sel.getRangeAt(0);
                if (usr_rng.toString() === all_rng.toString()) {
                    {
                        nd.innerHTML = '<br>' + nd.innerHTML + '<br>';
                        document.execCommand('selectAll');
                    }
                }
                else {
                    {
                        sel.removeAllRanges();
                        sel.addRange(usr_rng);
                    }
                }
            }
        }
        // @ts-ignore: FIXME: TS doesn't have pasteHTML
        pasteHTML(html, true);
    }

    exports.get_current_html = get_current_html;
    exports.get_selected_html = get_selected_html;
    exports.set_current_html = set_current_html;
    exports.set_selected_html = set_selected_html;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
