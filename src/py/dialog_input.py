import anki
import aqt, os, json, base64, re
from aqt.utils import *
from aqt.qt import QDialog, QObject, QIODevice, QWebEngineScript, QShortcut, QRect, QFile, QUrl
if qtmajor == 6:
    from . import dialog_qt6 as dialog
elif qtmajor == 5:
    from . import dialog_qt5 as dialog
from .constants import *
from .utils import clip_img_to_md, get_path

BRIDGECOMMAND_ONACCEPT = "ON_ACCEPT:"
_config = {}
_dlgs = {}

###########################################################################
class IM_dialog(QDialog):
    """Main dialog to edit markdown in external window"""

    ###########################################################################
    def __init__(self, parent: aqt.editor.Editor, note: anki.notes.Note, fid: int):
        """Constructor: Populates and shows dialog"""
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
        self.ui.web.page().setBackgroundColor(theme_manager.qcolor(aqt.colors.CANVAS))

        #self.ui.web.page().setBackgroundColor(Qt.GlobalColor.transparent)
        classes = aqt.theme.theme_manager.body_class().split(' ')
        classes.append('mdi-dialog')
        if not set(classes).isdisjoint(('nightMode', 'night_mode')):
            classes.append('night-mode')
        print(f'href="{aqt.mw.serverURL()}_anki/css/note_creator.css"')
        print(f'class="{" ".join(classes)}"')

        self.ui.web.setHtml(f'''
        <html>
        <head>
            <style>
                {parent.web.standard_css()}
            </style>
            <link rel="stylesheet" type="text/css" href="_anki/css/note_creator.css">
            <script src="dialog_input.js"></script>
            <link rel=stylesheet href="mdi.css">
            <link rel=stylesheet href="{get_path('cm.css')}">
        </head>
        <body class="{' '.join(classes)}">
            <script>
                const mdi_editor = new MarkdownInput.DialogEditor({json.dumps(_config)})
                mdi_editor.set_html({json.dumps(note.items())}, {self.fid})

                alert('loading ' + '{aqt.mw.serverURL()}_anki/css/note_creator.css')
                var req = new XMLHttpRequest();
                req.open('GET', '{aqt.mw.serverURL()}_anki/css/note_creator.css', false);
                req.send(null);
                alert(req.responseText)
                document.body.innerText = req.responseText
            </script>
        </body>
        </html>
        ''', QUrl(aqt.mw.serverURL())) #QUrl.fromLocalFile(os.path.join(ADDON_PATH, "")))
        name = note.items()[0][1] or "[new]"
        if len(name) > 15:
            name = name[:15] + "..."
        self.setWindowTitle(name + ": " + note.items()[fid][0])

    def __del__(self):
        global _dlgs
        _dlgs.pop(hex(id(self)), None)

    ###########################################################################
    def setup_bridge(self, handler):
        """Setup js → python message bridge. Stolen from AnkiWebView."""
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
    def bridge(self, str = None):
        """Bridge message receiver"""
        if str == "clipboard_image_to_markdown":
            img = clip_img_to_md()
            return img
        return


    ###########################################################################
    def accept(self) -> None:
        """Main dialog accept"""
        global _config
        def save_field(res):
            if not res:
                return
            if self.parent.addMode or self.parent.note.id == self.nid:
                note = self.parent.note
                focus = True
            else:
                note = aqt.mw.col.get_note(self.nid)
                focus = False

            if type(res) == str: # Partial note
                note.fields[self.fid] = res
            else: # Complete note
                for (title, content) in res: note[title] = content

            if focus: self.parent.loadNoteKeepingFocus()
            else: aqt.mw.col.update_note(note)

        self.ui.web.page().runJavaScript(f'''(function () {{
            return mdi_editor.get_html();
        }})();''', save_field)
        _config[DIALOG_INPUT][LAST_GEOM] = base64.b64encode(self.saveGeometry()).decode('utf-8')
        aqt.mw.addonManager.writeConfig(__name__, _config)
        super().accept()

    ###########################################################################
    def reject(self):
        """Main dialog reject"""
        global _config
        _config[DIALOG_INPUT][LAST_GEOM] = base64.b64encode(self.saveGeometry()).decode('utf-8')
        aqt.mw.addonManager.writeConfig(__name__, _config)
        super().reject()

###########################################################################
def edit_field(editor: aqt.editor.Editor):
    """Open the markdown dialog for selected field"""
    global _config

    if editor.currentField == None:
        return
    dlg = IM_dialog(editor, editor.note, editor.currentField)
    if _config[DIALOG_INPUT][SC_ACCEPT]:
        QShortcut(_config[DIALOG_INPUT][SC_ACCEPT], dlg).activated.connect(dlg.accept)
    if _config[DIALOG_INPUT][SC_REJECT]:
        QShortcut(_config[DIALOG_INPUT][SC_REJECT], dlg).activated.connect(dlg.reject)

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
def init(cfg: object):
    """Configure and activate markdown input dialog"""
    global _config
    def editor_btn(buttons, editor):
        btn = editor.addButton(
            os.path.join(ADDON_PATH, "gfx", "markdown.png"),
            "md_dlg_btn",
            edit_field,
            tip=f"Markdown Input ({_config[DIALOG_INPUT][SC_OPEN]})",
            keys=_config[DIALOG_INPUT][SC_OPEN]
            )
        buttons.append(btn)
        return buttons

    _config = cfg
    aqt.gui_hooks.editor_did_init_buttons.append(editor_btn)
    #gui_hooks.webview_will_set_content.append(add_srcs)

