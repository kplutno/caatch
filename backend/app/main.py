from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from sqlalchemy import text

import os
import uuid
from typing import List, Optional

from app.database import get_session
from app.models import (
    User, UserCreate, UserRead,
    Entity, EntityCreate, EntityRead,
    Connection, ConnectionCreate, ConnectionRead
)

app = FastAPI()

# CORS Configuration
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials="*" not in origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "backend",
        "build_tag": os.getenv("IMAGE_TAG", "local-dev")
    }

@app.get("/api/greet")
async def greet(name: str = "World"):
    return {"message": f"Hello, {name}! Welcome to Caatch."}

# --- Users (Legacy/Admin) ---
@app.post("/api/users", response_model=UserRead)
async def create_user(user: UserCreate, session: AsyncSession = Depends(get_session)):
    db_user = User.model_validate(user)
    session.add(db_user)
    try:
        await session.commit()
        await session.refresh(db_user)
        return db_user
    except Exception:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

@app.get("/api/users", response_model=List[UserRead])
async def read_users(session: AsyncSession = Depends(get_session)):
    users = await session.exec(select(User))
    return users.all()

# --- Entities CRUD ---

@app.post("/api/entities", response_model=EntityRead)
async def create_entity(entity: EntityCreate, session: AsyncSession = Depends(get_session)):
    db_entity = Entity.model_validate(entity)
    session.add(db_entity)
    await session.commit()
    await session.refresh(db_entity)
    return db_entity

@app.get("/api/entities", response_model=List[EntityRead])
async def read_entities(type: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    statement = select(Entity)
    if type:
        statement = statement.where(Entity.type == type)
    result = await session.exec(statement)
    return result.all()

@app.get("/api/entities/{entity_id}", response_model=EntityRead)
async def read_entity(entity_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    db_entity = await session.get(Entity, entity_id)
    if not db_entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return db_entity

@app.put("/api/entities/{entity_id}", response_model=EntityRead)
async def update_entity(entity_id: uuid.UUID, entity_data: EntityCreate, session: AsyncSession = Depends(get_session)):
    db_entity = await session.get(Entity, entity_id)
    if not db_entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    for key, val in entity_data.model_dump(exclude_unset=True).items():
        setattr(db_entity, key, val)
        
    session.add(db_entity)
    await session.commit()
    await session.refresh(db_entity)
    return db_entity

@app.delete("/api/entities/{entity_id}")
async def delete_entity(entity_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
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

# --- Connections CRUD ---

@app.post("/api/connections", response_model=ConnectionRead)
async def create_connection(connection: ConnectionCreate, session: AsyncSession = Depends(get_session)):
    # Validate entities exist
    source = await session.get(Entity, connection.source_id)
    target = await session.get(Entity, connection.target_id)
    if not source or not target:
        raise HTTPException(status_code=400, detail="Source or target entity does not exist")
    
    db_connection = Connection.model_validate(connection)
    session.add(db_connection)
    await session.commit()
    await session.refresh(db_connection)
    return db_connection

@app.get("/api/connections", response_model=List[ConnectionRead])
async def read_connections(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Connection))
    return result.all()

@app.delete("/api/connections/{connection_id}")
async def delete_connection(connection_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    db_connection = await session.get(Connection, connection_id)
    if not db_connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    await session.delete(db_connection)
    await session.commit()
    return {"message": "Connection deleted successfully"}

# --- Graph / Network Endpoints ---

@app.get("/api/graph")
async def get_full_graph(session: AsyncSession = Depends(get_session)):
    entities = (await session.exec(select(Entity))).all()
    connections = (await session.exec(select(Connection))).all()
    return {
        "nodes": entities,
        "edges": connections
    }

@app.get("/api/entities/{entity_id}/network")
async def get_entity_network(entity_id: uuid.UUID, depth: int = 2, session: AsyncSession = Depends(get_session)):
    # Verify entity exists
    entity = await session.get(Entity, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # 1. Use recursive CTE to fetch IDs of all nodes connected within `depth` steps
    # We cast to VARCHAR to support both PostgreSQL UUIDs and SQLite string representation.
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
    
    result = await session.execute(query, {"entity_id": str(entity_id), "depth": depth})
    node_ids = [uuid.UUID(row[0]) if isinstance(row[0], str) else row[0] for row in result.all()]
    
    if not node_ids:
        node_ids = [entity_id]
        
    # 2. Fetch the corresponding entities
    entities_stmt = select(Entity).where(Entity.id.in_(node_ids))
    entities_res = await session.exec(entities_stmt)
    nodes = entities_res.all()
    
    # 3. Fetch all connections among these nodes
    connections_stmt = select(Connection).where(
        Connection.source_id.in_(node_ids) & Connection.target_id.in_(node_ids)
    )
    connections_res = await session.exec(connections_stmt)
    edges = connections_res.all()
    
    return {
        "nodes": nodes,
        "edges": edges
    }

