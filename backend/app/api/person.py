from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, col
import uuid
import math
from typing import Optional

from app.database import get_session
from app.models.person import Person, PersonCreate, PersonRead
from app.models.connection import Connection
from app.models.pagination import PaginatedResponse

router = APIRouter(prefix="/api/persons", tags=["persons"])


@router.post("", response_model=PersonRead)
async def create_person(
    person: PersonCreate, session: AsyncSession = Depends(get_session)
):
    db_obj = Person(name=person.name, description=person.description)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


@router.get("", response_model=PaginatedResponse[PersonRead])
async def read_persons(
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1, description="1-based page number"),
    page_size: int = Query(default=20, ge=1, le=200, description="Items per page"),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Person)
    if search:
        stmt = stmt.where(col(Person.name).ilike(f"%{search}%"))

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
        PersonRead(id=x.id, name=x.name, description=x.description)
        for x in sliced_items
    ]

    return PaginatedResponse(
        items=items_read,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{person_id}", response_model=PersonRead)
async def read_person(
    person_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    db_obj = await session.get(Person, person_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Person not found")
    return db_obj


@router.put("/{person_id}", response_model=PersonRead)
async def update_person(
    person_id: uuid.UUID,
    person_data: PersonCreate,
    session: AsyncSession = Depends(get_session),
):
    db_obj = await session.get(Person, person_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Person not found")

    db_obj.name = person_data.name
    db_obj.description = person_data.description

    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


@router.delete("/{person_id}")
async def delete_person(
    person_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    db_obj = await session.get(Person, person_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Person not found")

    # Cascade delete connections
    conns_statement = select(Connection).where(
        (Connection.source_id == person_id) | (Connection.target_id == person_id)
    )
    conns_result = await session.exec(conns_statement)
    for conn in conns_result.all():
        await session.delete(conn)

    await session.delete(db_obj)
    await session.commit()
    return {"message": "Person and associated connections deleted successfully"}
