import os
import json
import uuid
from flask import Blueprint, jsonify, request
from backend.config import USER_DATA_PATH

testcase_bp = Blueprint("testcase", __name__)

# Persist test cases to disk
TC_DB_FILE = os.path.join(USER_DATA_PATH, "test_cases_db.json")


def _load_db():
    try:
        if os.path.exists(TC_DB_FILE):
            with open(TC_DB_FILE, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return []


def _save_db(data):
    try:
        with open(TC_DB_FILE, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[testcase_routes] Failed to save DB: {e}")


def _timestamp():
    from datetime import datetime
    return datetime.utcnow().isoformat() + "Z"


@testcase_bp.route("/api/test-cases", methods=["GET"])
def list_test_cases():
    """List all test cases, optionally filtered by project_id."""
    db = _load_db()
    project_id = request.args.get("project_id")
    if project_id:
        db = [tc for tc in db if str(tc.get("project_id", "")) == str(project_id)]
    return jsonify(db), 200


@testcase_bp.route("/api/test-cases", methods=["POST"])
def create_test_case():
    """Create a new test case."""
    data = request.json or {}
    db = _load_db()

    # Parse cached_json if it comes in as a raw dict/list (from translate endpoint)
    cached_json = data.get("cached_json")
    if isinstance(cached_json, (dict, list)):
        # Normalize: if dict with 'steps' key unwrap it
        if isinstance(cached_json, dict) and "steps" in cached_json:
            cached_json = cached_json["steps"]
    elif isinstance(cached_json, str):
        try:
            parsed = json.loads(cached_json)
            if isinstance(parsed, dict) and "steps" in parsed:
                cached_json = parsed["steps"]
            else:
                cached_json = parsed
        except Exception:
            cached_json = []

    tc = {
        "id": data.get("id") or f"tc_{uuid.uuid4().hex[:8]}",
        "project_id": str(data.get("project_id", "")),
        "name": data.get("name", "Untitled Test"),
        "type": data.get("type", "txt"),
        "commands": data.get("commands", ""),
        "cached_json": cached_json or [],
        "status": "pending",
        "created_at": _timestamp(),
        "updated_at": _timestamp(),
    }

    db.insert(0, tc)
    _save_db(db)
    return jsonify(tc), 201


@testcase_bp.route("/api/test-cases/<tc_id>", methods=["GET"])
def get_test_case(tc_id):
    db = _load_db()
    tc = next((t for t in db if str(t.get("id")) == str(tc_id)), None)
    if not tc:
        return jsonify({"error": "Test case not found"}), 404
    return jsonify(tc), 200


@testcase_bp.route("/api/test-cases/<tc_id>", methods=["PUT"])
def update_test_case(tc_id):
    """Update an existing test case (commands, cached_json, name)."""
    data = request.json or {}
    db = _load_db()

    idx = next((i for i, t in enumerate(db) if str(t.get("id")) == str(tc_id)), None)
    if idx is None:
        return jsonify({"error": "Test case not found"}), 404

    tc = db[idx]

    # Update fields
    for field in ["name", "commands", "type"]:
        if field in data:
            tc[field] = data[field]

    cached_json = data.get("cached_json")
    if cached_json is not None:
        if isinstance(cached_json, str):
            try:
                cached_json = json.loads(cached_json)
            except Exception:
                cached_json = []
        if isinstance(cached_json, dict) and "steps" in cached_json:
            cached_json = cached_json["steps"]
        tc["cached_json"] = cached_json

    tc["updated_at"] = _timestamp()
    db[idx] = tc
    _save_db(db)
    return jsonify(tc), 200


@testcase_bp.route("/api/test-cases/<tc_id>", methods=["DELETE"])
def delete_test_case(tc_id):
    db = _load_db()
    original_len = len(db)
    db = [t for t in db if str(t.get("id")) != str(tc_id)]
    if len(db) < original_len:
        _save_db(db)
    return jsonify({"success": True}), 200
