import uuid
from typing import Optional, Dict, Any
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON, UUID
from pydantic import EmailStr

from enum import Enum

class EntityType(str, Enum):
    person = "person"
    event = "event"
    place = "place"
    organization = "organization"
    other = "other"

# --- Users (Legacy/Admin) ---

class UserBase(SQLModel):
    name: str
    email: EmailStr = Field(unique=True, index=True)

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class UserCreate(UserBase):
    pass

class UserRead(UserBase):
    id: int

# --- Political Tracking Graph Models ---

class EntityBase(SQLModel):
    name: str = Field(index=True)
    type: EntityType = Field(index=True)  # Strictly validated Enum
    description: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

class Entity(EntityBase, table=True):
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    )

class EntityCreate(EntityBase):
    pass

class EntityRead(EntityBase):
    id: uuid.UUID

# Connection model representing dynamic edges
class ConnectionBase(SQLModel):
    source_id: uuid.UUID = Field(foreign_key="entity.id", index=True)
    target_id: uuid.UUID = Field(foreign_key="entity.id", index=True)
    label: str = Field(index=True)  # e.g., "MEMBER_OF", "LOCATED_IN", "ATTENDED"
    description: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

class Connection(ConnectionBase, table=True):
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    )

class ConnectionCreate(ConnectionBase):
    pass

class ConnectionRead(ConnectionBase):
    id: uuid.UUID

