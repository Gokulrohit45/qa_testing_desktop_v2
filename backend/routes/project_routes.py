import os
import uuid
import json
import base64
from flask import Blueprint, jsonify, request, send_from_directory
from backend.config import USER_DATA_PATH

project_bp = Blueprint("project", __name__)

ASSETS_DIR = os.path.join(USER_DATA_PATH, "assets")
VIDEOS_DIR = os.path.join(USER_DATA_PATH, "face_videos")
os.makedirs(ASSETS_DIR, exist_ok=True)
os.makedirs(VIDEOS_DIR, exist_ok=True)

# In-memory asset store (persisted to disk as JSON)
ASSETS_DB_FILE = os.path.join(USER_DATA_PATH, "assets_db.json")
FACE_AUTH_DB_FILE = os.path.join(USER_DATA_PATH, "face_auth_db.json")


def _load_json(path):
    try:
        if os.path.exists(path):
            with open(path, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_json(path, data):
    try:
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[project_routes] Failed to save {path}: {e}")


# ─────────── PROJECT ASSETS ───────────

@project_bp.route("/api/projects/<project_id>/assets", methods=["GET"])
def list_assets(project_id):
    """List all uploaded assets for a project."""
    db = _load_json(ASSETS_DB_FILE)
    project_assets = db.get(str(project_id), [])
    return jsonify(project_assets), 200


@project_bp.route("/api/projects/<project_id>/assets", methods=["POST"])
def upload_asset(project_id):
    """Upload an asset (file or base64) for a project."""
    db = _load_json(ASSETS_DB_FILE)
    if str(project_id) not in db:
        db[str(project_id)] = []

    asset_id = str(uuid.uuid4())
    asset_dir = os.path.join(ASSETS_DIR, str(project_id))
    os.makedirs(asset_dir, exist_ok=True)

    # Handle multipart file upload
    if request.files.get("file"):
        file = request.files["file"]
        filename = f"{asset_id}_{file.filename}"
        filepath = os.path.join(asset_dir, filename)
        file.save(filepath)
        asset_type = request.form.get("asset_type", "image")
        asset_name = request.form.get("name", file.filename)
        url = f"/uploads/assets/{project_id}/{filename}"

    # Handle JSON body with base64 data
    elif request.is_json:
        data = request.json or {}
        asset_type = data.get("asset_type", "image")
        asset_name = data.get("name", "asset")
        b64_data = data.get("data", "")
        ext = data.get("extension", "png")
        filename = f"{asset_id}.{ext}"
        filepath = os.path.join(asset_dir, filename)
        if b64_data:
            raw = base64.b64decode(b64_data)
            with open(filepath, "wb") as f:
                f.write(raw)
        url = f"/uploads/assets/{project_id}/{filename}"
    else:
        return jsonify({"error": "No file or data provided"}), 400

    asset_record = {
        "id": asset_id,
        "project_id": str(project_id),
        "name": asset_name,
        "asset_type": asset_type,
        "url": url,
        "file_path": filepath,
        "created_at": _timestamp(),
    }

    db[str(project_id)].append(asset_record)
    _save_json(ASSETS_DB_FILE, db)

    return jsonify({"success": True, "asset": asset_record}), 201


@project_bp.route("/api/projects/<project_id>/assets/<asset_id>", methods=["DELETE"])
def delete_asset(project_id, asset_id):
    """Delete an asset for a project."""
    db = _load_json(ASSETS_DB_FILE)
    project_assets = db.get(str(project_id), [])
    
    # Find the asset
    target = next((a for a in project_assets if a.get("id") == asset_id), None)
    
    if target:
        # Remove file from disk
        fp = target.get("file_path", "")
        if fp and os.path.exists(fp):
            try:
                os.remove(fp)
            except Exception:
                pass
        
        # Remove from DB
        db[str(project_id)] = [a for a in project_assets if a.get("id") != asset_id]
        _save_json(ASSETS_DB_FILE, db)
    
    return jsonify({"success": True}), 200


@project_bp.route("/api/assets/<asset_id>/rename", methods=["PUT"])
def rename_asset(asset_id):
    """Rename an asset across all projects."""
    data = request.json or {}
    new_name = data.get("asset_name", "").strip()
    if not new_name:
        return jsonify({"error": "asset_name is required"}), 400

    db = _load_json(ASSETS_DB_FILE)
    found = False
    for project_id, assets in db.items():
        for a in assets:
            if a.get("id") == asset_id:
                a["name"] = new_name
                a["asset_name"] = new_name
                found = True
                break
        if found:
            break

    if found:
        _save_json(ASSETS_DB_FILE, db)

    return jsonify({"success": True, "asset_id": asset_id, "asset_name": new_name}), 200


@project_bp.route("/api/assets/<asset_id>/replace", methods=["POST"])
def replace_asset(asset_id):
    """Replace an asset file (keeping the same metadata)."""
    if not request.files.get("file"):
        return jsonify({"error": "No file provided"}), 400

    db = _load_json(ASSETS_DB_FILE)
    target_asset = None
    for project_id, assets in db.items():
        target_asset = next((a for a in assets if a.get("id") == asset_id), None)
        if target_asset:
            break

    if not target_asset:
        return jsonify({"error": "Asset not found"}), 404

    file = request.files["file"]
    filepath = target_asset.get("file_path", "")
    if filepath:
        # Ensure dir exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        file.save(filepath)

    return jsonify({"success": True}), 200


# ─────────── FACE AUTH ───────────

@project_bp.route("/api/projects/<project_id>/face-auth", methods=["GET"])
def get_face_auth(project_id):
    """Get face authentication config for a project."""
    db = _load_json(FACE_AUTH_DB_FILE)
    config = db.get(str(project_id), {"enabled": False, "video_path": None, "video_url": None})
    return jsonify(config), 200


@project_bp.route("/api/projects/<project_id>/face-auth", methods=["POST"])
def upload_face_auth(project_id):
    """Upload a face video for face authentication."""
    db = _load_json(FACE_AUTH_DB_FILE)
    video_dir = os.path.join(VIDEOS_DIR, str(project_id))
    os.makedirs(video_dir, exist_ok=True)

    if request.files.get("video"):
        video_file = request.files["video"]
        filename = f"face_{project_id}_{video_file.filename}"
        filepath = os.path.join(video_dir, filename)
        video_file.save(filepath)
        video_url = f"/uploads/face_videos/{project_id}/{filename}"
    else:
        return jsonify({"error": "No video file provided"}), 400

    config = {
        "enabled": True,
        "video_path": filepath,
        "video_url": video_url,
        "project_id": str(project_id),
        "updated_at": _timestamp(),
    }
    db[str(project_id)] = config
    _save_json(FACE_AUTH_DB_FILE, db)

    return jsonify({"success": True, "config": config}), 200


@project_bp.route("/api/projects/<project_id>/face-auth", methods=["DELETE"])
def delete_face_auth(project_id):
    """Remove face authentication for a project."""
    db = _load_json(FACE_AUTH_DB_FILE)
    config = db.get(str(project_id), {})
    
    # Remove file from disk
    fp = config.get("video_path", "")
    if fp and os.path.exists(fp):
        try:
            os.remove(fp)
        except Exception:
            pass
    
    db[str(project_id)] = {"enabled": False, "video_path": None, "video_url": None}
    _save_json(FACE_AUTH_DB_FILE, db)

    return jsonify({"success": True}), 200


# ─────────── STATIC ASSET SERVE ───────────

@project_bp.route("/uploads/assets/<project_id>/<path:filename>", methods=["GET"])
def serve_asset(project_id, filename):
    asset_dir = os.path.join(ASSETS_DIR, str(project_id))
    return send_from_directory(asset_dir, filename)


@project_bp.route("/uploads/face_videos/<project_id>/<path:filename>", methods=["GET"])
def serve_face_video(project_id, filename):
    video_dir = os.path.join(VIDEOS_DIR, str(project_id))
    return send_from_directory(video_dir, filename)


def _timestamp():
    from datetime import datetime
    return datetime.utcnow().isoformat() + "Z"
