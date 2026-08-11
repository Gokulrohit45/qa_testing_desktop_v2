import os
import sys
from dotenv import load_dotenv

load_dotenv()

PORT = int(os.getenv("PORT", "5000"))
API_URL = os.getenv("API_URL", "http://localhost:8080")
LOCAL_ENGINE_URL = os.getenv("LOCAL_ENGINE_URL", "http://localhost:5000")

# Unified local storage root
USER_DATA_PATH = os.getenv("USER_DATA_PATH", os.path.expanduser("~/.qa_ai_platform"))
os.makedirs(USER_DATA_PATH, exist_ok=True)

# Supabase Credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://rehuyaappyykhktlowuv.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlaHV5YWFwcHl5a2hrdGxvd3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzOTE1NDMsImV4cCI6MjA1NTk2NzU0M30.4uU-8-NfUjM8V9U9aX0_A1-Lz2N9N9N9N9N9N9N9N9N9")

# Gemini AI Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Playwright Browser Path Override (0 = use bundled Chromium)
PLAYWRIGHT_BROWSERS_PATH = "0"
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = PLAYWRIGHT_BROWSERS_PATH
