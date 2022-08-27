import os
from aqt import QImage, mw, QApplication, QClipboard
from anki.utils import namedtmp
from anki.collection import Config

###########################################################################
# Check if clipboard contains an image and if so add to media library
# and return file name, otherwise return None
def clip_img_to_md() -> str:
    mime = QApplication.clipboard().mimeData(QClipboard.Mode.Clipboard)

    if mime.hasImage():
        im = QImage(mime.imageData())
        uname = namedtmp("paste")
        if mw.col.get_config_bool(Config.Bool.PASTE_IMAGES_AS_PNG):
            ext = ".png"
            im.save(uname + ext, None, 50)
        else:
            ext = ".jpg"
            im.save(uname + ext, None, 80)
        
        path = uname + ext
        if os.path.exists(path):
            return f"![]({mw.col.media.add_file(path)})"

    return None


###########################################################################
# Print function entry and exit (own code) use with the following in
# __init__.py:
#   from .utils import tracefunc
#   import sys
#   sys.setprofile(tracefunc)
def tracefunc(frame, event, arg, indent=[0]):
    # Check that it is our file
    if os.path.dirname(__file__) == os.path.dirname(frame.f_code.co_filename):
        if event == "call" or event == "return":
            funcname = frame.f_code.co_name
            filename = os.path.basename(frame.f_code.co_filename)
        if event == "call":
            indent[0] += 2
            print("-" * indent[0] + "> enter ", funcname, " (", filename, ")")
        elif event == "return":
            print("<" + "-" * indent[0], "exit ", funcname, " (", filename, ")")
            indent[0] -= 2
        return tracefunc
