import re
from typing import Sequence
import aqt
from aqt import mw

_cache = {}

def clear_cache(*_):
    _cache = {}

def truncate(ncid: aqt.browser.ItemId, is_note: bool, row: aqt.browser.CellRow, cols: Sequence[str]):
    """If `<h1>` tag exists, use first occurance as sort field with caching"""
    try:
        sorti = cols.index("noteFld")
        nid = ncid if is_note else mw.col.get_card(ncid).nid
        if sorts_ := _cache.get(nid):
            sorts = sorts_
        else:
            note = mw.col.get_note(nid)
            sorts = note.fields[mw.col.models.sort_idx(note.note_type())]
            if h1 := re.search(r"<h1>(.*?)</h1>", sorts):
                sorts = h1.group(1).replace("&nbsp;", " ")
            else:
                sorts = -1
            _cache[nid] = sorts

        if sorts != -1:
            row.cells[sorti].text = sorts
    except:
        pass
