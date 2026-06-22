import uuid
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import UUID


class PersonBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None


class PersonCreate(PersonBase):
    pass


class PersonRead(PersonBase):
    id: uuid.UUID
    type: str = "person"


class Person(PersonBase, table=True):
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    )
