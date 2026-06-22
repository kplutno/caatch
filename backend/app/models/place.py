import uuid
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import UUID


class PlaceBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None


class PlaceCreate(PlaceBase):
    pass


class PlaceRead(PlaceBase):
    id: uuid.UUID
    type: str = "place"


class Place(PlaceBase, table=True):
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    )
