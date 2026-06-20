import uuid
from typing import Optional, Dict, Any
from sqlmodel import Field, SQLModel, Column, AutoString
from sqlalchemy import JSON, UUID
from pydantic import EmailStr

from enum import Enum


class EntityType(str, Enum):
    person = "person"
    event = "event"
    place = "place"
    organization = "organization"
    other = "other"


class ConnectionLabel(str, Enum):
    KNOWS = "KNOWS"
    MEMBER_OF = "MEMBER_OF"
    LOCATED_IN = "LOCATED_IN"
    LIVES_IN = "LIVES_IN"
    ATTENDED = "ATTENDED"
    PARTICIPATED_IN = "PARTICIPATED_IN"
    WORKS_WITH = "WORKS_WITH"
    OTHER = "OTHER"


# Validation rules: source_type -> { label -> list of target_types }
ALLOWED_CONNECTIONS = {
    EntityType.person: {
        ConnectionLabel.KNOWS: [EntityType.person],
        ConnectionLabel.WORKS_WITH: [EntityType.person],
        ConnectionLabel.LIVES_IN: [EntityType.place],
        ConnectionLabel.LOCATED_IN: [EntityType.place],
        ConnectionLabel.MEMBER_OF: [EntityType.organization],
        ConnectionLabel.ATTENDED: [EntityType.event],
        ConnectionLabel.PARTICIPATED_IN: [EntityType.event],
        ConnectionLabel.OTHER: [
            EntityType.person,
            EntityType.event,
            EntityType.place,
            EntityType.organization,
            EntityType.other,
        ],
    },
    EntityType.organization: {
        ConnectionLabel.LOCATED_IN: [EntityType.place],
        ConnectionLabel.OTHER: [
            EntityType.person,
            EntityType.event,
            EntityType.place,
            EntityType.organization,
            EntityType.other,
        ],
    },
    EntityType.event: {
        ConnectionLabel.LOCATED_IN: [EntityType.place],
        ConnectionLabel.OTHER: [
            EntityType.person,
            EntityType.event,
            EntityType.place,
            EntityType.organization,
            EntityType.other,
        ],
    },
    EntityType.place: {
        ConnectionLabel.LOCATED_IN: [EntityType.place],
        ConnectionLabel.OTHER: [
            EntityType.person,
            EntityType.event,
            EntityType.place,
            EntityType.organization,
            EntityType.other,
        ],
    },
    EntityType.other: {
        ConnectionLabel.OTHER: [
            EntityType.person,
            EntityType.event,
            EntityType.place,
            EntityType.organization,
            EntityType.other,
        ]
    },
}


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
    type: EntityType = Field(
        sa_type=AutoString, index=True
    )  # Strictly validated at API layer, stored as standard string column
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


# Connection model representing dynamic edges
class ConnectionBase(SQLModel):
    source_id: uuid.UUID = Field(foreign_key="entity.id", index=True)
    target_id: uuid.UUID = Field(foreign_key="entity.id", index=True)
    label: ConnectionLabel = Field(
        sa_type=AutoString, index=True
    )  # Strictly validated at API layer, stored as standard string column
    description: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


class Connection(ConnectionBase, table=True):
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    )


class ConnectionCreate(ConnectionBase):
    pass


class ConnectionRead(ConnectionBase):
    id: uuid.UUID
