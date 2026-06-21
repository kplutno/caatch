import pytest
import uuid
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_connection_invalid_entities(client: AsyncClient):
    # Verify that we cannot link non-existent entity IDs
    conn_payload = {
        "source_id": str(uuid.uuid4()),
        "target_id": str(uuid.uuid4()),
        "label": "KNOWS",
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
    assert "KNOWS" in rules["person"]
    assert "person" in rules["person"]["KNOWS"]


async def test_connection_validation_rules(client: AsyncClient):
    # Create person
    person_resp = await client.post(
        "/api/entities", json={"name": "Alice", "type": "person"}
    )
    p_id = person_resp.json()["id"]

    # Create place
    place_resp = await client.post(
        "/api/entities", json={"name": "Paris", "type": "place"}
    )
    pl_id = place_resp.json()["id"]

    # 1. Valid link: person LIVES_IN place
    valid_conn = {
        "source_id": p_id,
        "target_id": pl_id,
        "label": "LIVES_IN",
        "properties": {},
    }
    resp = await client.post("/api/connections", json=valid_conn)
    assert resp.status_code == 200

    # 2. Invalid link: person LIVES_IN person (disallowed target type)
    person2_resp = await client.post(
        "/api/entities", json={"name": "Bob", "type": "person"}
    )
    p2_id = person2_resp.json()["id"]
    invalid_conn = {
        "source_id": p_id,
        "target_id": p2_id,
        "label": "LIVES_IN",
        "properties": {},
    }
    resp = await client.post("/api/connections", json=invalid_conn)
    assert resp.status_code == 400
    assert "are not allowed" in resp.json()["detail"]


async def test_delete_connection_success(client: AsyncClient):
    # Setup connection
    e1 = (
        await client.post("/api/entities", json={"name": "Alice", "type": "person"})
    ).json()
    e2 = (
        await client.post("/api/entities", json={"name": "Paris", "type": "place"})
    ).json()
    conn = (
        await client.post(
            "/api/connections",
            json={"source_id": e1["id"], "target_id": e2["id"], "label": "LIVES_IN"},
        )
    ).json()

    # Delete connection
    resp = await client.delete(f"/api/connections/{conn['id']}")
    assert resp.status_code == 200
    assert resp.json() == {"message": "Connection deleted successfully"}


async def test_read_connections_list(client: AsyncClient):
    """GET /api/connections returns all existing connections."""
    p = (
        await client.post("/api/entities", json={"name": "P", "type": "person"})
    ).json()
    pl = (
        await client.post("/api/entities", json={"name": "PL", "type": "place"})
    ).json()

    await client.post(
        "/api/connections",
        json={"source_id": p["id"], "target_id": pl["id"], "label": "LIVES_IN"},
    )

    resp = await client.get("/api/connections")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["label"] == "LIVES_IN"


async def test_connection_with_description(client: AsyncClient):
    """Connection description field is persisted and returned."""
    p = (
        await client.post("/api/entities", json={"name": "A", "type": "person"})
    ).json()
    pl = (
        await client.post("/api/entities", json={"name": "B", "type": "place"})
    ).json()

    conn = (
        await client.post(
            "/api/connections",
            json={
                "source_id": p["id"],
                "target_id": pl["id"],
                "label": "LIVES_IN",
                "description": "Born and raised here",
            },
        )
    ).json()
    assert conn["description"] == "Born and raised here"


async def test_connection_invalid_labels(client: AsyncClient):
    e1 = (
        await client.post("/api/entities", json={"name": "Alice", "type": "person"})
    ).json()
    e2 = (
        await client.post(
            "/api/entities", json={"name": "Org X", "type": "organization"}
        )
    ).json()

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
    pl = (
        await client.post("/api/entities", json={"name": "X", "type": "place"})
    ).json()
    p = (
        await client.post("/api/entities", json={"name": "Y", "type": "person"})
    ).json()

    # 'place' type does not support KNOWS label — KNOWS should be rejected
    resp = await client.post(
        "/api/connections",
        json={"source_id": pl["id"], "target_id": p["id"], "label": "KNOWS"},
    )
    assert resp.status_code == 400
    assert "not allowed" in resp.json()["detail"]


async def test_connection_knows_person_to_person(client: AsyncClient):
    """person KNOWS person is a valid connection."""
    p1 = (
        await client.post("/api/entities", json={"name": "Bob", "type": "person"})
    ).json()
    p2 = (
        await client.post("/api/entities", json={"name": "Carol", "type": "person"})
    ).json()

    resp = await client.post(
        "/api/connections",
        json={"source_id": p1["id"], "target_id": p2["id"], "label": "KNOWS"},
    )
    assert resp.status_code == 200
    assert resp.json()["label"] == "KNOWS"


async def test_connection_works_with_person_to_person(client: AsyncClient):
    """person WORKS_WITH person is a valid connection."""
    p1 = (
        await client.post("/api/entities", json={"name": "Dave", "type": "person"})
    ).json()
    p2 = (
        await client.post("/api/entities", json={"name": "Eve", "type": "person"})
    ).json()

    resp = await client.post(
        "/api/connections",
        json={"source_id": p1["id"], "target_id": p2["id"], "label": "WORKS_WITH"},
    )
    assert resp.status_code == 200


async def test_connection_attended_person_to_event(client: AsyncClient):
    """person ATTENDED event is a valid connection."""
    p = (
        await client.post("/api/entities", json={"name": "Frank", "type": "person"})
    ).json()
    ev = (
        await client.post("/api/entities", json={"name": "Summit", "type": "event"})
    ).json()

    resp = await client.post(
        "/api/connections",
        json={"source_id": p["id"], "target_id": ev["id"], "label": "ATTENDED"},
    )
    assert resp.status_code == 200


async def test_connection_participated_in_person_to_event(client: AsyncClient):
    """person PARTICIPATED_IN event is a valid connection."""
    p = (
        await client.post("/api/entities", json={"name": "Grace", "type": "person"})
    ).json()
    ev = (
        await client.post("/api/entities", json={"name": "Marathon", "type": "event"})
    ).json()

    resp = await client.post(
        "/api/connections",
        json={"source_id": p["id"], "target_id": ev["id"], "label": "PARTICIPATED_IN"},
    )
    assert resp.status_code == 200


async def test_connection_organization_located_in_place(client: AsyncClient):
    """organization LOCATED_IN place is a valid connection."""
    org = (
        await client.post(
            "/api/entities", json={"name": "ACME Corp", "type": "organization"}
        )
    ).json()
    place = (
        await client.post("/api/entities", json={"name": "New York", "type": "place"})
    ).json()

    resp = await client.post(
        "/api/connections",
        json={"source_id": org["id"], "target_id": place["id"], "label": "LOCATED_IN"},
    )
    assert resp.status_code == 200


async def test_connection_event_located_in_place(client: AsyncClient):
    """event LOCATED_IN place is a valid connection."""
    ev = (
        await client.post("/api/entities", json={"name": "Conference", "type": "event"})
    ).json()
    place = (
        await client.post("/api/entities", json={"name": "Berlin", "type": "place"})
    ).json()

    resp = await client.post(
        "/api/connections",
        json={"source_id": ev["id"], "target_id": place["id"], "label": "LOCATED_IN"},
    )
    assert resp.status_code == 200


async def test_connection_other_entity_other_label(client: AsyncClient):
    """entity of type 'person' can use label OTHER."""
    p1 = (
        await client.post("/api/entities", json={"name": "X", "type": "person"})
    ).json()
    p2 = (
        await client.post("/api/entities", json={"name": "Y", "type": "person"})
    ).json()

    resp = await client.post(
        "/api/connections",
        json={"source_id": p1["id"], "target_id": p2["id"], "label": "OTHER"},
    )
    assert resp.status_code == 200
