import sys
import time

def safe_print(*args, **kwargs):
    """Safely print output with UTF-8 encoding support."""
    try:
        msg = " ".join(str(a) for a in args)
        print(msg, **kwargs)
        sys.stdout.flush()
    except Exception:
        pass
