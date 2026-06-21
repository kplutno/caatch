import pytest
from httpx import AsyncClient
import uuid

pytestmark = pytest.mark.asyncio


async def test_network_graph_traversal_empty(client: AsyncClient):
    # Verify that requesting network of nonexistent node returns 404
    non_existent_uuid = str(uuid.uuid4())
    resp = await client.get(f"/api/entities/{non_existent_uuid}/network")
    assert resp.status_code == 404


async def test_get_entity_network_empty_and_valid(client: AsyncClient):
    e1 = (
        await client.post("/api/entities", json={"name": "Alice", "type": "person"})
    ).json()

    # Ego network for entity with no connections
    resp = await client.get(f"/api/entities/{e1['id']}/network?depth=1")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["nodes"]) == 1
    assert data["nodes"][0]["id"] == e1["id"]
    assert len(data["edges"]) == 0


async def test_ego_network_multidegree(client: AsyncClient):
    # Setup chain: Person A -> Org B -> Place C
    e1 = (
        await client.post("/api/entities", json={"name": "Alice", "type": "person"})
    ).json()
    e2 = (
        await client.post(
            "/api/entities", json={"name": "Org X", "type": "organization"}
        )
    ).json()
    e3 = (
        await client.post("/api/entities", json={"name": "Location Y", "type": "place"})
    ).json()

    await client.post(
        "/api/connections",
        json={"source_id": e1["id"], "target_id": e2["id"], "label": "MEMBER_OF"},
    )
    await client.post(
        "/api/connections",
        json={"source_id": e2["id"], "target_id": e3["id"], "label": "LOCATED_IN"},
    )

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


async def test_bidirectional_network_traversal(client: AsyncClient):
    """Network traversal must find nodes connected to the anchor in any direction."""
    # A -- B: B is only reachable because connection target → A is bidirectional
    a = (
        await client.post("/api/entities", json={"name": "A", "type": "person"})
    ).json()
    b = (
        await client.post("/api/entities", json={"name": "B", "type": "person"})
    ).json()

    await client.post(
        "/api/connections",
        json={"source_id": b["id"], "target_id": a["id"], "label": "KNOWS"},  # B → A
    )

    # Ask for A's network at depth=1; should still find B (it's connected TO A)
    resp = await client.get(f"/api/entities/{a['id']}/network?depth=1")
    assert resp.status_code == 200
    node_ids = [n["id"] for n in resp.json()["nodes"]]
    assert b["id"] in node_ids


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


async def test_get_full_graph(client: AsyncClient):
    resp = await client.get("/api/graph")
    assert resp.status_code == 200
    data = resp.json()
    assert "nodes" in data
    assert "edges" in data


async def test_full_graph_with_data(client: AsyncClient):
    """GET /api/graph returns nodes and edges when data exists."""
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

    resp = await client.get("/api/graph")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["nodes"]) == 2
    assert len(data["edges"]) == 1
