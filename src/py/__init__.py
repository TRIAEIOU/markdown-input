from aqt import mw, QPushButton, QMessageBox

from aqt.utils import *
from . import field_input, dialog_input
from .constants import *

mw.addonManager.setWebExports(__name__, r"(.*(css|js|map))")
config = mw.addonManager.getConfig(__name__)

if config['Field input'].get("Restore state on toggle", None) != None:
    msg_box = QMessageBox(mw)
    msg_box.setWindowTitle('Addon "Markdown input" updated')
    msg_box.setText("""<div style="text-align: left;">"Markdown input" addon has been updated, potentially changing the behaviour depending on your current configuration for the addon.<ul><li>The configurations "Restore state on toggle", "Hide plain text on toggle" and "Hide rich text on toggle" for "Field input" have been replaced with "Cycle rich text/Markdown" (making the Markdown shortcut either cycle between rich text and Markdown or simply show/hide the Markdown input).</li><li>"Cloze lists" for "Converter" has been removed.</li></ul>Please see the addon page (https://ankiweb.net/shared/info/904999275) for details.</div>""")
    msg_box.addButton(QPushButton('Ok'), QMessageBox.YesRole)
    msg_box.exec()
    config['Field input'].pop('Restore state on toggle', None)
    config['Field input'].pop('Hide plain text on toggle', None)
    config['Field input'].pop('Hide rich text on toggle', None)
    config['Converter'].pop('Cloze lists', None)

if strvercmp(config.get('version', '1.1.0'), VERSION) < 0:
    config['version'] = VERSION
    mw.addonManager.writeConfig(__name__, config)

if config.get(CONVERTER) and config[CONVERTER][HARDBREAK] != 'spaces':
    config[CONVERTER][HARDBREAK] = 'backslash'

if config.get(FIELD_INPUT) or config.get(CONVERTER):
    field_input.init(config)

if config.get(DIALOG_INPUT) or config.get(CONVERTER):
    dialog_input.init(config)

