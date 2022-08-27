from aqt import mw
from aqt.utils import *
from . import field_input, dialog_input
from .constants import *
#from .utils import tracefunc
#import sys
#sys.setprofile(tracefunc)

mw.addonManager.setWebExports(__name__, r"(.*(css|js|map))")
config = mw.addonManager.getConfig(__name__)

if config.get(CONVERTER) and config[CONVERTER][HARDBREAK] != 'spaces':
    config[CONVERTER][HARDBREAK] = 'backslash'

if config.get(FIELD_INPUT) or config.get(CONVERTER):
    field_input.init(config)
 
if config.get(DIALOG_INPUT) or config.get(CONVERTER):
    dialog_input.init(config)

