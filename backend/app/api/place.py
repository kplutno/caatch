from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, col
import uuid
import math
from typing import Optional

from app.database import get_session
from app.models.place import Place, PlaceCreate, PlaceRead
from app.models.connection import Connection
from app.models.pagination import PaginatedResponse

router = APIRouter(prefix="/api/places", tags=["places"])


@router.post("", response_model=PlaceRead)
async def create_place(
    place: PlaceCreate, session: AsyncSession = Depends(get_session)
):
    db_obj = Place(name=place.name, description=place.description)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


@router.get("", response_model=PaginatedResponse[PlaceRead])
async def read_places(
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1, description="1-based page number"),
    page_size: int = Query(default=20, ge=1, le=200, description="Items per page"),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Place)
    if search:
        stmt = stmt.where(col(Place.name).ilike(f"%{search}%"))

    # Count total
    count_res = await session.exec(stmt)
    all_items = list(count_res.all())
    all_items.sort(key=lambda x: x.name)
    total = len(all_items)
    total_pages = max(1, math.ceil(total / page_size))

    start_idx = (page - 1) * page_size
    end_idx = page * page_size
    sliced_items = all_items[start_idx:end_idx]

    items_read = [
        PlaceRead(id=x.id, name=x.name, description=x.description) for x in sliced_items
    ]

    return PaginatedResponse(
        items=items_read,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{place_id}", response_model=PlaceRead)
async def read_place(place_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    db_obj = await session.get(Place, place_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Place not found")
    return db_obj


@router.put("/{place_id}", response_model=PlaceRead)
async def update_place(
    place_id: uuid.UUID,
    place_data: PlaceCreate,
    session: AsyncSession = Depends(get_session),
):
    db_obj = await session.get(Place, place_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Place not found")

    db_obj.name = place_data.name
    db_obj.description = place_data.description

    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


@router.delete("/{place_id}")
async def delete_place(
    place_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    db_obj = await session.get(Place, place_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Place not found")

    # Cascade delete connections
    conns_statement = select(Connection).where(
        (Connection.source_id == place_id) | (Connection.target_id == place_id)
    )
    conns_result = await session.exec(conns_statement)
    for conn in conns_result.all():
        await session.delete(conn)

    await session.delete(db_obj)
    await session.commit()
    return {"message": "Place and associated connections deleted successfully"}
