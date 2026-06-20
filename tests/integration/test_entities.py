"""
Integration tests — Entity CRUD endpoints.

Prerequisites:
  - Backend running on port 8000 (e.g. via `docker compose up -d`)

Run with:
  pytest tests/integration/ -v
"""

import uuid
import requests

BASE = "http://localhost:8000"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_entity(entity_type: str, name: str, **kwargs) -> dict:
    payload = {"name": name, "type": entity_type, **kwargs}
    resp = requests.post(f"{BASE}/api/entities", json=payload, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _create_connection(source_id: str, target_id: str, label: str, **kwargs) -> dict:
    payload = {"source_id": source_id, "target_id": target_id, "label": label, **kwargs}
    resp = requests.post(f"{BASE}/api/connections", json=payload, timeout=10)
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestEntityCRUD:
    def test_create_person(self):
        data = _create_entity(
            "person", "Integration Person", description="A test person"
        )
        assert data["type"] == "person"
        assert data["name"] == "Integration Person"
        assert data["description"] == "A test person"
        assert "id" in data

    def test_create_organization(self):
        data = _create_entity("organization", "Acme Ltd")
        assert data["type"] == "organization"

    def test_create_place(self):
        data = _create_entity("place", "Warsaw")
        assert data["type"] == "place"

    def test_create_event(self):
        data = _create_entity("event", "Tech Summit 2025")
        assert data["type"] == "event"

    def test_create_other(self):
        data = _create_entity("other", "Unknown Thing")
        assert data["type"] == "other"

    def test_create_entity_with_nested_properties(self):
        props = {
            "tags": ["politics", "media"],
            "coordinates": {"lat": 52.23, "lng": 21.01},
            "importance": 9,
        }
        data = _create_entity("place", "Capital City", properties=props)
        assert data["properties"]["tags"] == ["politics", "media"]
        assert data["properties"]["coordinates"]["lat"] == 52.23
        assert data["properties"]["importance"] == 9

    def test_create_entity_minimal_fields(self):
        """name and type are the only required fields."""
        data = _create_entity("other", "Minimal")
        assert data["description"] is None
        assert data["properties"] == {}

    def test_create_entity_invalid_type_returns_422(self):
        resp = requests.post(
            f"{BASE}/api/entities",
            json={"name": "Bad", "type": "alien"},
            timeout=10,
        )
        assert resp.status_code == 422

    def test_read_entity_by_id(self):
        created = _create_entity("person", "Read Me")
        resp = requests.get(f"{BASE}/api/entities/{created['id']}", timeout=10)
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_read_entity_not_found(self):
        resp = requests.get(f"{BASE}/api/entities/{uuid.uuid4()}", timeout=10)
        assert resp.status_code == 404

    def test_read_entity_invalid_uuid(self):
        resp = requests.get(f"{BASE}/api/entities/not-a-uuid", timeout=10)
        assert resp.status_code == 422

    def test_list_entities_returns_paginated_envelope(self):
        _create_entity("event", "Listed Event")
        resp = requests.get(f"{BASE}/api/entities", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

    def test_filter_entities_by_type(self):
        unique_name = f"UniqueOrg-{uuid.uuid4()}"
        created = _create_entity("organization", unique_name)
        resp = requests.get(
            f"{BASE}/api/entities", params={"type": "organization"}, timeout=10
        )
        assert resp.status_code == 200
        ids = [e["id"] for e in resp.json()["items"]]
        assert created["id"] in ids
        assert all(e["type"] == "organization" for e in resp.json()["items"])

    def test_update_entity(self):
        created = _create_entity("person", "Old Name")
        update_payload = {
            "name": "New Name",
            "type": "person",
            "description": "Updated",
            "properties": {"updated": True},
        }
        resp = requests.put(
            f"{BASE}/api/entities/{created['id']}", json=update_payload, timeout=10
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "New Name"
        assert data["description"] == "Updated"
        assert data["properties"]["updated"] is True

    def test_update_entity_not_found(self):
        resp = requests.put(
            f"{BASE}/api/entities/{uuid.uuid4()}",
            json={"name": "X", "type": "person"},
            timeout=10,
        )
        assert resp.status_code == 404

    def test_delete_entity(self):
        created = _create_entity("other", "Delete Me")
        del_resp = requests.delete(f"{BASE}/api/entities/{created['id']}", timeout=10)
        assert del_resp.status_code == 200
        assert "deleted" in del_resp.json()["message"].lower()

        # Confirm it's gone
        get_resp = requests.get(f"{BASE}/api/entities/{created['id']}", timeout=10)
        assert get_resp.status_code == 404

    def test_delete_entity_not_found(self):
        resp = requests.delete(f"{BASE}/api/entities/{uuid.uuid4()}", timeout=10)
        assert resp.status_code == 404

    def test_delete_entity_cascades_connections(self):
        """Deleting an entity must also remove its connections."""
        place = _create_entity("place", "Cascade Place")
        person = _create_entity("person", "Cascade Person")
        conn = _create_connection(person["id"], place["id"], "LIVES_IN")

        requests.delete(f"{BASE}/api/entities/{place['id']}", timeout=10)

        # The connection should no longer exist
        resp = requests.get(f"{BASE}/api/connections", timeout=10)
        conn_ids = [c["id"] for c in resp.json()["items"]]
        assert conn["id"] not in conn_ids
