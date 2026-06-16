from typing import Optional
from sqlmodel import Field, SQLModel
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
