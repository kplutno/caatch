import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ---------------------------------------------------------------------------
# Entity pagination
# ---------------------------------------------------------------------------


async def test_entities_pagination_envelope(client: AsyncClient):
    """GET /api/entities returns a paginated envelope with correct metadata."""
    for i in range(5):
        await client.post("/api/entities", json={"name": f"E{i}", "type": "other"})

    resp = await client.get("/api/entities?page=1&page_size=3")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 5
    assert data["page"] == 1
    assert data["page_size"] == 3
    assert data["total_pages"] == 2
    assert len(data["items"]) == 3


async def test_entities_pagination_second_page(client: AsyncClient):
    """Second page of entities contains the remaining items."""
    for i in range(5):
        await client.post("/api/entities", json={"name": f"E{i}", "type": "other"})

    resp = await client.get("/api/entities?page=2&page_size=3")
    assert resp.status_code == 200
    data = resp.json()
    assert data["page"] == 2
    assert len(data["items"]) == 2  # 5 total, 3 on page 1, 2 on page 2


async def test_entities_pagination_out_of_range_page(client: AsyncClient):
    """Requesting a page beyond the total returns an empty items list."""
    await client.post("/api/entities", json={"name": "Solo", "type": "other"})

    resp = await client.get("/api/entities?page=99&page_size=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"] == []


async def test_entities_pagination_invalid_params(client: AsyncClient):
    """page < 1 or page_size < 1 should return 422."""
    resp = await client.get("/api/entities?page=0")
    assert resp.status_code == 422

    resp = await client.get("/api/entities?page_size=0")
    assert resp.status_code == 422


async def test_entities_pagination_page_size_cap(client: AsyncClient):
    """page_size > 200 should return 422."""
    resp = await client.get("/api/entities?page_size=201")
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Connection pagination
# ---------------------------------------------------------------------------


async def test_connections_pagination_envelope(client: AsyncClient):
    """GET /api/connections returns a paginated envelope with correct metadata."""
    p = (await client.post("/api/entities", json={"name": "P", "type": "person"})).json()
    pl = (await client.post("/api/entities", json={"name": "PL", "type": "place"})).json()
    for _ in range(4):
        await client.post(
            "/api/connections",
            json={"source_id": p["id"], "target_id": pl["id"], "label": "LIVES_IN"},
        )

    resp = await client.get("/api/connections?page=1&page_size=3")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 4
    assert data["page"] == 1
    assert data["page_size"] == 3
    assert data["total_pages"] == 2
    assert len(data["items"]) == 3


async def test_connections_pagination_second_page(client: AsyncClient):
    """Second page of connections contains the remaining items."""
    p = (await client.post("/api/entities", json={"name": "P", "type": "person"})).json()
    pl = (await client.post("/api/entities", json={"name": "PL", "type": "place"})).json()
    for _ in range(4):
        await client.post(
            "/api/connections",
            json={"source_id": p["id"], "target_id": pl["id"], "label": "LIVES_IN"},
        )

    resp = await client.get("/api/connections?page=2&page_size=3")
    assert resp.status_code == 200
    data = resp.json()
    assert data["page"] == 2
    assert len(data["items"]) == 1


async def test_connections_empty_page(client: AsyncClient):
    """Empty database returns total=0 and empty items on page 1."""
    resp = await client.get("/api/connections?page=1&page_size=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["total_pages"] == 1
