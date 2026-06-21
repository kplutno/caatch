from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from typing import List

from app.database import get_session
from app.models.user import User, UserCreate, UserRead

router = APIRouter(prefix="/api/users")


@router.post("", response_model=UserRead)
async def create_user(user: UserCreate, session: AsyncSession = Depends(get_session)):
    db_user = User.model_validate(user)
    session.add(db_user)
    try:
        await session.commit()
        await session.refresh(db_user)
        return db_user
    except Exception:
        await session.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")


@router.get("", response_model=List[UserRead])
async def read_users(session: AsyncSession = Depends(get_session)):
    users = await session.exec(select(User))
    return users.all()
