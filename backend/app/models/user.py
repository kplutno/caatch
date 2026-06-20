import uuid
from typing import Optional, Dict, Any
from sqlmodel import Field, SQLModel, Column, AutoString
from sqlalchemy import JSON, UUID
from pydantic import EmailStr

class UserBase(SQLModel):
    name: str
    email: EmailStr = Field(unique=True, index=True)

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

class UserCreate(UserBase):
    pass

class UserRead(UserBase):
    id: int
