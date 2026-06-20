import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_health_check(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "backend"
    assert "build_tag" in data


async def test_greet_endpoint(client: AsyncClient):
    resp = await client.get("/api/greet?name=Gemini")
    assert resp.status_code == 200
    assert resp.json() == {"message": "Hello, Gemini! Welcome to Caatch."}


async def test_greet_default_name(client: AsyncClient):
    """GET /api/greet without ?name should use the default 'World'."""
    resp = await client.get("/api/greet")
    assert resp.status_code == 200
    assert resp.json() == {"message": "Hello, World! Welcome to Caatch."}
