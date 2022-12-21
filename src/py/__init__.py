from aqt import mw, QPushButton, QMessageBox

from aqt.utils import *
from . import field_input, dialog_input
from .constants import *

mw.addonManager.setWebExports(__name__, r"(.*(css|js|map))")
config = mw.addonManager.getConfig(__name__)

ver = config.get('version', '0.0.0')
if ver != '-1': # -1 means fresh install, i.e. up to date
    if strvercmp(ver, '1.2.0') < 0:
        msg_box = QMessageBox(mw)
        msg_box.setWindowTitle('Addon "Markdown input" updated')
        msg_box.setText("""<div style="text-align: left;">"Markdown input" addon has been updated, potentially changing the behaviour depending on your current configuration for the addon.<ul><li>The configurations "Restore state on toggle", "Hide plain text on toggle" and "Hide rich text on toggle" for "Field input" have been replaced with "Cycle rich text/Markdown" (making the Markdown shortcut either cycle between rich text and Markdown or simply show/hide the Markdown input).</li><li>"Cloze lists" for "Converter" has been removed.</li></ul>Please see the addon page (https://ankiweb.net/shared/info/904999275) for details.</div>""")
        msg_box.addButton(QPushButton('Ok'), QMessageBox.YesRole)
        msg_box.exec()
        config['Field input'].pop('Restore state on toggle', None)
        config['Field input'].pop('Hide plain text on toggle', None)
        config['Field input'].pop('Hide rich text on toggle', None)
        config['Converter'].pop('Cloze lists', None)

    if strvercmp(ver, '1.2.2') < 0:
        config.pop('Rich text shortcut', None)
        config.pop('Next field', None)
        config.pop('Previous field', None)
        config.pop('Default field state', None)
        config.pop('Cycle rich text/Markdown', None)
        if config['Field input'].get('Rich text shortcut', None) == None:
            config['Field input']['Rich text shortcut'] = 'Ctrl+Alt+X'
        if config['Field input'].get('Next field', None) == None:
            config['Field input']['Next field'] = 'Ctrl+PgDown'
        if config['Field input'].get('Previous field', None) == None:
            config['Field input']['Previous field'] = 'Ctrl+PgUp'
        if config['Field input'].get('Default field state', None) == None:
            config['Field input']['Default field state'] = 'rich text'
        if config['Field input'].get('Cycle rich text/Markdown', None) == None:
            config['Field input']['Cycle rich text/Markdown'] = True

if ver == '-1' or strvercmp(ver, VERSION) < 0:
    config['version'] = VERSION
    mw.addonManager.writeConfig(__name__, config)

if config.get(CONVERTER) and config[CONVERTER][HARDBREAK] != 'spaces':
    config[CONVERTER][HARDBREAK] = 'backslash'

if config.get(FIELD_INPUT) or config.get(CONVERTER):
    field_input.init(config)

if config.get(DIALOG_INPUT) or config.get(CONVERTER):
    dialog_input.init(config)

