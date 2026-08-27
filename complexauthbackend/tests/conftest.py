import os

# This must be set before importing the application.
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine

from app.database import get_session
from app.main import app


test_engine = create_engine(
    "sqlite:///./test.db",
    connect_args={"check_same_thread": False},
)


@pytest.fixture
def session():
    SQLModel.metadata.drop_all(test_engine)
    SQLModel.metadata.create_all(test_engine)

    with Session(test_engine) as session:
        yield session

    SQLModel.metadata.drop_all(test_engine)


@pytest.fixture
def client(session):
    def override_get_session():
        yield session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()