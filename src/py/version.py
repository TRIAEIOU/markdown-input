import os, re
from aqt import mw

def strvercmp(left: str, right: str) -> int:
    """Compares semantic version strings.\n
    Returns:    left version is larger: > 0
                right version is larger: < 0
                versions are equal: 0"""

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

def get_version() -> str:
    """Get current version string (from meta.json)."""
    meta = mw.addonManager.addon_meta(os.path.dirname(__file__))
    return meta.human_version if meta.human_version else '0.0.0'

def set_version(version: str):
    """Set version (to meta.json)."""
    meta = mw.addonManager.addon_meta(os.path.dirname(__file__))
    meta.human_version = version
    mw.addonManager.write_addon_meta(meta)
