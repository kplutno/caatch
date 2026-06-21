import os
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

from typing import AsyncGenerator

DATABASE_URL = os.getenv(
    "DATABASE_URL", "cockroachdb+asyncpg://root@localhost:26257/caatch"
)

engine: AsyncEngine = create_async_engine(DATABASE_URL, echo=True, future=True)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async_session = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,  # type: ignore[call-overload]
    )
    async with async_session() as session:
        yield session
