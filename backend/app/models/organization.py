import uuid
from typing import Optional
from sqlmodel import Field, SQLModel, Column
from sqlalchemy import UUID


class OrganizationBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationRead(OrganizationBase):
    id: uuid.UUID
    type: str = "organization"


class Organization(OrganizationBase, table=True):
    id: Optional[uuid.UUID] = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    )
