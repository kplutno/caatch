from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from sqlalchemy import text
import uuid

from app.database import get_session
from app.models.connection import (
    get_entity_by_id,
    get_entities_by_ids,
)
from app.models.connection import Connection

router = APIRouter(prefix="/api")


@router.get("/entities/{entity_id}/network")
async def get_entity_network(
    entity_id: uuid.UUID, depth: int = 2, session: AsyncSession = Depends(get_session)
):
    # Verify entity exists
    entity = await get_entity_by_id(session, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    # 1. Use recursive CTE to fetch IDs of all nodes connected within `depth` steps
    query = text("""
        WITH RECURSIVE ConnectedNodes AS (
            -- Anchor: starting node (normalized to 32-char hex string)
            SELECT REPLACE(CAST(:entity_id AS VARCHAR), '-', '') AS entity_id, 0 AS depth
            
            UNION
            
            -- Recursive step: get neighbors (outgoing or incoming)
            SELECT 
                CASE 
                    WHEN REPLACE(CAST(c.source_id AS VARCHAR), '-', '') = cn.entity_id 
                    THEN REPLACE(CAST(c.target_id AS VARCHAR), '-', '')
                    ELSE REPLACE(CAST(c.source_id AS VARCHAR), '-', '')
                END AS entity_id,
                cn.depth + 1
            FROM connection c
            JOIN ConnectedNodes cn ON (
                REPLACE(CAST(c.source_id AS VARCHAR), '-', '') = cn.entity_id 
                OR REPLACE(CAST(c.target_id AS VARCHAR), '-', '') = cn.entity_id
            )
            WHERE cn.depth < :depth
        )
        SELECT DISTINCT entity_id FROM ConnectedNodes;
    """)

    from sqlmodel.ext.asyncio.session import AsyncSession as SQLModelAsyncSession

    result = await super(SQLModelAsyncSession, session).execute(
        query, {"entity_id": str(entity_id), "depth": depth}
    )
    node_ids = [
        uuid.UUID(row[0]) if isinstance(row[0], str) else row[0] for row in result.all()
    ]

    if not node_ids:
        node_ids = [entity_id]

    # 2. Fetch the corresponding entities
    nodes = await get_entities_by_ids(session, node_ids)

    # 3. Fetch all connections among these nodes
    from sqlmodel import col

    connections_stmt = select(Connection).where(
        col(Connection.source_id).in_(node_ids)
        & col(Connection.target_id).in_(node_ids)
    )
    connections_res = await session.exec(connections_stmt)
    edges = connections_res.all()

    return {"nodes": nodes, "edges": edges}
