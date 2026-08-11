import os
import sys

# Ensure backend package root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from flask_cors import CORS
from backend.config import PORT
from backend.routes.health_routes import health_bp
from backend.routes.execution_routes import execution_bp
from backend.routes.asset_routes import asset_bp

app = Flask(__name__)
CORS(app)

# Register Modular Blueprints
app.register_blueprint(health_bp)
app.register_blueprint(execution_bp)
app.register_blueprint(asset_bp)

if __name__ == "__main__":
    print(f"[QA-AI Backend V2] Starting Flask Engine on http://localhost:{PORT} ...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
