from pydantic import BaseModel
from typing import List
from app.models.connection import EntityRead, ConnectionRead


class GraphRead(BaseModel):
    nodes: List[EntityRead]
    edges: List[ConnectionRead]
