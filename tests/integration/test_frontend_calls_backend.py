"""
Integration test: verifies that both services are running and that the
frontend is configured to call the backend directly.

Prerequisites:
  - Both services running via `docker compose up -d`
  - Backend healthy on port 8000
  - Frontend serving on port 3000

Run with:
  pip install requests pytest
  pytest tests/integration/ -v
"""

import requests

BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"


class TestBackendDirect:
    """Sanity checks against the backend API directly."""

    def test_health_endpoint(self):
        resp = requests.get(f"{BACKEND_URL}/api/health", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["service"] == "backend"

    def test_greet_with_name(self):
        resp = requests.get(f"{BACKEND_URL}/api/greet", params={"name": "Alice"}, timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "Hello, Alice! Welcome to Caatch."

    def test_greet_default(self):
        resp = requests.get(f"{BACKEND_URL}/api/greet", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "Hello, World! Welcome to Caatch."


class TestFrontendServesPage:
    """Verifies the frontend is up and configured to call the backend."""

    def test_frontend_serves_html(self):
        """The frontend should serve its main page."""
        resp = requests.get(FRONTEND_URL, timeout=10)
        assert resp.status_code == 200
        assert "text/html" in resp.headers.get("content-type", "")
        assert "Caatch" in resp.text

    def test_frontend_references_backend_url(self):
        """
        The frontend JS bundle should contain the backend URL,
        proving it's configured to call the backend directly.
        """
        resp = requests.get(FRONTEND_URL, timeout=10)
        assert resp.status_code == 200
        assert "localhost:8000" in resp.text
