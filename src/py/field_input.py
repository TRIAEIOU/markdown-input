import json, tempfile
from aqt import mw, gui_hooks, QKeySequence
from aqt.utils import *
from .constants import *
from .version import strvercmp
from .utils import clip_img_to_md, get_path

if tmp := re.match(r"^\s*((\d+\.)+\d+)", version_with_build()):
    ANKI_VER = tmp.group(1)
else:
    ANKI_VER = "2.1.0"
_config = {}
tmp_dir = tempfile.TemporaryDirectory()

###########################################################################
def toggle_field(editor: aqt.editor.Editor, name: str, fld: int = None):
    """Toggle current field state"""
    if fld == None:
        fld = editor.currentField if editor.currentField != None else editor.last_field_index
    if fld != None:
        if name == 'markdown':
            editor.web.eval(f'MarkdownInput.toggle({fld});')
        else:
            editor.web.eval(f'MarkdownInput.toggle_rich({fld});')


###########################################################################
def add_srcs(web_content: aqt.webview.WebContent, context: object):
    """Include needed scripts and styles in editor webview header. Called once for the editor"""
    global _config
    if not isinstance(context, aqt.editor.Editor):
        return
    addon = mw.addonManager.addonFromModule(__name__)
    # Defer script to allow bridgeCommand to be defined
    if strvercmp(ANKI_VER, "2.1.55") > 0: # Current version
        web_content.head += f"""
            <script src="/_addons/{addon}/field_input.js"></script>
            <link rel=stylesheet href="/_addons/{addon}/mdi.css">
            <link rel=stylesheet href="/_addons/{addon}/{get_path('cm.css')}">
        """
    else: # Legacy, not updated
        web_content.head += f"""
            <script src="/_addons/{addon}/field_input_2.1.55.js"></script>
            <link rel=stylesheet href="/_addons/{addon}/mdi.css">
            <link rel=stylesheet href="/_addons/{addon}/{get_path('cm.css')}">
        """

    # Configure Unified and CodeMirror - after script load but before cm instantiation
    web_content.body += f'''
        <script>
            MarkdownInput.init({json.dumps(_config)});
        </script>
    '''

###########################################################################
def bridge(handled: tuple[bool, Any], message: str, context: Any) -> tuple[bool, Any]:
    """Bridge to handle image pasting - inserts in media library and returns the MD string"""
    if message == 'clipboard_image_to_markdown':
        file = clip_img_to_md()
        return (True, file)

    return handled

###########################################################################
def init(cfg):
    """Set configuration and hooks"""
    def append_shortcuts(shortcuts, ed):
        shortcuts.append(
            [QKeySequence(cfg[FIELD_INPUT][SC_TOGGLE]),
            lambda _ed=ed: toggle_field(_ed, 'markdown')]
        )
        shortcuts.append(
            [QKeySequence(cfg[FIELD_INPUT][SC_RICH]),
            lambda _ed=ed: toggle_field(_ed, 'rich')]
        )
        shortcuts.append(
            [QKeySequence(cfg[FIELD_INPUT][SC_NEXT]),
           lambda _ed=ed: ed.web.eval('MarkdownInput.cycle_next()')]
        )
        shortcuts.append(
            [QKeySequence(cfg[FIELD_INPUT][SC_PREV]),
           lambda _ed=ed: ed.web.eval('MarkdownInput.cycle_prev()')]
        )

    global _config
    _config = cfg
    gui_hooks.webview_will_set_content.append(lambda wc, ctx: add_srcs(wc, ctx))
    gui_hooks.editor_will_load_note.append(lambda _js, _note, _ed: _js + r"MarkdownInput.update_all()")
    gui_hooks.editor_did_init_shortcuts.append(append_shortcuts)
    gui_hooks.webview_did_receive_js_message.append(bridge)
