import os
import uuid
import threading
from flask import Blueprint, jsonify, request
from backend.config import USER_DATA_PATH
from backend.core.playwright_runner import execute_playwright_test

execution_bp = Blueprint("execution", __name__)

ACTIVE_RUNS = {}

@execution_bp.route("/api/execute", methods=["POST"])
def execute_test():
    data = request.json or {}
    test_case = data.get("test_case", {})
    project = data.get("project", {})

    exec_id = str(uuid.uuid4())
    ss_dir = os.path.join(USER_DATA_PATH, "screenshots")
    up_dir = os.path.join(USER_DATA_PATH, "uploads")
    os.makedirs(ss_dir, exist_ok=True)
    os.makedirs(up_dir, exist_ok=True)

    def run_target():
        res = execute_playwright_test(exec_id, test_case, project, ss_dir, up_dir)
        ACTIVE_RUNS[exec_id] = res

    t = threading.Thread(target=run_target, daemon=True)
    t.start()

    return jsonify({
        "execution_id": exec_id,
        "status": "Running",
        "message": "Test execution started asynchronously"
    }), 202

@execution_bp.route("/api/executions/<exec_id>/status", methods=["GET"])
def get_status(exec_id):
    if exec_id in ACTIVE_RUNS:
        return jsonify(ACTIVE_RUNS[exec_id]), 200
    return jsonify({"status": "Running", "logs": []}), 200
