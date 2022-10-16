import json, tempfile
from aqt import mw, gui_hooks, QKeySequence
from aqt.utils import *
from .constants import *
from .utils import clip_img_to_md

_config = {}
tmp_dir = tempfile.TemporaryDirectory()

###########################################################################
# Toggle current field state
def toggle_field(editor: aqt.editor.Editor, fld: int = None):
    if fld == None:
        fld = editor.currentField if editor.currentField != None else editor.last_field_index
    if fld != None:        
        editor.web.eval(f'MarkdownInput.toggle({fld});')


###########################################################################
# Include needed scripts and styles in editor webview header
# Called once for the editor
def add_srcs(web_content: aqt.webview.WebContent, context: object):
    global _config

    if not isinstance(context, aqt.editor.Editor):
        return
    addon = mw.addonManager.addonFromModule(__name__)
    # Defer script to allow bridgeCommand to be defined
    web_content.head += f"""
        <script src="/_addons/{addon}/field_input.js"></script>
        <link rel=stylesheet href="/_addons/{addon}/cm_styles.css">
        <style>{_config[FIELD_INPUT][CSS]}</style>
    """
    # Configure Unified and CodeMirror - after script load but before cm instantiation
    web_content.body += f'''
        <script>
            MarkdownInput.init({json.dumps(_config[FIELD_INPUT])});
            MarkdownInput.converter_init({json.dumps(_config[CONVERTER])});
            MarkdownInput.editor_init({json.dumps(_config[EDITOR])});
        </script>
    '''

###########################################################################
# Bridge to handle image pasting - inserts in media library and
# returns the MD string
def bridge(handled: tuple[bool, Any], message: str, context: Any) -> tuple[bool, Any]:
    if message == 'clipboard_image_to_markdown':
        file = clip_img_to_md()
        return (True, file)

    return handled

###########################################################################
# Set configuration and hooks
def init(cfg):
    global _config
    _config = cfg
    gui_hooks.webview_will_set_content.append(lambda wc, ctx: add_srcs(wc, ctx))
    gui_hooks.editor_will_load_note.append(lambda _js, _note, _ed: _js + r"MarkdownInput.update();")  
    gui_hooks.editor_did_init_shortcuts.append(lambda shortcuts, ed: 
        shortcuts.append(
            [QKeySequence(cfg[FIELD_INPUT][SHORTCUT]),
            lambda _ed=ed: toggle_field(_ed)]
        )
    )
    gui_hooks.webview_did_receive_js_message.append(bridge)
