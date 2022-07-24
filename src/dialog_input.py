import aqt, os
import json, base64
from aqt import mw, gui_hooks
from aqt.utils import *
from aqt.qt import QKeySequence
if qtmajor == 6:
    from . import dialog_qt6 as dialog
elif qtmajor == 5:
    from . import dialog_qt5 as dialog
from .constants import *

config = {}

###########################################################################
# Main dialog to edit markdown
###########################################################################
class IM_dialog(QDialog):
    ###########################################################################
    # Constructor (populates and shows dialog)
    ###########################################################################
    def __init__(self, html: str, parent: QWidget, on_accept: Callable = None, on_reject: Callable = None):
        print(">>>dialog_input:IM_dialog:init")
        global config
        QDialog.__init__(self, parent)
        self.ui = dialog.Ui_dialog()
        self.ui.setupUi(self)
        self.on_accept = on_accept
        self.on_reject = on_reject
        self.ui.btns.accepted.connect(self.accept)
        self.ui.btns.rejected.connect(self.reject)

        self.setup_bridge(self.bridge_receiver)
        self.ui.web.setHtml(f'''
        <html>
        <head>
            <link rel=stylesheet href="cm_styles.css">
            <style>{config[DIALOG_INPUT][CSS]}</style>
        </head>
        <body>
            <script src="dialog_input.js"></script>
            <script>
                MarkdownInput.converter_configure({json.dumps(config[SHOWDOWN])});
                MarkdownInput.editor_configure({json.dumps(config[CODEMIRROR])});
                MarkdownInput.set_html({json.dumps(html)});
            </script>
        </body>
        </html>
        ''', QUrl.fromLocalFile(os.path.join(os.path.dirname(__file__), "")))

    ###########################################################################
    # Setup js → python message bridge (to shut Qt up b/c we don't use it)
    # Stolen from AnkiWebView
    ###########################################################################
    def setup_bridge(self, handler):
        print(">>>dialog_input:setup_bridge")
        class Bridge(QObject):
            def __init__(self, handler: Callable[[str], Any]) -> None:
                super().__init__()
                self._handler = handler
            @pyqtSlot(str, result=str)  # type: ignore
            def cmd(self, str: str) -> Any:
                return json.dumps(self._handler(str))
        
        self._bridge = Bridge(handler)
        self._channel = QWebChannel(self.ui.web)
        self._channel.registerObject("py", self._bridge)
        self.ui.web.page().setWebChannel(self._channel)
        qwebchannel = ":/qtwebchannel/qwebchannel.js"
        jsfile = QFile(qwebchannel)
        if not jsfile.open(QIODevice.OpenModeFlag.ReadOnly):
            print(f"Error opening '{qwebchannel}': {jsfile.error()}", file=sys.stderr)
        jstext = bytes(jsfile.readAll()).decode("utf-8")
        jsfile.close()
        script = QWebEngineScript()
        script.setSourceCode(
            jstext
            + """
            var pycmd, bridgeCommand;
            new QWebChannel(qt.webChannelTransport, function(channel) {
                bridgeCommand = pycmd = function (arg, cb) {
                    var resultCB = function (res) {
                        // pass result back to user-provided callback
                        if (cb) {
                            cb(JSON.parse(res));
                        }
                    }
                
                    channel.objects.py.cmd(arg, resultCB);
                    return false;                   
                }
                pycmd("domDone");
            });
        """)
        script.setWorldId(QWebEngineScript.ScriptWorldId.MainWorld)
        script.setInjectionPoint(QWebEngineScript.InjectionPoint.DocumentReady)
        script.setRunsOnSubFrames(False)
        self.ui.web.page().profile().scripts().insert(script)

    ###########################################################################
    # Bridge message receiver
    ###########################################################################
    def bridge_receiver(self, str = None):
        pass


    ###########################################################################
    # Main dialog accept
    ###########################################################################
    def accept(self) -> None:
        print(">>>dialog_input:accept")
        global config
        if self.on_accept:
            self.ui.web.page().runJavaScript('''(function () {
                return MarkdownInput.get_html();
            })();''', self.on_accept)

        config[FIELD_INPUT][LAST_GEOM] = base64.b64encode(self.saveGeometry()).decode('utf-8')
        mw.addonManager.writeConfig(__name__, config)
        return super().accept()

    ###########################################################################
    # Main dialog reject
    ###########################################################################
    def reject(self):
        print(">>>dialog_input:reject")
        global config
        config[DIALOG_INPUT][LAST_GEOM] = base64.b64encode(self.saveGeometry()).decode('utf-8')
        mw.addonManager.writeConfig(__name__, config)
        QDialog.reject(self) 


