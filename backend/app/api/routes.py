from fastapi import APIRouter

router = APIRouter(prefix="/api")


@router.get("/service-health")
def api_service_health() -> dict:
    return {"status": "ok", "service": "FinGear AI"}
