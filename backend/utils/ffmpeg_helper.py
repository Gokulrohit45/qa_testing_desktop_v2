import os
import shutil
import subprocess
from backend.utils.logger import safe_print

def convert_mp4_to_y4m(mp4_path: str, y4m_path: str) -> bool:
    """
    Converts MP4 video to raw Y4M (YUV4MPEG2) format required by Chromium fake webcam stream.
    Uses native FFmpeg or OpenCV fallback lazily.
    """
    safe_print(f"[FFmpeg Helper] Converting MP4 ({mp4_path}) to Y4M ({y4m_path})...")

    # Method 1: Try native FFmpeg
    ffmpeg_exe = shutil.which("ffmpeg")
    if ffmpeg_exe:
        try:
            cmd = [ffmpeg_exe, "-y", "-i", mp4_path, "-pix_fmt", "yuv420p", y4m_path]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if res.returncode == 0 and os.path.exists(y4m_path) and os.path.getsize(y4m_path) > 0:
                safe_print(f"[FFmpeg Conversion SUCCESS] Size: {os.path.getsize(y4m_path)} bytes")
                return True
        except Exception as e:
            safe_print(f"[FFmpeg Conversion Warning] {e}")

    # Method 2: Lazy OpenCV Fallback
    try:
        import cv2
        cap = cv2.VideoCapture(mp4_path)
        if not cap.isOpened():
            return False

        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480

        with open(y4m_path, "wb") as f:
            header = f"YUV4MPEG2 W{width} H{height} F{fps}:1 Ip A1:1 C420\n"
            f.write(header.encode("ascii"))
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                f.write(b"FRAME\n")
                yuv = cv2.cvtColor(frame, cv2.COLOR_BGR2YUV_I420)
                f.write(yuv.tobytes())

        cap.release()
        return os.path.exists(y4m_path) and os.path.getsize(y4m_path) > 0
    except Exception as cv_err:
        safe_print(f"[OpenCV Conversion Warning] {cv_err}")
        return False
