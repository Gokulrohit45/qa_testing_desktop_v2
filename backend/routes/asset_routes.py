import os
from flask import Blueprint, send_from_directory, jsonify
from backend.config import USER_DATA_PATH

asset_bp = Blueprint("asset", __name__)

@asset_bp.route("/uploads/screenshots/<path:filename>", methods=["GET"])
def get_screenshot(filename):
    ss_dir = os.path.join(USER_DATA_PATH, "screenshots")
    return send_from_directory(ss_dir, filename)

@asset_bp.route("/uploads/assets/<path:filename>", methods=["GET"])
def get_asset(filename):
    up_dir = os.path.join(USER_DATA_PATH, "uploads")
    return send_from_directory(up_dir, filename)
