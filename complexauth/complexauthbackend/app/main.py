from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db
from app.auth.routes import auth_router
from app.core.routes import core_router
from app.users.routes import users_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",  # React/Vite dev server
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"

    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db()

app.include_router(auth_router)
app.include_router(core_router)
app.include_router(users_router)