from fastapi import APIRouter

core_router = APIRouter(tags=["System"])

@core_router.get("/health")
def health():
    return {"status": "ok"}