import uuid
from typing import Optional, Dict, Any
from sqlmodel import Field, SQLModel, Column, AutoString
from sqlalchemy import JSON, UUID
from enum import Enum
from app.models.entity import EntityType


class ConnectionLabel(str, Enum):
    KNOWS = "KNOWS"
    MEMBER_OF = "MEMBER_OF"
    LOCATED_IN = "LOCATED_IN"
    LIVES_IN = "LIVES_IN"
    ATTENDED = "ATTENDED"
    PARTICIPATED_IN = "PARTICIPATED_IN"
    WORKS_WITH = "WORKS_WITH"


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
    },
    EntityType.organization: {
        ConnectionLabel.LOCATED_IN: [EntityType.place],
    },
    EntityType.event: {
        ConnectionLabel.LOCATED_IN: [EntityType.place],
    },
    EntityType.place: {
        ConnectionLabel.LOCATED_IN: [EntityType.place],
    },
}


class ConnectionBase(SQLModel):
    model_config = {"use_enum_values": True}

    source_id: uuid.UUID = Field(foreign_key="entity.id", index=True)
    target_id: uuid.UUID = Field(foreign_key="entity.id", index=True)
    label: ConnectionLabel = Field(sa_type=AutoString, index=True)
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
