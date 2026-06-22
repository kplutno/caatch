from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, col
import uuid
import math
from typing import Optional

from app.database import get_session
from app.models.organization import Organization, OrganizationCreate, OrganizationRead
from app.models.connection import Connection
from app.models.pagination import PaginatedResponse

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.post("", response_model=OrganizationRead)
async def create_organization(
    organization: OrganizationCreate, session: AsyncSession = Depends(get_session)
):
    db_obj = Organization(name=organization.name, description=organization.description)
    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


@router.get("", response_model=PaginatedResponse[OrganizationRead])
async def read_organizations(
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1, description="1-based page number"),
    page_size: int = Query(default=20, ge=1, le=200, description="Items per page"),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Organization)
    if search:
        stmt = stmt.where(col(Organization.name).ilike(f"%{search}%"))

    # Count total
    count_res = await session.exec(stmt)
    all_items = list(count_res.all())
    all_items.sort(key=lambda x: x.name)
    total = len(all_items)
    total_pages = max(1, math.ceil(total / page_size))

    start_idx = (page - 1) * page_size
    end_idx = page * page_size
    sliced_items = all_items[start_idx:end_idx]

    items_read = [
        OrganizationRead(id=x.id, name=x.name, description=x.description)
        for x in sliced_items
    ]

    return PaginatedResponse(
        items=items_read,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{organization_id}", response_model=OrganizationRead)
async def read_organization(
    organization_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    db_obj = await session.get(Organization, organization_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Organization not found")
    return db_obj


@router.put("/{organization_id}", response_model=OrganizationRead)
async def update_organization(
    organization_id: uuid.UUID,
    organization_data: OrganizationCreate,
    session: AsyncSession = Depends(get_session),
):
    db_obj = await session.get(Organization, organization_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Organization not found")

    db_obj.name = organization_data.name
    db_obj.description = organization_data.description

    session.add(db_obj)
    await session.commit()
    await session.refresh(db_obj)
    return db_obj


@router.delete("/{organization_id}")
async def delete_organization(
    organization_id: uuid.UUID, session: AsyncSession = Depends(get_session)
):
    db_obj = await session.get(Organization, organization_id)
    if not db_obj:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Cascade delete connections
    conns_statement = select(Connection).where(
        (Connection.source_id == organization_id)
        | (Connection.target_id == organization_id)
    )
    conns_result = await session.exec(conns_statement)
    for conn in conns_result.all():
        await session.delete(conn)

    await session.delete(db_obj)
    await session.commit()
    return {"message": "Organization and associated connections deleted successfully"}
