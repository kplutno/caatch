"""
Integration tests — Users endpoint.

Prerequisites:
  - Backend running on port 8000 (e.g. via `docker compose up -d`)

Run with:
  pytest tests/integration/ -v
"""

import uuid
import requests

BASE = "http://localhost:8000"


class TestUsers:
    def test_create_user(self):
        unique_email = f"user-{uuid.uuid4()}@test.com"
        resp = requests.post(
            f"{BASE}/api/users",
            json={"name": "Test User", "email": unique_email},
            timeout=10,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test User"
        assert data["email"] == unique_email
        assert "id" in data

    def test_create_duplicate_user_email_returns_400(self):
        unique_email = f"dup-{uuid.uuid4()}@test.com"
        requests.post(
            f"{BASE}/api/users",
            json={"name": "First", "email": unique_email},
            timeout=10,
        ).raise_for_status()
        resp = requests.post(
            f"{BASE}/api/users",
            json={"name": "Second", "email": unique_email},
            timeout=10,
        )
        assert resp.status_code == 400
        assert "Email already exists" in resp.json()["detail"]

    def test_list_users(self):
        unique_email = f"list-{uuid.uuid4()}@test.com"
        requests.post(
            f"{BASE}/api/users",
            json={"name": "Listed User", "email": unique_email},
            timeout=10,
        ).raise_for_status()
        resp = requests.get(f"{BASE}/api/users", timeout=10)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        emails = [u["email"] for u in resp.json()]
        assert unique_email in emails
