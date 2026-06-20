"""
Integration tests — Graph and ego-network endpoints.

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
# Full graph
# ---------------------------------------------------------------------------


class TestGraph:
    def test_graph_returns_nodes_and_edges(self):
        resp = requests.get(f"{BASE}/api/graph", timeout=10)
        assert resp.status_code == 200
        data = resp.json()
        assert "nodes" in data
        assert "edges" in data
        assert isinstance(data["nodes"], list)
        assert isinstance(data["edges"], list)

    def test_graph_reflects_newly_created_data(self):
        person = _create_entity("person", "Graph Person")
        place = _create_entity("place", "Graph Place")
        conn = _create_connection(person["id"], place["id"], "LIVES_IN")

        resp = requests.get(f"{BASE}/api/graph", timeout=10)
        data = resp.json()
        node_ids = [n["id"] for n in data["nodes"]]
        edge_ids = [e["id"] for e in data["edges"]]
        assert person["id"] in node_ids
        assert place["id"] in node_ids
        assert conn["id"] in edge_ids


# ---------------------------------------------------------------------------
# Ego-network / traversal
# ---------------------------------------------------------------------------


class TestEgoNetwork:
    def test_network_of_nonexistent_entity_returns_404(self):
        resp = requests.get(f"{BASE}/api/entities/{uuid.uuid4()}/network", timeout=10)
        assert resp.status_code == 404

    def test_isolated_entity_network(self):
        """An entity with no connections returns just itself."""
        entity = _create_entity("person", "Isolated")
        resp = requests.get(
            f"{BASE}/api/entities/{entity['id']}/network?depth=1", timeout=10
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["nodes"]) == 1
        assert data["nodes"][0]["id"] == entity["id"]
        assert data["edges"] == []

    def test_direct_neighbour_at_depth_1(self):
        person = _create_entity("person", "Net Person")
        place = _create_entity("place", "Net Place")
        _create_connection(person["id"], place["id"], "LIVES_IN")

        resp = requests.get(
            f"{BASE}/api/entities/{person['id']}/network?depth=1", timeout=10
        )
        data = resp.json()
        node_ids = [n["id"] for n in data["nodes"]]
        assert person["id"] in node_ids
        assert place["id"] in node_ids
        assert len(data["edges"]) == 1

    def test_depth_limits_traversal(self):
        """At depth=1 the third node (2 hops away) should NOT appear."""
        p = _create_entity("person", "Depth Person")
        org = _create_entity("organization", "Depth Org")
        place = _create_entity("place", "Depth Place")
        _create_connection(p["id"], org["id"], "MEMBER_OF")
        _create_connection(org["id"], place["id"], "LOCATED_IN")

        resp_d1 = requests.get(
            f"{BASE}/api/entities/{p['id']}/network?depth=1", timeout=10
        )
        node_ids_d1 = [n["id"] for n in resp_d1.json()["nodes"]]
        assert p["id"] in node_ids_d1
        assert org["id"] in node_ids_d1
        assert place["id"] not in node_ids_d1

    def test_depth_2_reaches_two_hops(self):
        p = _create_entity("person", "Depth2 Person")
        org = _create_entity("organization", "Depth2 Org")
        place = _create_entity("place", "Depth2 Place")
        _create_connection(p["id"], org["id"], "MEMBER_OF")
        _create_connection(org["id"], place["id"], "LOCATED_IN")

        resp_d2 = requests.get(
            f"{BASE}/api/entities/{p['id']}/network?depth=2", timeout=10
        )
        node_ids_d2 = [n["id"] for n in resp_d2.json()["nodes"]]
        assert p["id"] in node_ids_d2
        assert org["id"] in node_ids_d2
        assert place["id"] in node_ids_d2

    def test_bidirectional_traversal(self):
        """If B→A, requesting A's network should still return B."""
        a = _create_entity("person", "BidirA")
        b = _create_entity("person", "BidirB")
        _create_connection(b["id"], a["id"], "KNOWS")  # connection goes B → A

        resp = requests.get(
            f"{BASE}/api/entities/{a['id']}/network?depth=1", timeout=10
        )
        node_ids = [n["id"] for n in resp.json()["nodes"]]
        assert b["id"] in node_ids

    def test_network_edges_are_subset_of_nodes(self):
        """All edge source/target IDs must refer to nodes in the response."""
        p = _create_entity("person", "Edge Person")
        pl = _create_entity("place", "Edge Place")
        _create_connection(p["id"], pl["id"], "LIVES_IN")

        resp = requests.get(
            f"{BASE}/api/entities/{p['id']}/network?depth=2", timeout=10
        )
        data = resp.json()
        node_ids = {n["id"] for n in data["nodes"]}
        for edge in data["edges"]:
            assert edge["source_id"] in node_ids
            assert edge["target_id"] in node_ids

    def test_larger_network(self):
        """Star topology: one hub connected to multiple leaves."""
        hub = _create_entity("organization", "Hub Org")
        members = [_create_entity("person", f"Member {i}") for i in range(4)]
        for m in members:
            _create_connection(m["id"], hub["id"], "MEMBER_OF")

        resp = requests.get(
            f"{BASE}/api/entities/{hub['id']}/network?depth=1", timeout=10
        )
        data = resp.json()
        node_ids = [n["id"] for n in data["nodes"]]
        assert hub["id"] in node_ids
        for m in members:
            assert m["id"] in node_ids
        assert len(data["edges"]) >= 4
