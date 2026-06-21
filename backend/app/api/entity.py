from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, func
import uuid
import math
from typing import Optional

from app.database import get_session
from app.models.entity import Entity, EntityCreate, EntityRead
from app.models.connection import Connection
from app.models.pagination import PaginatedResponse

router = APIRouter(prefix="/api/entities")


@router.post("", response_model=EntityRead)
async def create_entity(
    entity: EntityCreate, session: AsyncSession = Depends(get_session)
):
    db_entity = Entity.model_validate(entity)
    session.add(db_entity)
    await session.commit()
    await session.refresh(db_entity)
    return db_entity


@router.get("", response_model=PaginatedResponse[EntityRead])
async def read_entities(
    type: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1, description="1-based page number"),
    page_size: int = Query(default=20, ge=1, le=200, description="Items per page"),
    session: AsyncSession = Depends(get_session),
):
    statement = select(Entity)
    count_statement = select(func.count()).select_from(Entity)

    if type:
        statement = statement.where(Entity.type == type)
        count_statement = count_statement.where(Entity.type == type)

    if search:
        statement = statement.where(Entity.name.ilike(f"%{search}%"))  # type: ignore[attr-defined]
        count_statement = count_statement.where(Entity.name.ilike(f"%{search}%"))  # type: ignore[attr-defined]

    total = (await session.exec(count_statement)).one()
    total_pages = max(1, math.ceil(total / page_size))

    statement = statement.offset((page - 1) * page_size).limit(page_size)
    result = await session.exec(statement)

    return PaginatedResponse(
        items=list(result.all()),
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{entity_id}", response_model=EntityRead)
async def read_entity(
    entity_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    db_entity = await session.get(Entity, entity_id)
    if not db_entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return db_entity


@router.put("/{entity_id}", response_model=EntityRead)
async def update_entity(
    entity_id: uuid.UUID,
    entity_data: EntityCreate,
    session: AsyncSession = Depends(get_session),
):
    db_entity = await session.get(Entity, entity_id)
    if not db_entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    for key, val in entity_data.model_dump(exclude_unset=True).items():
        setattr(db_entity, key, val)

    session.add(db_entity)
    await session.commit()
    await session.refresh(db_entity)
    return db_entity


@router.delete("/{entity_id}")
async def delete_entity(
    entity_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    db_entity = await session.get(Entity, entity_id)
    if not db_entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    # Also delete associated connections to avoid foreign key violations
    conns_statement = select(Connection).where(
        (Connection.source_id == entity_id) | (Connection.target_id == entity_id)
    )
    conns_result = await session.exec(conns_statement)
    for conn in conns_result.all():
        await session.delete(conn)

    await session.delete(db_entity)
    await session.commit()
    return {"message": "Entity and associated connections deleted successfully"}
