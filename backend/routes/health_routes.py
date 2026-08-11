import os
import sys
from flask import Blueprint, jsonify, request

health_bp = Blueprint("health", __name__)

@health_bp.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "QA-AI Platform Modular Backend",
        "engine": "Playwright + Supabase Cloud",
        "version": "2.0.0"
    }), 200

@health_bp.route("/api/shutdown", methods=["POST"])
def shutdown():
    func = request.environ.get("werkzeug.server.shutdown")
    if func is not None:
        func()
    else:
        os._exit(0)
    return jsonify({"status": "shutdown_initiated"}), 200
