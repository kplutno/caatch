import uuid
from typing import Optional, Dict, Any
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import JSON, UUID, Enum as sa_Enum
from enum import Enum


class EntityType(str, Enum):
    person = "person"
    event = "event"
    place = "place"
    organization = "organization"


class EntityBase(SQLModel):
    model_config = {"use_enum_values": True}

    name: str = Field(index=True)
    type: EntityType = Field(
        sa_column=Column(
            sa_Enum(EntityType, name="entitytype"),
            nullable=False,
            index=True,
        )
    )
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
