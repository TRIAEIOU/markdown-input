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
VERSION = "1.2.1"

def strvercmp(left: str, right: str) -> int:
    """Compares semantic version strings.\n
    Returns:    left string is larger: >0
                right string is larger: <0
                strings are equal: 0"""
    import re
    l = re.match("^([0-9]+)\.([0-9]+)\.([0-9]+)([ab])?([0-9]+)?$", left).groups()
    r = re.match("^([0-9]+)\.([0-9]+)\.([0-9]+)([ab])?([0-9]+)?$", right).groups()
    for i in range(3):
        if l[i] != r[i]:
            return 1 if int(l[i]) > int(r[i]) else -1
    if l[3] != r[3]:
        return 1 if l[3] == None or (r[4] != None and l > r) else -1
    if l[4] != r[4]:
        return 1 if r[4] == None or (l[4] != None and int(l[4]) > int(r[4])) else -1
    return 0
