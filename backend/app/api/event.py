from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, col
import uuid
import math
from typing import Optional

from app.database import get_session
from app.models.event import Event, EventCreate, EventRead
from app.models.connection import Connection
from app.models.pagination import PaginatedResponse

router = APIRouter(prefix="/api/events", tags=["events"])


@router.post("", response_model=EventRead)
async def create_event(
    event: EventCreate, session: AsyncSession = Depends(get_session)
):
    db_obj = Event(name=event.name, description=event.description)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


@router.get("", response_model=PaginatedResponse[EventRead])
async def read_events(
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1, description="1-based page number"),
    page_size: int = Query(default=20, ge=1, le=200, description="Items per page"),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Event)
    if search:
        stmt = stmt.where(col(Event.name).ilike(f"%{search}%"))

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
        EventRead(id=x.id, name=x.name, description=x.description) for x in sliced_items
    ]

    return PaginatedResponse(
        items=items_read,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{event_id}", response_model=EventRead)
async def read_event(event_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    db_obj = await session.get(Event, event_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Event not found")
    return db_obj


@router.put("/{event_id}", response_model=EventRead)
async def update_event(
    event_id: uuid.UUID,
    event_data: EventCreate,
    session: AsyncSession = Depends(get_session),
):
    db_obj = await session.get(Event, event_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Event not found")

    db_obj.name = event_data.name
    db_obj.description = event_data.description

    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


@router.delete("/{event_id}")
async def delete_event(
    event_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    db_obj = await session.get(Event, event_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Event not found")

    # Cascade delete connections
    conns_statement = select(Connection).where(
        (Connection.source_id == event_id) | (Connection.target_id == event_id)
    )
    conns_result = await session.exec(conns_statement)
    for conn in conns_result.all():
        await session.delete(conn)

    await session.delete(db_obj)
    await session.commit()
    return {"message": "Event and associated connections deleted successfully"}
