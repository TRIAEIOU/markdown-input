import json
from aqt import mw, gui_hooks
from aqt.utils import *
from .constants import *

config = {}

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
    global config
    if not isinstance(context, aqt.editor.Editor):
        return
    print(">>>field_input:add_srcs")
    addon = mw.addonManager.addonFromModule(__name__)
    web_content.head += f"""
        <script defer src="/_addons/{addon}/field_input.js"></script>
        <link rel=stylesheet href="/_addons/{addon}/cm_styles.css">
        <style>{config[FIELD_INPUT][CSS]}</style>
    """


###########################################################################
# Configure and activate field Markdown input
def configure(cfg: object):
    global config
    config = cfg
    # Called once per editor instance
    # Include js and set up
    gui_hooks.webview_will_set_content.append(lambda wc, ctx:
        add_srcs(web_content=wc,context=ctx)
    )

    # Called once per editor instance
    # Configure Showdown and CodeMirror - after script load but before cm instantiation
    gui_hooks.editor_did_init.append(lambda ed: ed.web.eval(f'''
        MarkdownInput.configure({json.dumps(config[FIELD_INPUT])});
        MarkdownInput.converter_configure({json.dumps(config[SHOWDOWN])});
        MarkdownInput.editor_configure({json.dumps(config[CODEMIRROR])});
    '''))
    
    # Called once per editor every note load
    # Configure refresh of Markdown input fields on note load
    gui_hooks.editor_will_load_note.append(lambda _js, _note, _ed: _js + r"MarkdownInput.update();")
    
    # Called once per editor
    # Add shortcut
    gui_hooks.editor_did_init_shortcuts.append(lambda shortcuts, ed: 
        shortcuts.append(
            [QKeySequence(config[FIELD_INPUT][SHORTCUT]),
            lambda _ed=ed: toggle_field(_ed)]
        )
    )
