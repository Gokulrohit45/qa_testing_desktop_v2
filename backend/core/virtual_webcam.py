import os
from backend.utils.logger import safe_print
from backend.utils.ffmpeg_helper import convert_mp4_to_y4m

def configure_virtual_webcam_args(project_id: str, face_auth_enabled: bool, face_video_path: str, upload_dir: str) -> list:
    """
    Returns Chrome flags required for injecting virtual webcam stream into Chromium.
    Handles MP4 to Y4M format conversion automatically.
    """
    chrome_args = [
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-setuid-sandbox",
        "--no-first-run"
    ]

    if not face_auth_enabled:
        return chrome_args

    chrome_args.extend([
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream"
    ])

    if face_video_path and os.path.exists(face_video_path):
        active_stream = None
        if face_video_path.lower().endswith(".y4m"):
            active_stream = face_video_path
        else:
            perm_y4m = os.path.abspath(os.path.join(upload_dir, f"perm_proj_{project_id}.y4m"))
            if not os.path.exists(perm_y4m) or os.path.getsize(perm_y4m) == 0:
                convert_mp4_to_y4m(face_video_path, perm_y4m)

            if os.path.exists(perm_y4m) and os.path.getsize(perm_y4m) > 0:
                active_stream = perm_y4m
            else:
                active_stream = face_video_path

        if active_stream:
            chrome_args.append(f"--use-file-for-fake-video-capture={active_stream}")
            safe_print(f"[Virtual Webcam Injector] Injected Y4M stream: {active_stream}")

    return chrome_args
