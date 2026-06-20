import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

from typing import AsyncGenerator

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/caatch"
)

engine = create_async_engine(DATABASE_URL, echo=True, future=True)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async_session = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,  # type: ignore[call-overload]
    )
    async with async_session() as session:
        yield session
