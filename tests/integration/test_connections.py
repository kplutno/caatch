"""
Integration tests — Connection CRUD and rules endpoints.

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
    type_plurals = {
        "person": "persons",
        "event": "events",
        "place": "places",
        "organization": "organizations",
    }
    plural = type_plurals[entity_type]
    payload = {"name": name, **kwargs}
    resp = requests.post(f"{BASE}/api/{plural}", json=payload, timeout=10)
    resp.raise_for_status()
    return resp.json()


def _create_connection(source_id: str, target_id: str, label: str, **kwargs) -> dict:
    payload = {"source_id": source_id, "target_id": target_id, "label": label, **kwargs}
    resp = requests.post(f"{BASE}/api/connections", json=payload, timeout=10)
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
# Connection CRUD
# ---------------------------------------------------------------------------


class TestConnectionCRUD:
    def test_create_connection_member_of(self):
        person = _create_entity("person", "Member")
        org = _create_entity("organization", "OrgMember")
        conn = _create_connection(person["id"], org["id"], "MEMBER_OF")
        assert conn["label"] == "MEMBER_OF"

    def test_create_connection_attended(self):
        person = _create_entity("person", "Attendee")
        event = _create_entity("event", "Conference")
        conn = _create_connection(person["id"], event["id"], "ATTENDED")
        assert conn["label"] == "ATTENDED"

    def test_create_connection_located_in_person(self):
        person = _create_entity("person", "Located Person")
        place = _create_entity("place", "Located Place")
        conn = _create_connection(person["id"], place["id"], "LOCATED_IN")
        assert conn["label"] == "LOCATED_IN"

    def test_create_connection_organization_located_in(self):
        org = _create_entity("organization", "Located Org")
        place = _create_entity("place", "Org City")
        conn = _create_connection(org["id"], place["id"], "LOCATED_IN")
        assert conn["label"] == "LOCATED_IN"

    def test_create_connection_event_located_in(self):
        event = _create_entity("event", "Located Event")
        place = _create_entity("place", "Event City")
        conn = _create_connection(event["id"], place["id"], "LOCATED_IN")
        assert conn["label"] == "LOCATED_IN"

    def test_create_connection_place_located_in(self):
        city = _create_entity("place", "City")
        country = _create_entity("place", "Country")
        conn = _create_connection(city["id"], country["id"], "LOCATED_IN")
        assert conn["label"] == "LOCATED_IN"

    def test_create_connection_with_description(self):
        person = _create_entity("person", "Desc Person")
        place = _create_entity("place", "Desc Place")
        conn = _create_connection(
            person["id"], place["id"], "LOCATED_IN", description="Moved here in 2022"
        )
        assert conn["description"] == "Moved here in 2022"

    def test_create_connection_with_properties(self):
        person = _create_entity("person", "Props Person")
        place = _create_entity("place", "Props Place")
        conn = _create_connection(
            person["id"],
            place["id"],
            "LOCATED_IN",
            properties={"since": 2022, "primary": True},
        )
        assert conn["properties"]["since"] == 2022

    def test_create_connection_temporal_validation_success(self):
        person = _create_entity("person", "Temp Success Person")
        org = _create_entity("organization", "Temp Success Org")
        conn = _create_connection(
            person["id"],
            org["id"],
            "MEMBER_OF",
            start_time="2018-01-01T00:00:00",
            end_time="2022-01-01T00:00:00",
        )
        assert conn["start_time"] == "2018-01-01T00:00:00"
        assert conn["end_time"] == "2022-01-01T00:00:00"

    def test_create_connection_temporal_validation_failure(self):
        p = _create_entity("person", "Temp Fail P")
        ev = _create_entity("event", "Temp Fail Event")
        resp = requests.post(
            f"{BASE}/api/connections",
            json={
                "source_id": p["id"],
                "target_id": ev["id"],
                "label": "ATTENDED",
                "start_time": "2020-01-01T00:00:00",
            },
            timeout=10,
        )
        assert resp.status_code == 400
        assert "Time information is not allowed" in resp.json()["detail"]

    def test_create_connection_invalid_source_entity(self):
        resp = requests.post(
            f"{BASE}/api/connections",
            json={
                "source_id": str(uuid.uuid4()),
                "target_id": str(uuid.uuid4()),
                "label": "LOCATED_IN",
            },
            timeout=10,
        )
        assert resp.status_code == 400

    def test_create_connection_invalid_label_for_source(self):
        """label MEMBER_OF is not allowed from a 'place' entity."""
        pl = _create_entity("place", "PlaceSrc")
        p = _create_entity("person", "PersonTarget")
        resp = requests.post(
            f"{BASE}/api/connections",
            json={"source_id": pl["id"], "target_id": p["id"], "label": "MEMBER_OF"},
            timeout=10,
        )
        assert resp.status_code == 400
        assert "not allowed" in resp.json()["detail"]

    def test_create_connection_invalid_target_type(self):
        """person LOCATED_IN person is disallowed (target must be a place)."""
        p1 = _create_entity("person", "Src Person")
        p2 = _create_entity("person", "Target Person")
        resp = requests.post(
            f"{BASE}/api/connections",
            json={"source_id": p1["id"], "target_id": p2["id"], "label": "LOCATED_IN"},
            timeout=10,
        )
        assert resp.status_code == 400
        assert "not allowed" in resp.json()["detail"]

    def test_create_connection_bad_payload_returns_422(self):
        resp = requests.post(
            f"{BASE}/api/connections",
            json={"source_id": "bad", "target_id": "bad", "label": 99},
            timeout=10,
        )
        assert resp.status_code == 422

    def test_list_connections_returns_paginated_envelope(self):
        person = _create_entity("person", "List Conn Person")
        place = _create_entity("place", "List Conn Place")
        _create_connection(person["id"], place["id"], "LOCATED_IN")
        resp = requests.get(f"{BASE}/api/connections", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

    def test_delete_connection(self):
        person = _create_entity("person", "Del Conn Person")
        place = _create_entity("place", "Del Conn Place")
        conn = _create_connection(person["id"], place["id"], "LOCATED_IN")
        resp = requests.delete(f"{BASE}/api/connections/{conn['id']}", timeout=10)
        assert resp.status_code == 200
        assert "deleted" in resp.json()["message"].lower()

    def test_delete_connection_not_found(self):
        resp = requests.delete(f"{BASE}/api/connections/{uuid.uuid4()}", timeout=10)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Connection rules
# ---------------------------------------------------------------------------


class TestConnectionRules:
    def test_rules_returns_dict(self):
        resp = requests.get(f"{BASE}/api/connections/rules", timeout=10)
        assert resp.status_code == 200
        rules = resp.json()
        assert isinstance(rules, dict)

    def test_rules_contains_all_entity_types(self):
        resp = requests.get(f"{BASE}/api/connections/rules", timeout=10)
        rules = resp.json()
        for et in ["person", "organization", "place", "event"]:
            assert et in rules, f"Missing entity type '{et}' in rules"

    def test_rules_person_has_expected_labels(self):
        resp = requests.get(f"{BASE}/api/connections/rules", timeout=10)
        person_rules = resp.json()["person"]
        for label in [
            "LOCATED_IN",
            "MEMBER_OF",
            "ATTENDED",
        ]:
            assert label in person_rules, f"Missing label '{label}' for person"

    def test_rules_member_of_only_targets_organization(self):
        resp = requests.get(f"{BASE}/api/connections/rules", timeout=10)
        targets = resp.json()["person"]["MEMBER_OF"]
        assert targets == ["organization"]
