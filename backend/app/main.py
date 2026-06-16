from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

import os

from app.database import get_session
from app.models import User, UserCreate, UserRead

app = FastAPI()

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "backend"}

@app.get("/api/greet")
async def greet(name: str = "World"):
    return {"message": f"Hello, {name}! Welcome to Caatch."}

@app.post("/api/users", response_model=UserRead)
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

@app.get("/api/users", response_model=list[UserRead])
async def read_users(session: AsyncSession = Depends(get_session)):
    users = await session.exec(select(User))
    return users.all()
