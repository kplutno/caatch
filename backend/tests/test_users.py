import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


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
