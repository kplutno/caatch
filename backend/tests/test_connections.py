import pytest
import uuid
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_connection_invalid_entities(client: AsyncClient):
    # Verify that we cannot link non-existent entity IDs
    conn_payload = {
        "source_id": str(uuid.uuid4()),
        "target_id": str(uuid.uuid4()),
        "label": "LOCATED_IN",
        "properties": {},
    }
    response = await client.post("/api/connections", json=conn_payload)
    assert response.status_code == 400


async def test_nonexistent_connection_delete_returns_404(client: AsyncClient):
    # Verify delete of nonexistent UUID connection returns 404
    non_existent_uuid = str(uuid.uuid4())
    resp = await client.delete(f"/api/connections/{non_existent_uuid}")
    assert resp.status_code == 404


async def test_create_connection_invalid_body(client: AsyncClient):
    # Verify validation error when payload fields are invalid types
    payload = {
        "source_id": "not-a-uuid",
        "target_id": "not-a-uuid",
        "label": 12345,  # Should be string
    }
    resp = await client.post("/api/connections", json=payload)
    assert resp.status_code == 422


async def test_get_connection_rules(client: AsyncClient):
    resp = await client.get("/api/connections/rules")
    assert resp.status_code == 200
    rules = resp.json()
    assert "person" in rules
    assert "LOCATED_IN" in rules["person"]
    assert "place" in rules["person"]["LOCATED_IN"]


async def test_connection_validation_rules(client: AsyncClient):
    # Create person
    person_resp = await client.post("/api/persons", json={"name": "Alice"})
    p_id = person_resp.json()["id"]

    # Create organization
    org_resp = await client.post("/api/organizations", json={"name": "Org X"})
    org_id = org_resp.json()["id"]

    # 1. Valid link: person MEMBER_OF organization
    valid_conn = {
        "source_id": p_id,
        "target_id": org_id,
        "label": "MEMBER_OF",
        "properties": {},
    }
    resp = await client.post("/api/connections", json=valid_conn)
    assert resp.status_code == 200

    # 2. Invalid link: person MEMBER_OF person (disallowed target type)
    person2_resp = await client.post("/api/persons", json={"name": "Bob"})
    p2_id = person2_resp.json()["id"]
    invalid_conn = {
        "source_id": p_id,
        "target_id": p2_id,
        "label": "MEMBER_OF",
        "properties": {},
    }
    resp = await client.post("/api/connections", json=invalid_conn)
    assert resp.status_code == 400
    assert "are not allowed" in resp.json()["detail"]


async def test_delete_connection_success(client: AsyncClient):
    # Setup connection
    e1 = (await client.post("/api/persons", json={"name": "Alice"})).json()
    e2 = (await client.post("/api/organizations", json={"name": "ACME"})).json()
    conn = (
        await client.post(
            "/api/connections",
            json={
                "source_id": e1["id"],
                "target_id": e2["id"],
                "label": "MEMBER_OF",
            },
        )
    ).json()

    # Delete connection
    resp = await client.delete(f"/api/connections/{conn['id']}")
    assert resp.status_code == 200
    assert resp.json() == {"message": "Connection deleted successfully"}


async def test_read_connections_list(client: AsyncClient):
    """GET /api/connections returns all existing connections."""
    p = (await client.post("/api/persons", json={"name": "P"})).json()
    org = (await client.post("/api/organizations", json={"name": "Org"})).json()

    await client.post(
        "/api/connections",
        json={"source_id": p["id"], "target_id": org["id"], "label": "MEMBER_OF"},
    )

    resp = await client.get("/api/connections")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["label"] == "MEMBER_OF"


async def test_connection_with_description(client: AsyncClient):
    """Connection description field is persisted and returned."""
    p = (await client.post("/api/persons", json={"name": "A"})).json()
    org = (await client.post("/api/organizations", json={"name": "Org"})).json()

    conn = (
        await client.post(
            "/api/connections",
            json={
                "source_id": p["id"],
                "target_id": org["id"],
                "label": "MEMBER_OF",
                "description": "Born and raised here",
            },
        )
    ).json()
    assert conn["description"] == "Born and raised here"


