from . import field_input, dialog_input
from .constants import *
from aqt import mw
from aqt.utils import *

mw.addonManager.setWebExports(__name__, r"(.*(css|js|map))")
config = mw.addonManager.getConfig(__name__)

if config.get(FIELD_INPUT) or config.get(CONVERTER):
    field_input.configure(config)
 
if config.get(DIALOG_INPUT) or config.get(CONVERTER):
    dialog_input.configure(config)
