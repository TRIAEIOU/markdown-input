import os

FIELD_INPUT = 'Field input'
TOGGLE_STATE = 'Shortcut field input'
FIELD_DEFAULT = 'Default field state'
TYPE_RICH = 'rich text'
TYPE_MARKDOWN = 'markdown'
HIDE_PLAIN = "Hide plain text on toggle"
HIDE_RICH = "Hide rich text on toggle"
RESTORE = "Restore state on toggle"

DIALOG_INPUT = "Dialog input"
SIZE_MODE = "Size mode" # "parent", "last", WIDTHxHEIGHT (e.g "1280x1024")
LAST_GEOM = "Last geometry"
SELECTION = "Selection only"
SHORTCUT_ACCEPT = "Shortcut accept"
SHORTCUT_REJECT = "Shortcut reject"
NEWLINE = "Table newline"
HARDBREAK = "Hard break"
CFG_LAST_GEOM = "Last geometry"

CSS = "CSS"
SHORTCUT = "Shortcut"
RICH_SHORTCUT = "Rich text shortcut"
NEXT_SHORTCUT = "Next field"
PREV_SHORTCUT = "Previous field"
CONVERTER = "Converter"
EDITOR = "CodeMirror"
ADDON_PATH = os.path.dirname(__file__)
VERSION = "2.0.0"

def strvercmp(left: str, right: str) -> int:
    """Compares semantic version strings.\n
    Returns:    left version is larger: >0
                right version is larger: <0
                versions are equal: 0"""
    import re
    pat = re.compile('^([0-9]+)\.?([0-9]+)?\.?([0-9]+)?([a-z]+)?([0-9]+)?$')
    l = pat.match(left).groups()
    r = pat.match(right).groups()
    for i in range(5):
        if l[i] != r[i]:
            if i == 3:
                return 1 if l[3] == None or (r[3] != None and l > r) else -1
            else:
                return 1 if r[i] == None or (l[i] != None and int(l[i]) > int(r[i])) else -1
    return 0
