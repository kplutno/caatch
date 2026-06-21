from pydantic import BaseModel
from typing import List
from app.models.entity import EntityRead
from app.models.connection import ConnectionRead


class GraphRead(BaseModel):
    nodes: List[EntityRead]
    edges: List[ConnectionRead]