async def test_connection_invalid_labels(client: AsyncClient):
    e1 = (await client.post("/api/persons", json={"name": "Alice"})).json()
    e2 = (await client.post("/api/organizations", json={"name": "Org X"})).json()

    # Try invalid connection label from person to organization
    invalid_conn = {
        "source_id": e1["id"],
        "target_id": e2["id"],
        "label": "LOCATED_IN",  # Person cannot LOCATED_IN an Organization
        "properties": {},
    }
    resp = await client.post("/api/connections", json=invalid_conn)
    assert resp.status_code == 400


async def test_connection_invalid_label_for_source_type(client: AsyncClient):
    """A label not defined for the source type should return 400."""
    pl = (await client.post("/api/places", json={"name": "X"})).json()
    p = (await client.post("/api/persons", json={"name": "Y"})).json()

    # 'place' type does not support MEMBER_OF label — MEMBER_OF should be rejected
    resp = await client.post(
        "/api/connections",
        json={"source_id": pl["id"], "target_id": p["id"], "label": "MEMBER_OF"},
    )
    assert resp.status_code == 400
    assert "not allowed" in resp.json()["detail"]


async def test_connection_attended_person_to_event(client: AsyncClient):
    """person ATTENDED event is a valid connection."""
    p = (await client.post("/api/persons", json={"name": "Frank"})).json()
    ev = (await client.post("/api/events", json={"name": "Summit"})).json()

    resp = await client.post(
        "/api/connections",
        json={"source_id": p["id"], "target_id": ev["id"], "label": "ATTENDED"},
    )
    assert resp.status_code == 200


async def test_connection_organization_located_in_place(client: AsyncClient):
    """organization LOCATED_IN place is a valid connection."""
    org = (await client.post("/api/organizations", json={"name": "ACME Corp"})).json()
    place = (await client.post("/api/places", json={"name": "New York"})).json()

    resp = await client.post(
        "/api/connections",
        json={"source_id": org["id"], "target_id": place["id"], "label": "LOCATED_IN"},
    )
    assert resp.status_code == 200


async def test_connection_event_located_in_place(client: AsyncClient):
    """event LOCATED_IN place is a valid connection."""
    ev = (await client.post("/api/events", json={"name": "Conference"})).json()
    place = (await client.post("/api/places", json={"name": "Berlin"})).json()

    resp = await client.post(
        "/api/connections",
        json={"source_id": ev["id"], "target_id": place["id"], "label": "LOCATED_IN"},
    )
    assert resp.status_code == 200


async def test_connection_temporal_validation_success(client: AsyncClient):
    """MEMBER_OF allows start_time and end_time."""
    p = (await client.post("/api/persons", json={"name": "Alice"})).json()
    org = (await client.post("/api/organizations", json={"name": "ACME"})).json()

    resp = await client.post(
        "/api/connections",
        json={
            "source_id": p["id"],
            "target_id": org["id"],
            "label": "MEMBER_OF",
            "start_time": "2020-01-01T00:00:00",
            "end_time": "2024-01-01T00:00:00",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["start_time"] == "2020-01-01T00:00:00"
    assert data["end_time"] == "2024-01-01T00:00:00"


async def test_connection_temporal_validation_failure(client: AsyncClient):
    """ATTENDED does not allow start_time or end_time."""
    p = (await client.post("/api/persons", json={"name": "Bob"})).json()
    ev = (await client.post("/api/events", json={"name": "Summit"})).json()

    resp = await client.post(
        "/api/connections",
        json={
            "source_id": p["id"],
            "target_id": ev["id"],
            "label": "ATTENDED",
            "start_time": "2020-01-01T00:00:00",
        },
    )
    assert resp.status_code == 400
    assert "Time information is not allowed" in resp.json()["detail"]
