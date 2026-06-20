import uuid
from typing import Optional, Dict, Any
from sqlmodel import Field, SQLModel, Column, AutoString
from sqlalchemy import JSON, UUID
from enum import Enum

class EntityType(str, Enum):
    person = "person"
    event = "event"
    place = "place"
    organization = "organization"
    other = "other"

class EntityBase(SQLModel):
    name: str = Field(index=True)
    type: EntityType = Field(sa_type=AutoString, index=True)
    description: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

class Entity(EntityBase, table=True):
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    )

class EntityCreate(EntityBase):
    pass

class EntityRead(EntityBase):
    id: uuid.UUID
