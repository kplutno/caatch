import pytest
import uuid
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_create_and_read_entity(client: AsyncClient):
    # 1. Create a Person entity
    payload = {
        "name": "Jane Doe",
        "type": "person",
        "description": "A prominent politician",
        "properties": {"party": "Independent", "age": "45"},
    }
    create_resp = await client.post("/api/entities", json=payload)
    assert create_resp.status_code == 200
    entity_data = create_resp.json()
    assert entity_data["name"] == "Jane Doe"
    assert entity_data["type"] == "person"
    assert "id" in entity_data

    # 2. Query all entities
    get_resp = await client.get("/api/entities")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == entity_data["id"]


async def test_invalid_entity_type(client: AsyncClient):
    # Verify that the Enum validator rejects invalid entity types
    payload = {
        "name": "Invalid Node",
        "type": "alien",  # Not in EntityType Enum
        "description": "Should fail",
        "properties": {},
    }
    response = await client.post("/api/entities", json=payload)
    assert response.status_code == 422  # Validation Error


async def test_create_entity_missing_fields(client: AsyncClient):
    # Missing description and properties (should default to empty dict and None)
    payload = {"name": "Minimalist Organization", "type": "organization"}
    resp = await client.post("/api/entities", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Minimalist Organization"
    assert data["description"] is None
    assert data["properties"] == {}


async def test_create_entity_with_detailed_properties(client: AsyncClient):
    # Verify entity creation with full properties JSON works as expected
    payload = {
        "name": "Detailed Event",
        "type": "event",
        "description": "An event with deep metadata",
        "properties": {
            "tags": ["election", "debate"],
            "location": {"coordinates": [52.2297, 21.0122], "city": "Warsaw"},
            "importance": 10,
        },
    }
    resp = await client.post("/api/entities", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["properties"]["tags"] == ["election", "debate"]
    assert data["properties"]["location"]["city"] == "Warsaw"
    assert data["properties"]["importance"] == 10


async def test_invalid_entity_id_type_on_read(client: AsyncClient):
    # Verify non-UUID lookup formats fail gracefully with 404 or validation error (422)
    resp = await client.get("/api/entities/not-a-valid-uuid")
    assert resp.status_code == 422


async def test_nonexistent_entity_returns_404(client: AsyncClient):
    # Verify lookup of nonexistent UUID returns 404
    non_existent_uuid = str(uuid.uuid4())
    resp = await client.get(f"/api/entities/{non_existent_uuid}")
    assert resp.status_code == 404


async def test_update_entity(client: AsyncClient):
    # Create entity
    create_resp = await client.post(
        "/api/entities", json={"name": "Alice", "type": "person"}
    )
    entity_id = create_resp.json()["id"]

    # Update entity properties
    update_payload = {
        "name": "Alice Updated",
        "type": "person",
        "description": "New bio",
        "properties": {"role": "Lead"},
    }
    update_resp = await client.put(f"/api/entities/{entity_id}", json=update_payload)
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["name"] == "Alice Updated"
    assert data["description"] == "New bio"
    assert data["properties"] == {"role": "Lead"}


async def test_update_nonexistent_entity(client: AsyncClient):
    non_existent = str(uuid.uuid4())
    payload = {"name": "No One", "type": "person"}
    resp = await client.put(f"/api/entities/{non_existent}", json=payload)
    assert resp.status_code == 404


async def test_update_entity_partial_fields(client: AsyncClient):
    """Updating only the description leaves other fields intact."""
    create = (
        await client.post(
            "/api/entities",
            json={"name": "Stable", "type": "person", "properties": {"x": 1}},
        )
    ).json()
    eid = create["id"]

    update_resp = await client.put(
        f"/api/entities/{eid}",
        json={"name": "Stable", "type": "person", "description": "Updated bio"},
    )
    assert update_resp.status_code == 200
    data = update_resp.json()
    assert data["description"] == "Updated bio"
    assert data["name"] == "Stable"


async def test_delete_entity_no_connections(client: AsyncClient):
    """Deleting an entity with no connections should succeed cleanly."""
    e = (
        await client.post("/api/entities", json={"name": "Lonely", "type": "person"})
    ).json()

    del_resp = await client.delete(f"/api/entities/{e['id']}")
    assert del_resp.status_code == 200

    get_resp = await client.get(f"/api/entities/{e['id']}")
    assert get_resp.status_code == 404


async def test_delete_nonexistent_entity(client: AsyncClient):
    non_existent = str(uuid.uuid4())
    resp = await client.delete(f"/api/entities/{non_existent}")
    assert resp.status_code == 404


async def test_delete_entity_cascades_connections(client: AsyncClient):
    # Create nodes and edge
    e1 = (
        await client.post("/api/entities", json={"name": "Node A", "type": "place"})
    ).json()
    e2 = (
        await client.post("/api/entities", json={"name": "Node B", "type": "person"})
    ).json()
    await client.post(
        "/api/connections",
        json={
            "source_id": e1["id"],
            "target_id": e2["id"],
            "label": "CONTAINS",
            "properties": {},
        },
    )

    # Delete Node A
    del_resp = await client.delete(f"/api/entities/{e1['id']}")
    assert del_resp.status_code == 200

    # Verify Node A is gone
    get_node = await client.get(f"/api/entities/{e1['id']}")
    assert get_node.status_code == 404

    # Verify the associated connection is deleted
    get_conns = await client.get("/api/connections")
    assert get_conns.json()["total"] == 0


async def test_get_entities_type_filter(client: AsyncClient):
    # Create person
    await client.post("/api/entities", json={"name": "Person Node", "type": "person"})
    # Create place
    await client.post("/api/entities", json={"name": "Place Node", "type": "place"})

    # Fetch only people
    people_resp = await client.get("/api/entities?type=person")
    assert people_resp.status_code == 200
    people = people_resp.json()
    assert people["total"] == 1
    assert people["items"][0]["type"] == "person"


async def test_create_and_read_all_entity_types(client: AsyncClient):
    """Ensure every EntityType can be created and retrieved individually."""
    entity_types = ["person", "organization", "place", "event"]
    created_ids = []
    for et in entity_types:
        resp = await client.post(
            "/api/entities", json={"name": f"Test {et}", "type": et}
        )
        assert resp.status_code == 200, f"Failed for type {et}: {resp.text}"
        data = resp.json()
        assert data["type"] == et
        created_ids.append((et, data["id"]))

    # Read each entity individually by ID
    for et, eid in created_ids:
        resp = await client.get(f"/api/entities/{eid}")
        assert resp.status_code == 200
        assert resp.json()["type"] == et
        assert resp.json()["id"] == eid


async def test_filter_entities_by_each_type(client: AsyncClient):
    """?type= filter should work for every EntityType."""
    entity_types = ["person", "organization", "place", "event"]
    for et in entity_types:
        await client.post("/api/entities", json={"name": f"Filter {et}", "type": et})

    for et in entity_types:
        resp = await client.get(f"/api/entities?type={et}")
        assert resp.status_code == 200
        results = resp.json()
        assert results["total"] == 1
        assert results["items"][0]["type"] == et


async def test_read_all_entities_unfiltered(client: AsyncClient):
    """GET /api/entities with no filter returns all entities."""
    names = ["Alpha", "Beta", "Gamma"]
    for name in names:
        await client.post("/api/entities", json={"name": name, "type": "person"})

    resp = await client.get("/api/entities")
    assert resp.status_code == 200
    assert resp.json()["total"] == len(names)


async def test_database_get_session_direct():
    from app.database import get_session

    async for session in get_session():
        assert session is not None
        break
