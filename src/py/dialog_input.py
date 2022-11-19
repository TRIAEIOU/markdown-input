import anki
import aqt, os, json, base64, re
from aqt.utils import *
from aqt.qt import QDialog, QWidget, QObject, QIODevice, QWebEngineScript, QShortcut, QRect, QFile, QUrl
if qtmajor == 6:
    from . import dialog_qt6 as dialog
elif qtmajor == 5:
    from . import dialog_qt5 as dialog
from .constants import *
from .utils import clip_img_to_md

BRIDGECOMMAND_ONACCEPT = "ON_ACCEPT:"
_config = {}
_dlgs = {}

###########################################################################
# Main dialog to edit markdown
###########################################################################
class IM_dialog(QDialog):
    ###########################################################################
    # Constructor (populates and shows dialog)
    ###########################################################################
    def __init__(self, parent: aqt.editor.Editor, note: anki.notes.Note, fid: int):
        global _config, _dlgs
        QDialog.__init__(self)
        _dlgs[hex(id(self))] = self
        self.ui = dialog.Ui_dialog()
        self.ui.setupUi(self)
        self.ui.btns.accepted.connect(self.accept)
        self.ui.btns.rejected.connect(self.reject)
        self.parent = parent
        self.nid = note.id
        self.fid = fid

        self.setup_bridge(self.bridge)
        self.ui.web.setHtml(f'''
        <html>
        <head>
            <script src="dialog_input.js"></script>
            <link rel=stylesheet href="cm_styles.css">
            <style>{_config[DIALOG_INPUT][CSS]}</style>
        </head>
        <body>
            <script>
                MarkdownInput.converter_init({json.dumps(_config[CONVERTER])});
                MarkdownInput.editor_init({json.dumps(_config[EDITOR])});
                MarkdownInput.set_html({json.dumps(note.fields[fid])});
            </script>
        </body>
        </html>
        ''', QUrl.fromLocalFile(os.path.join(os.path.dirname(__file__), "")))
        name = note.items()[0][1] or "[new]"
        if len(name) > 15:
            name = name[:15] + "..."
        self.setWindowTitle(name + ": " + note.items()[fid][0])

    def __del__(self):
        global _dlgs
        _dlgs.pop(hex(id(self)), None)
        print("<<<" + str(_dlgs))

    ###########################################################################
    # Setup js → python message bridge
    # Stolen from AnkiWebView
    ###########################################################################
    def setup_bridge(self, handler):
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
    def bridge(self, str = None):
        if str == "clipboard_image_to_markdown":
            img = clip_img_to_md()
            return img


    ###########################################################################
    # Main dialog accept
    ###########################################################################
    def accept(self) -> None:
        global _config
        def save_field(html):
            if self.parent.addMode or self.parent.note.id == self.nid:
                self.parent.note.fields[self.fid] = html
                self.parent.loadNoteKeepingFocus()
            else:
                note = aqt.mw.col.get_note(self.nid)
                note.fields[self.fid] = html
                aqt.mw.col.update_note(note)
            #note = aqt.mw.col.get_note(self.nid)
            #note.fields[self.fid] = html
            #aqt.mw.col.update_note(note)

        self.ui.web.page().runJavaScript(f'''(function () {{
            return MarkdownInput.get_html();
        }})();''', save_field)
        _config[DIALOG_INPUT][LAST_GEOM] = base64.b64encode(self.saveGeometry()).decode('utf-8')
        aqt.mw.addonManager.writeConfig(__name__, _config)
        super().accept()

    ###########################################################################
    # Main dialog reject
    ###########################################################################
    def reject(self):
        global _config
        _config[DIALOG_INPUT][LAST_GEOM] = base64.b64encode(self.saveGeometry()).decode('utf-8')
        aqt.mw.addonManager.writeConfig(__name__, _config)
        super().reject()

###########################################################################
# Open the Markdown dialog
###########################################################################
def edit_field(editor: aqt.editor.Editor):
    global _config

    if editor.currentField == None:
        return
    dlg = IM_dialog(editor, editor.note, editor.currentField)
    if _config[DIALOG_INPUT][SHORTCUT_ACCEPT]:
        QShortcut(_config[DIALOG_INPUT][SHORTCUT_ACCEPT], dlg).activated.connect(dlg.accept)
    if _config[DIALOG_INPUT][SHORTCUT_REJECT]:
        QShortcut(_config[DIALOG_INPUT][SHORTCUT_REJECT], dlg).activated.connect(dlg.reject)

    if _config[DIALOG_INPUT][SIZE_MODE].lower() == 'last':
        dlg.restoreGeometry(base64.b64decode(_config[DIALOG_INPUT][LAST_GEOM]))
    elif match:= re.match(r'^(\d+)x(\d+)', _config[DIALOG_INPUT][SIZE_MODE]):
        par_geom = editor.parentWindow.geometry()
        geom = QRect(par_geom)
        scr_geom = aqt.mw.app.primaryScreen().geometry()

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


###########################################################################
# Configure and activate dialog Markdown input
def init(cfg: object):
    global _config
    def editor_btn(buttons, editor):
        btn = editor.addButton(
            os.path.join(ADDON_PATH, "gfx", "markdown.png"),
            "md_dlg_btn",
            edit_field,
            tip=f"Markdown Input ({_config[DIALOG_INPUT][SHORTCUT]})",
            keys=_config[DIALOG_INPUT][SHORTCUT]
            )
        buttons.append(btn)
        return buttons

    _config = cfg
    aqt.gui_hooks.editor_did_init_buttons.append(editor_btn)
    #gui_hooks.webview_will_set_content.append(add_srcs)

