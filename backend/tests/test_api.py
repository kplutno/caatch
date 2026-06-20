import pytest
import uuid
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def test_health_check(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "backend"}

async def test_create_and_read_entity(client: AsyncClient):
    # 1. Create a Person entity
    payload = {
        "name": "Jane Doe",
        "type": "person",
        "description": "A prominent politician",
        "properties": {"party": "Independent", "age": "45"}
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
    entities = get_resp.json()
    assert len(entities) == 1
    assert entities[0]["id"] == entity_data["id"]

async def test_invalid_entity_type(client: AsyncClient):
    # Verify that the Enum validator rejects invalid entity types
    payload = {
        "name": "Invalid Node",
        "type": "alien",  # Not in EntityType Enum
        "description": "Should fail",
        "properties": {}
    }
    response = await client.post("/api/entities", json=payload)
    assert response.status_code == 422  # Validation Error

async def test_connections_and_graph(client: AsyncClient):
    # 1. Create source entity (Person)
    person_payload = {"name": "John Builder", "type": "person", "properties": {}}
    person_resp = await client.post("/api/entities", json=person_payload)
    person_id = person_resp.json()["id"]

    # 2. Create target entity (Place)
    place_payload = {"name": "Capital City", "type": "place", "properties": {}}
    place_resp = await client.post("/api/entities", json=place_payload)
    place_id = place_resp.json()["id"]

    # 3. Create connection
    conn_payload = {
        "source_id": person_id,
        "target_id": place_id,
        "label": "LIVES_IN",
        "description": "Moved there in 2020",
        "properties": {}
    }
    conn_resp = await client.post("/api/connections", json=conn_payload)
    assert conn_resp.status_code == 200
    conn_data = conn_resp.json()
    assert conn_data["label"] == "LIVES_IN"

    # 4. Fetch Ego Network
    network_resp = await client.get(f"/api/entities/{person_id}/network?depth=1")
    assert network_resp.status_code == 200
    network_data = network_resp.json()
    assert len(network_data["nodes"]) == 2
    assert len(network_data["edges"]) == 1

async def test_connection_invalid_entities(client: AsyncClient):
    # Verify that we cannot link non-existent entity IDs
    conn_payload = {
        "source_id": str(uuid.uuid4()),
        "target_id": str(uuid.uuid4()),
        "label": "KNOWS",
        "properties": {}
    }
    response = await client.post("/api/connections", json=conn_payload)
    assert response.status_code == 400
