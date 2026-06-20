from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import uuid
from typing import List, Optional

from app.database import get_session
from app.models import Entity, EntityCreate, EntityRead, Connection

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

@router.get("", response_model=List[EntityRead])
async def read_entities(
    type: Optional[str] = None, session: AsyncSession = Depends(get_session)
):
    statement = select(Entity)
    if type:
        statement = statement.where(Entity.type == type)
    result = await session.exec(statement)
    return result.all()

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
