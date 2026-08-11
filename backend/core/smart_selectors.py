import time
from backend.utils.logger import safe_print

def smart_fill(page, target: str, value: str):
    """Fills input element by label, placeholder, name, id, or selector."""
    selectors = [
        target,
        f"input[name='{target}']",
        f"input[id='{target}']",
        f"input[placeholder*='{target}' i]",
        f"textarea[name='{target}']",
        f"textarea[id='{target}']",
        f"textarea[placeholder*='{target}' i]"
    ]
    for sel in selectors:
        try:
            if page.locator(sel).first.is_visible(timeout=1000):
                page.locator(sel).first.fill(value)
                return True
        except Exception:
            pass

    # Try label matching
    try:
        page.get_by_label(target, exact=False).first.fill(value)
        return True
    except Exception:
        pass

    # Fallback to direct locator
    page.locator(target).first.fill(value)
    return True

def smart_click(page, target: str):
    """Clicks button or link by text, role, name, id, or selector."""
    selectors = [
        target,
        f"button:has-text('{target}')",
        f"a:has-text('{target}')",
        f"input[type='submit'][value*='{target}' i]",
        f"[id='{target}']",
        f"[name='{target}']"
    ]
    for sel in selectors:
        try:
            if page.locator(sel).first.is_visible(timeout=1000):
                page.locator(sel).first.click()
                return True
        except Exception:
            pass

    # Try text matching
    try:
        page.get_by_text(target, exact=False).first.click()
        return True
    except Exception:
        pass

    # Fallback to direct locator
    page.locator(target).first.click()
    return True
