import os

# Sync with constants.ts

# Field input
FIELD_INPUT = 'Field input'
SC_TOGGLE = 'Shortcut'
SC_RICH = "Rich text shortcut"
SC_NEXT = "Next field"
SC_PREV = "Previous field"
FIELD_DEFAULT = 'Default field state'
CYCLE_RICH_MD = "Cycle rich text/Markdown"

# Window input
WINDOW_INPUT = "Window input"
WINDOW_MODE = "Mode"
SC_OPEN = 'Shortcut'
SC_ACCEPT = "Shortcut accept"
SC_REJECT = "Shortcut reject"
SIZE_MODE = "Size mode" # "parent", "last", WIDTHxHEIGHT (e.g "1280x1024")
SELECTION = "Selection only"
CSS = "CSS"
LAST_GEOM = "Last geometry"

# Converter
CONVERTER = "Converter"
MD_FORMAT = "Markdown format"
MD_EXTENSIONS = "Markdown extensions"

# Editor
EDITOR = "CodeMirror"
KEYMAP = "keymap"
THEME = "Theme"
SYNTAX = "Syntax highlighting"

# General
ADDON_PATH = os.path.dirname(__file__)
ADDON_RELURL = os.path.join('_addons', os.path.split(ADDON_PATH)[1])
MDI = "MDI"
