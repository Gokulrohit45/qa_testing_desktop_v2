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
from backend.routes.project_routes import project_bp
from backend.routes.translate_routes import translate_bp
from backend.routes.testcase_routes import testcase_bp

app = Flask(__name__)
CORS(app)

# Register Modular Blueprints
app.register_blueprint(health_bp)
app.register_blueprint(execution_bp)
app.register_blueprint(asset_bp)
app.register_blueprint(project_bp)
app.register_blueprint(translate_bp)
app.register_blueprint(testcase_bp)

if __name__ == "__main__":
    print(f"[QA-AI Backend V2] Starting Flask Engine on http://localhost:{PORT} ...")
    app.run(host="0.0.0.0", port=PORT, debug=False)
