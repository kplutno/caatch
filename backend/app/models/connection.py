import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlmodel import Field, SQLModel, Column, AutoString, select, col
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy import JSON, UUID
from enum import Enum

from app.models.person import Person
from app.models.event import Event
from app.models.place import Place
from app.models.organization import Organization


class EntityType(str, Enum):
    person = "person"
    event = "event"
    place = "place"
    organization = "organization"


class EntityRead(SQLModel):
    id: uuid.UUID
    name: str
    type: EntityType
    description: Optional[str] = None


class ConnectionLabel(str, Enum):
    MEMBER_OF = "MEMBER_OF"
    LOCATED_IN = "LOCATED_IN"
    ATTENDED = "ATTENDED"


ALLOWED_CONNECTIONS = {
    EntityType.person: {
        ConnectionLabel.LOCATED_IN: [EntityType.place],
        ConnectionLabel.MEMBER_OF: [EntityType.organization],
        ConnectionLabel.ATTENDED: [EntityType.event],
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

    source_id: uuid.UUID = Field(index=True)
    target_id: uuid.UUID = Field(index=True)
    label: ConnectionLabel = Field(sa_type=AutoString, index=True)
    description: Optional[str] = None
    start_time: Optional[datetime] = Field(default=None, nullable=True)
    end_time: Optional[datetime] = Field(default=None, nullable=True)
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


async def get_entity_by_id(
    session: AsyncSession, entity_id: uuid.UUID
) -> Optional[EntityRead]:
    for model, et in [
        (Person, EntityType.person),
        (Event, EntityType.event),
        (Place, EntityType.place),
        (Organization, EntityType.organization),
    ]:
        db_obj: Any = await session.get(model, entity_id)
        if db_obj:
            return EntityRead(
                id=db_obj.id, name=db_obj.name, type=et, description=db_obj.description
            )
    return None


async def get_entities_by_ids(
    session: AsyncSession, entity_ids: List[uuid.UUID]
) -> List[EntityRead]:
    if not entity_ids:
        return []
    results = []
    for model, et in [
        (Person, EntityType.person),
        (Event, EntityType.event),
        (Place, EntityType.place),
        (Organization, EntityType.organization),
    ]:
        stmt = select(model).where(col(model.id).in_(entity_ids))  # type: ignore
        res = await session.exec(stmt)
        for db_obj in res.all():
            db_obj_any: Any = db_obj
            results.append(
                EntityRead(
                    id=db_obj_any.id,
                    name=db_obj_any.name,
                    type=et,
                    description=db_obj_any.description,
                )
            )
    return results
