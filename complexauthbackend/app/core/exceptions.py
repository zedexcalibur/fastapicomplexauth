from fastapi import HTTPException

def raise_error(status_code: int, message: str, code: str = None, extra: dict = None):
    detail = {
        "message": message
    }

    if code:
        detail["code"] = code

    if extra:
        detail["extra"] = extra

    raise HTTPException(status_code=status_code, detail=detail)