###########################################################################
# Include needed helper scripts in editor webview header
# Called once for the editor
def add_srcs(web_content: aqt.webview.WebContent, context: object):
    if not isinstance(context, aqt.editor.Editor):
        return
    print(">>>dialog_input:add_srcs")
    addon = mw.addonManager.addonFromModule(__name__)
    web_content.head += f"""
        <script defer src="/_addons/{addon}/dialog_input_helpers.js"></script>
    """

###########################################################################
# Open markdown dialog
###########################################################################
def edit_field(editor: aqt.editor.Editor, field: int = None):
    print(">>>dialog_input:edit_field")
    global config

    # Run the md editor dialog with callback for accept
    def run_dlg(html):
        print(">>>dialog_input:edit_field::run_dialog")
        dlg = IM_dialog(html, editor.parentWindow, dlg_result)
        if config[DIALOG_INPUT][SHORTCUT_ACCEPT]:
            QShortcut(config[DIALOG_INPUT][SHORTCUT_ACCEPT], dlg).activated.connect(dlg.accept)
        if config[DIALOG_INPUT][SHORTCUT_REJECT]:
            QShortcut(config[DIALOG_INPUT][SHORTCUT_REJECT], dlg).activated.connect(dlg.reject)

        if config[DIALOG_INPUT][SIZE_MODE].lower() == 'last':
            dlg.restoreGeometry(base64.b64decode(config[DIALOG_INPUT][LAST_GEOM]))
        elif match:= re.match(r'^(\d+)x(\d+)', config[DIALOG_INPUT][SIZE_MODE]):
            par_geom = editor.parentWindow.geometry()
            geom = QRect(par_geom)
            scr_geom = mw.app.primaryScreen().geometry()

            geom.setWidth(int(match.group(1)))
            geom.setHeight(int(match.group(2)))    
            if geom.width() > scr_geom.width():
                geom.setWidth(scr_geom.width())
            if geom.height() > scr_geom.height():
                geom.setHeight(scr_geom.height())
            geom.moveCenter(par_geom.center())
            if geom.x() < 0:
                geom.setX(0)
            if geom.y() < 0:
                geom.setY(0)

            dlg.setGeometry(geom)
        else:
            dlg.setGeometry(editor.parentWindow.geometry())

        dlg.show()
    
    # Callback for accepted md dialog
    def dlg_result(html):
        if config[DIALOG_INPUT][SELECTION]:
            editor.web.eval(f'''(async function () {{
                await MarkdownInputHelpers.set_selected_html({field}, {json.dumps(html)});
            }})();''')
        else:
            editor.web.eval(f'''(function () {{
                MarkdownInputHelpers.set_current_html({field}, {json.dumps(html)});
            }})();''')


    if field == None:
        field = editor.currentField if editor.currentField != None else editor.last_field_index
    if field != None: # Get content to edit
        if config[DIALOG_INPUT][SELECTION]: # Extend selection to complete lines and use this
            editor.web.evalWithCallback(f'''(function () {{
                return MarkdownInputHelpers.get_selected_html({field});
            }})();
            ''', run_dlg)
        else: # Use entire content
            editor.web.evalWithCallback(f'''(function () {{
                return MarkdownInputHelpers.get_current_html({field});
            }})();''', run_dlg)


###########################################################################
# Configure and activate dialog Markdown input
def configure(cfg: object):
    global config
    config = cfg    
    # Called once per editor instance
    # Include js and set up
    gui_hooks.webview_will_set_content.append(lambda web_content, context:
        add_srcs(
            web_content=web_content,
            context=context
        )
    )

    # Called once per editor instance
    # Configure Showdown and CodeMirror - after script load but before cm instantiation
    gui_hooks.editor_did_init.append(lambda ed: ed.web.eval(f'''
        MarkdownInput.converter_configure({json.dumps(config[SHOWDOWN])});
        MarkdownInput.editor_configure({json.dumps(config[CODEMIRROR])});
    '''))
    
    # Called once per editor every note load
    # Configure refresh of Markdown input fields on note load
    gui_hooks.editor_will_load_note.append(lambda _js, _note, _ed: _js + r"MarkdownInput.update();")
    
    gui_hooks.editor_did_init_shortcuts.append(lambda shortcuts, editor: 
        shortcuts.append([
            QKeySequence(config[DIALOG_INPUT][SHORTCUT]),
            lambda ed=editor: edit_field(ed)
        ])
    )
    gui_hooks.webview_will_set_content.append(add_srcs)

