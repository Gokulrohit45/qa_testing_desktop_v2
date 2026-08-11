import os
import time
from backend.utils.logger import safe_print
from backend.core.virtual_webcam import configure_virtual_webcam_args
from backend.core.smart_selectors import smart_fill, smart_click

def execute_playwright_test(execution_id: str, test_case: dict, project: dict, screenshot_dir: str, upload_dir: str, callback_fn=None) -> dict:
    """
    Executes a Playwright test case step-by-step with live step callbacks,
    screenshot generation, and error tracebacks.
    """
    from playwright.sync_api import sync_playwright

    steps = test_case.get("steps", [])
    if isinstance(steps, str):
        import json
        try: steps = json.loads(steps)
        except: steps = []

    face_auth = project.get("face_auth_enabled", False)
    face_video = project.get("face_video_path", "")
    proj_id = project.get("id", "default")
    target_url = project.get("target_url", "https://example.com")

    chrome_args = configure_virtual_webcam_args(proj_id, face_auth, face_video, upload_dir)

    logs = []
    status = "Passed"
    error_msg = None
    t0 = time.time()

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=chrome_args
        )
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            permissions=["camera", "microphone"] if face_auth else []
        )
        page = context.new_page()

        try:
            page.goto(target_url, timeout=30000)
            logs.append({"step": 0, "action": "navigate", "target": target_url, "status": "Passed", "duration": round(time.time() - t0, 2)})
        except Exception as nav_err:
            status = "Failed"
            error_msg = f"Navigation failed: {str(nav_err)}"
            logs.append({"step": 0, "action": "navigate", "target": target_url, "status": "Failed", "error": error_msg})
            browser.close()
            return {"status": status, "duration": round(time.time() - t0, 2), "logs": logs, "error": error_msg}

        for idx, stp in enumerate(steps, start=1):
            st_t0 = time.time()
            action = stp.get("action", "").lower()
            target = stp.get("target", "")
            value = stp.get("value", "")

            step_log = {"step": idx, "action": action, "target": target, "value": value, "status": "Running"}
            if callback_fn: callback_fn(step_log)

            try:
                if action == "fill":
                    smart_fill(page, target, value)
                elif action == "click":
                    smart_click(page, target)
                elif action == "navigate":
                    page.goto(target, timeout=20000)
                elif action == "wait":
                    wait_s = float(value) if value else 1.0
                    time.sleep(wait_s)
                elif action in ["verify", "assert"]:
                    page.wait_for_selector(f"text={target}", timeout=10000)

                # Capture step screenshot
                ss_filename = f"exec_{execution_id}_step_{idx}.png"
                ss_path = os.path.join(screenshot_dir, ss_filename)
                page.screenshot(path=ss_path)

                step_log["status"] = "Passed"
                step_log["screenshot"] = f"/uploads/screenshots/{ss_filename}"
                step_log["duration"] = round(time.time() - st_t0, 2)
            except Exception as step_err:
                status = "Failed"
                error_msg = f"Step {idx} ({action} -> '{target}') failed: {str(step_err)}"
                step_log["status"] = "Failed"
                step_log["error"] = error_msg
                step_log["duration"] = round(time.time() - st_t0, 2)
                logs.append(step_log)
                if callback_fn: callback_fn(step_log)
                break

            logs.append(step_log)
            if callback_fn: callback_fn(step_log)

        browser.close()

    total_duration = round(time.time() - t0, 2)
    return {"status": status, "duration": total_duration, "logs": logs, "error": error_msg}
