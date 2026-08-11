import os
import uuid
import threading
import json
from flask import Blueprint, jsonify, request
from backend.config import USER_DATA_PATH, GEMINI_API_KEY

translate_bp = Blueprint("translate", __name__)

ACTIVE_RUNS = {}
EXECUTION_LOGS = {}
EXECUTION_STATUS = {}

@translate_bp.route("/api/translate", methods=["POST"])
def translate_commands():
    """Translate plain English commands to Playwright JSON steps using Gemini AI."""
    data = request.json or {}
    commands = data.get("commands", "")
    
    if not commands:
        return jsonify({"error": "No commands provided"}), 400
    
    steps = []
    
    # Try Gemini AI translation first
    if GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            prompt = f"""Convert these plain English test steps into a JSON array of Playwright automation steps.
Each step must have: "action" (fill/click/navigate/wait/verify/select/hover), "target" (CSS selector or text), "value" (for fill actions).

Return ONLY valid JSON array, no explanation, no markdown.

Steps to convert:
{commands}

Example output format:
[
  {{"action": "navigate", "target": "https://example.com"}},
  {{"action": "fill", "target": "#email", "value": "user@test.com"}},
  {{"action": "click", "target": "button[type=submit]"}}
]"""
            
            response = model.generate_content(prompt)
            raw = response.text.strip()
            # Clean markdown code blocks if present
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            
            parsed = json.loads(raw)
            return jsonify({"success": True, "steps": parsed, "source": "gemini"})
        except Exception as e:
            print(f"[Gemini] Translation failed: {e}")
    
    # Fallback: simple rule-based parser
    lines = commands.strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        lower = line.lower()
        
        if any(kw in lower for kw in ['navigate', 'go to', 'open', 'visit']):
            parts = line.split(' ')
            url = next((p for p in parts if p.startswith('http')), 'https://example.com')
            steps.append({"action": "navigate", "target": url})
        elif any(kw in lower for kw in ['click', 'press', 'tap', 'submit']):
            target = line.lower().replace('click', '').replace('press', '').replace('tap', '').strip()
            steps.append({"action": "click", "target": target or "button"})
        elif any(kw in lower for kw in ['fill', 'type', 'enter', 'input']):
            parts = line.split('with')
            value = parts[1].strip().strip('"\'') if len(parts) > 1 else 'test_value'
            target_part = parts[0].replace('fill', '').replace('type', '').replace('enter', '').replace('in', '').replace('into', '').strip()
            steps.append({"action": "fill", "target": target_part or "input", "value": value})
        elif any(kw in lower for kw in ['wait', 'pause', 'sleep']):
            import re
            nums = re.findall(r'\d+', line)
            seconds = nums[0] if nums else '1'
            steps.append({"action": "wait", "target": "", "value": seconds})
        elif any(kw in lower for kw in ['verify', 'assert', 'check', 'confirm', 'see', 'expect']):
            target = line.lower().replace('verify', '').replace('assert', '').replace('check', '').replace('confirm', '').replace('see', '').replace('expect', '').strip()
            steps.append({"action": "verify", "target": target})
        else:
            steps.append({"action": "click", "target": line})
    
    return jsonify({"success": True, "steps": steps, "source": "fallback"})
