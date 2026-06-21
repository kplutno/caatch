from fastapi import APIRouter
import os

router = APIRouter(prefix="/api")


@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "backend",
        "build_tag": os.getenv("IMAGE_TAG", "local-dev"),
    }


@router.get("/greet")
async def greet(name: str = "World"):
    return {"message": f"Hello, {name}! Welcome to Caatch."}
