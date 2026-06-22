import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_person_crud(client: AsyncClient):
    # Create Person
    payload = {"name": "John Person", "description": "A test person"}
    resp = await client.post("/api/persons", json=payload)
    assert resp.status_code == 200
    person = resp.json()
    assert person["name"] == "John Person"
    assert person["description"] == "A test person"
    assert person["type"] == "person"
    assert "id" in person

    # Read Person
    read_resp = await client.get(f"/api/persons/{person['id']}")
    assert read_resp.status_code == 200
    assert read_resp.json()["name"] == "John Person"

    # List Persons
    list_resp = await client.get("/api/persons")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["total"] >= 1
    assert any(x["id"] == person["id"] for x in list_data["items"])

    # Update Person
    update_payload = {"name": "John Person Updated", "description": "Updated"}
    update_resp = await client.put(f"/api/persons/{person['id']}", json=update_payload)
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "John Person Updated"

    # Delete Person
    del_resp = await client.delete(f"/api/persons/{person['id']}")
    assert del_resp.status_code == 200
    assert del_resp.json()["message"] is not None

    # Read after delete should be 404
    read_deleted = await client.get(f"/api/persons/{person['id']}")
    assert read_deleted.status_code == 404


async def test_event_crud(client: AsyncClient):
    payload = {"name": "Summit Event", "description": "A test event"}
    resp = await client.post("/api/events", json=payload)
    assert resp.status_code == 200
    event = resp.json()
    assert event["name"] == "Summit Event"
    assert event["type"] == "event"

    # Delete Event
    del_resp = await client.delete(f"/api/events/{event['id']}")
    assert del_resp.status_code == 200


async def test_place_crud(client: AsyncClient):
    payload = {"name": "Geneva Place", "description": "A test place"}
    resp = await client.post("/api/places", json=payload)
    assert resp.status_code == 200
    place = resp.json()
    assert place["name"] == "Geneva Place"
    assert place["type"] == "place"

    # Delete Place
    del_resp = await client.delete(f"/api/places/{place['id']}")
    assert del_resp.status_code == 200


async def test_organization_crud(client: AsyncClient):
    payload = {"name": "NGO Org", "description": "A test org"}
    resp = await client.post("/api/organizations", json=payload)
    assert resp.status_code == 200
    org = resp.json()
    assert org["name"] == "NGO Org"
    assert org["type"] == "organization"

    # Delete Org
    del_resp = await client.delete(f"/api/organizations/{org['id']}")
    assert del_resp.status_code == 200
