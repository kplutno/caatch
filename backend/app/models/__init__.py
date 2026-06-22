# Import all database models to ensure they are registered with SQLModel metadata
from app.models.person import Person
from app.models.event import Event
from app.models.place import Place
from app.models.organization import Organization
from app.models.connection import Connection
from app.models.user import User

__all__ = ["Person", "Event", "Place", "Organization", "Connection", "User"]
