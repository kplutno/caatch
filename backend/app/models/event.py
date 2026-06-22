import uuid
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import UUID


class EventBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None


class EventCreate(EventBase):
    pass


class EventRead(EventBase):
    id: uuid.UUID
    type: str = "event"


class Event(EventBase, table=True):
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    )
