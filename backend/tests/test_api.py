import pytest
import uuid
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_health_check(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "backend"
    assert "build_tag" in data


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
    entities = get_resp.json()
    assert len(entities) == 1
    assert entities[0]["id"] == entity_data["id"]


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
        "properties": {},
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
        "properties": {},
    }
    response = await client.post("/api/connections", json=conn_payload)
    assert response.status_code == 400


async def test_create_entity_missing_fields(client: AsyncClient):
    # Missing description and properties (should default to empty dict and None)
    payload = {"name": "Minimalist Organization", "type": "organization"}
    resp = await client.post("/api/entities", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Minimalist Organization"
    assert data["description"] is None
    assert data["properties"] == {}


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
    assert len(get_conns.json()) == 0


async def test_get_entities_type_filter(client: AsyncClient):
    # Create person
    await client.post("/api/entities", json={"name": "Person Node", "type": "person"})
    # Create place
    await client.post("/api/entities", json={"name": "Place Node", "type": "place"})

    # Fetch only people
    people_resp = await client.get("/api/entities?type=person")
    assert people_resp.status_code == 200
    people = people_resp.json()
    assert len(people) == 1
    assert people[0]["type"] == "person"


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


async def test_network_graph_traversal_empty(client: AsyncClient):
    # Verify that requesting network of nonexistent node returns 404
    non_existent_uuid = str(uuid.uuid4())
    resp = await client.get(f"/api/entities/{non_existent_uuid}/network")
    assert resp.status_code == 404


async def test_get_connection_rules(client: AsyncClient):
    resp = await client.get("/api/connections/rules")
    assert resp.status_code == 200
    rules = resp.json()
    assert "person" in rules
    assert "KNOWS" in rules["person"]
    assert "person" in rules["person"]["KNOWS"]


async def test_connection_validation_rules(client: AsyncClient):
    # Create person
    person_resp = await client.post("/api/entities", json={"name": "Alice", "type": "person"})
    p_id = person_resp.json()["id"]

    # Create place
    place_resp = await client.post("/api/entities", json={"name": "Paris", "type": "place"})
    pl_id = place_resp.json()["id"]

    # 1. Valid link: person LIVES_IN place
    valid_conn = {
        "source_id": p_id,
        "target_id": pl_id,
        "label": "LIVES_IN",
        "properties": {}
    }
    resp = await client.post("/api/connections", json=valid_conn)
    assert resp.status_code == 200

    # 2. Invalid link: person LIVES_IN person (disallowed target type)
    person2_resp = await client.post("/api/entities", json={"name": "Bob", "type": "person"})
    p2_id = person2_resp.json()["id"]
    invalid_conn = {
        "source_id": p_id,
        "target_id": p2_id,
        "label": "LIVES_IN",
        "properties": {}
    }
    resp = await client.post("/api/connections", json=invalid_conn)
    assert resp.status_code == 400
    assert "are not allowed" in resp.json()["detail"]


# --- New coverage tests ---

async def test_greet_endpoint(client: AsyncClient):
    resp = await client.get("/api/greet?name=Gemini")
    assert resp.status_code == 200
    assert resp.json() == {"message": "Hello, Gemini! Welcome to Caatch."}


async def test_user_crud(client: AsyncClient):
    # 1. Read empty users list
    resp = await client.get("/api/users")
    assert resp.status_code == 200
    assert resp.json() == []

    # 2. Create user
    user_payload = {"name": "Test User", "email": "test@example.com"}
    resp = await client.post("/api/users", json=user_payload)
    assert resp.status_code == 200
    user_data = resp.json()
    assert user_data["name"] == "Test User"
    assert "id" in user_data

    # 3. Prevent duplicate emails
    resp = await client.post("/api/users", json=user_payload)
    assert resp.status_code == 400
    assert "Email already exists" in resp.json()["detail"]

    # 4. Read list again
    resp = await client.get("/api/users")
    assert len(resp.json()) == 1


async def test_update_nonexistent_entity(client: AsyncClient):
    non_existent = str(uuid.uuid4())
    payload = {"name": "No One", "type": "person"}
    resp = await client.put(f"/api/entities/{non_existent}", json=payload)
    assert resp.status_code == 404


async def test_delete_nonexistent_entity(client: AsyncClient):
    non_existent = str(uuid.uuid4())
    resp = await client.delete(f"/api/entities/{non_existent}")
    assert resp.status_code == 404


async def test_ego_network_multidegree(client: AsyncClient):
    # Setup chain: Person A -> Org B -> Place C
    e1 = (await client.post("/api/entities", json={"name": "Alice", "type": "person"})).json()
    e2 = (await client.post("/api/entities", json={"name": "Org X", "type": "organization"})).json()
    e3 = (await client.post("/api/entities", json={"name": "Location Y", "type": "place"})).json()

    await client.post("/api/connections", json={
        "source_id": e1["id"],
        "target_id": e2["id"],
        "label": "MEMBER_OF"
    })
    await client.post("/api/connections", json={
        "source_id": e2["id"],
        "target_id": e3["id"],
        "label": "LOCATED_IN"
    })

    # Depth 1: Should only return Alice and Org X
    resp1 = await client.get(f"/api/entities/{e1['id']}/network?depth=1")
    assert resp1.status_code == 200
    nodes1 = [n["id"] for n in resp1.json()["nodes"]]
    assert e1["id"] in nodes1
    assert e2["id"] in nodes1
    assert e3["id"] not in nodes1

    # Depth 2: Should return Alice, Org X, and Location Y
    resp2 = await client.get(f"/api/entities/{e1['id']}/network?depth=2")
    nodes2 = [n["id"] for n in resp2.json()["nodes"]]
    assert e1["id"] in nodes2
    assert e2["id"] in nodes2
    assert e3["id"] in nodes2


async def test_get_full_graph(client: AsyncClient):
    resp = await client.get("/api/graph")
    assert resp.status_code == 200
    data = resp.json()
    assert "nodes" in data
    assert "edges" in data


async def test_connection_invalid_labels(client: AsyncClient):
    e1 = (await client.post("/api/entities", json={"name": "Alice", "type": "person"})).json()
    e2 = (await client.post("/api/entities", json={"name": "Org X", "type": "organization"})).json()
    
    # Try invalid connection label from person to organization
    invalid_conn = {
        "source_id": e1["id"],
        "target_id": e2["id"],
        "label": "LOCATED_IN",  # Person cannot LOCATED_IN an Organization
        "properties": {}
    }
    resp = await client.post("/api/connections", json=invalid_conn)
    assert resp.status_code == 400


async def test_database_get_session_direct():
    from app.database import get_session
    async for session in get_session():
        assert session is not None
        break


async def test_delete_connection_success(client: AsyncClient):
    # Setup connection
    e1 = (await client.post("/api/entities", json={"name": "Alice", "type": "person"})).json()
    e2 = (await client.post("/api/entities", json={"name": "Paris", "type": "place"})).json()
    conn = (await client.post("/api/connections", json={
        "source_id": e1["id"],
        "target_id": e2["id"],
        "label": "LIVES_IN"
    })).json()

    # Delete connection
    resp = await client.delete(f"/api/connections/{conn['id']}")
    assert resp.status_code == 200
    assert resp.json() == {"message": "Connection deleted successfully"}


async def test_get_entity_network_empty_and_valid(client: AsyncClient):
    e1 = (await client.post("/api/entities", json={"name": "Alice", "type": "person"})).json()
    
    # Ego network for entity with no connections
    resp = await client.get(f"/api/entities/{e1['id']}/network?depth=1")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["nodes"]) == 1
    assert data["nodes"][0]["id"] == e1["id"]
    assert len(data["edges"]) == 0



