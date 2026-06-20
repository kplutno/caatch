from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import uuid
from typing import List

from app.database import get_session
from app.models import (
    Entity,
    Connection,
    ConnectionCreate,
    ConnectionRead,
    ALLOWED_CONNECTIONS,
)

router = APIRouter(prefix="/api/connections")


@router.get("/rules")
async def get_connection_rules():
    # Format rules nicely for the frontend: source_type -> label -> list of target_types
    return ALLOWED_CONNECTIONS


@router.post("", response_model=ConnectionRead)
async def create_connection(
    connection: ConnectionCreate, session: AsyncSession = Depends(get_session)
):
    # Validate entities exist
    source = await session.get(Entity, connection.source_id)
    target = await session.get(Entity, connection.target_id)
    if not source or not target:
        raise HTTPException(
            status_code=400, detail="Source or target entity does not exist"
        )

    # Perform connection validation based on entity types and connection label
    source_rules = ALLOWED_CONNECTIONS.get(source.type)
    if not source_rules or connection.label not in source_rules:
        raise HTTPException(
            status_code=400,
            detail=f"Connections of type '{connection.label}' are not allowed originating from a '{source.type}' entity.",
        )

    allowed_targets = source_rules[connection.label]
    if target.type not in allowed_targets:
        raise HTTPException(
            status_code=400,
            detail=f"Connections of type '{connection.label}' from '{source.type}' to '{target.type}' are not allowed. Allowed targets: {', '.join([t.value for t in allowed_targets])}.",
        )

    db_connection = Connection.model_validate(connection)
    session.add(db_connection)
    await session.commit()
    await session.refresh(db_connection)
    return db_connection


@router.get("", response_model=List[ConnectionRead])
async def read_connections(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Connection))
    return result.all()


@router.delete("/{connection_id}")
async def delete_connection(
    connection_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    db_connection = await session.get(Connection, connection_id)
    if not db_connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    await session.delete(db_connection)
    await session.commit()
    return {"message": "Connection deleted successfully"}
