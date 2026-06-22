from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.api import (
    system,
    user,
    connection,
    graph,
    person,
    event,
    place,
    organization,
)

app = FastAPI(
    title="Caatch API",
    description="Contact and network relationship management API",
    version=os.getenv("IMAGE_TAG", "local-dev"),
)

# --- CORS ---
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials="*" not in origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(system.router)
app.include_router(user.router)
app.include_router(connection.router)
app.include_router(graph.router)
app.include_router(person.router)
app.include_router(event.router)
app.include_router(place.router)
app.include_router(organization.router)
