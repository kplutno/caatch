"""
Integration tests — system / health endpoints.

Prerequisites:
  - Backend running on port 8000 (e.g. via `docker compose up -d`)

Run with:
  pytest tests/integration/ -v
"""

import requests
import pytest

BASE = "http://localhost:8000"


class TestSystem:
    def test_health(self):
        resp = requests.get(f"{BASE}/api/health", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["service"] == "backend"
        assert "build_tag" in data

    def test_greet_with_name(self):
        resp = requests.get(f"{BASE}/api/greet", params={"name": "Caatch"}, timeout=10)
        assert resp.status_code == 200
        assert resp.json()["message"] == "Hello, Caatch! Welcome to Caatch."

    def test_greet_default(self):
        resp = requests.get(f"{BASE}/api/greet", timeout=10)
        assert resp.status_code == 200
        assert resp.json()["message"] == "Hello, World! Welcome to Caatch."
