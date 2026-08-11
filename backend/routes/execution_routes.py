import os
import uuid
import threading
import time
from flask import Blueprint, jsonify, request
from backend.config import USER_DATA_PATH
from backend.core.playwright_runner import execute_playwright_test

execution_bp = Blueprint("execution", __name__)

# In-memory stores for active runs, logs, and status
ACTIVE_RUNS = {}
EXECUTION_LOGS = {}
EXECUTION_STATUS = {}
CANCELLED_RUNS = set()


@execution_bp.route("/api/execute", methods=["POST"])
def execute_test():
    """Start a Playwright test execution asynchronously."""
    data = request.json or {}

    # Support both payload formats from frontend
    test_case = data.get("test_case", {})
    project = data.get("project", {})

    # Also support flat format (projectId, testId, steps)
    if not test_case and "steps" in data:
        test_case = {
            "id": data.get("testId", ""),
            "steps": data.get("steps", []),
        }
    if not project and "projectId" in data:
        project = {
            "id": data.get("projectId", ""),
            "target_url": data.get("targetUrl", "https://automationexercise.com"),
            "face_auth_enabled": data.get("faceAuthEnabled", False),
            "face_video_path": data.get("faceVideoPath", ""),
        }

    exec_id = str(uuid.uuid4())
    ss_dir = os.path.join(USER_DATA_PATH, "screenshots")
    up_dir = os.path.join(USER_DATA_PATH, "uploads")
    os.makedirs(ss_dir, exist_ok=True)
    os.makedirs(up_dir, exist_ok=True)

    # Initialize execution log store
    EXECUTION_LOGS[exec_id] = []
    EXECUTION_STATUS[exec_id] = {"status": "Running", "logs": [], "duration": 0}

    def step_callback(step_log):
        """Called after each step completes to stream live updates."""
        if exec_id not in EXECUTION_LOGS:
            EXECUTION_LOGS[exec_id] = []
        EXECUTION_LOGS[exec_id].append(step_log)
        EXECUTION_STATUS[exec_id]["logs"] = EXECUTION_LOGS[exec_id]

    def run_target():
        if exec_id in CANCELLED_RUNS:
            return
        try:
            res = execute_playwright_test(
                exec_id, test_case, project, ss_dir, up_dir, callback_fn=step_callback
            )
            ACTIVE_RUNS[exec_id] = res
            EXECUTION_STATUS[exec_id] = {
                "id": exec_id,
                "status": res.get("status", "Failed"),
                "duration": res.get("duration", 0),
                "logs": res.get("logs", []),
                "error": res.get("error"),
            }
        except Exception as e:
            EXECUTION_STATUS[exec_id] = {
                "id": exec_id,
                "status": "Failed",
                "duration": 0,
                "logs": [],
                "error": str(e),
            }

    t = threading.Thread(target=run_target, daemon=True)
    t.start()

    # Return camelCase to match frontend expectation
    return jsonify({
        "executionId": exec_id,    # camelCase for frontend
        "execution_id": exec_id,   # snake_case for compatibility
        "status": "Running",
        "message": "Test execution started"
    }), 202


@execution_bp.route("/api/executions/<exec_id>/status", methods=["GET"])
def get_status(exec_id):
    """Poll execution status (Running/Passed/Failed)."""
    if exec_id in EXECUTION_STATUS:
        return jsonify(EXECUTION_STATUS[exec_id]), 200
    return jsonify({"id": exec_id, "status": "Running", "logs": []}), 200


@execution_bp.route("/api/executions/<exec_id>/logs", methods=["GET"])
def get_logs(exec_id):
    """Stream execution logs for live step display."""
    logs = EXECUTION_LOGS.get(exec_id, [])
    # Format logs to match frontend expectation
    formatted = []
    for i, log in enumerate(logs):
        formatted.append({
            "id": f"{exec_id}_step_{i+1}",
            "step_number": log.get("step", i + 1),
            "action": log.get("action", ""),
            "raw_command": f"{log.get('action', '')} {log.get('target', '')}",
            "status": "passed" if log.get("status") == "Passed" else "failed",
            "duration_ms": int((log.get("duration", 0)) * 1000),
            "screenshot_url": log.get("screenshot", None),
            "error_message": log.get("error", None),
            "created_at": None,
        })
    return jsonify(formatted), 200


@execution_bp.route("/api/executions/<exec_id>/telemetry", methods=["GET"])
def get_telemetry(exec_id):
    """Return OTEL telemetry data for the execution."""
    status = EXECUTION_STATUS.get(exec_id, {})
    logs = EXECUTION_LOGS.get(exec_id, [])
    
    total_steps = len(logs)
    passed_steps = sum(1 for l in logs if l.get("status") == "Passed")
    failed_steps = total_steps - passed_steps
    total_duration = sum(l.get("duration", 0) for l in logs)
    
    spans = []
    for i, log in enumerate(logs):
        spans.append({
            "span_id": f"span_{exec_id}_{i}",
            "name": f"step_{i+1}.{log.get('action', 'unknown')}",
            "status": "OK" if log.get("status") == "Passed" else "ERROR",
            "duration_ms": int(log.get("duration", 0) * 1000),
            "attributes": {
                "action": log.get("action", ""),
                "target": log.get("target", ""),
                "value": log.get("value", ""),
            },
            "error": log.get("error"),
        })
    
    return jsonify({
        "execution_id": exec_id,
        "status": status.get("status", "Running"),
        "total_steps": total_steps,
        "passed_steps": passed_steps,
        "failed_steps": failed_steps,
        "total_duration_ms": int(total_duration * 1000),
        "spans": spans,
    }), 200


@execution_bp.route("/api/cancel", methods=["POST"])
def cancel_execution():
    """Cancel a running execution."""
    data = request.json or {}
    exec_id = data.get("executionId") or data.get("execution_id", "")
    
    if exec_id:
        CANCELLED_RUNS.add(exec_id)
        if exec_id in EXECUTION_STATUS:
            EXECUTION_STATUS[exec_id]["status"] = "Failed"
    
    return jsonify({"success": True, "message": f"Execution {exec_id} cancelled"}), 200
