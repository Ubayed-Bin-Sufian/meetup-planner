from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def auth_headers(email: str = "organizer@example.com") -> dict[str, str]:
    response = client.post("/auth/register", json={"email": email, "password": "secure-pass"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def event_payload() -> dict:
    return {
        "title": "Codex Dhaka Meetup",
        "description": "An evening of practical developer talks.",
        "location": "Dhaka",
        "starts_at": (datetime.now() + timedelta(days=7)).isoformat(),
        "capacity": 2,
    }


def test_health_returns_json():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_register_and_login_return_bearer_tokens():
    register = client.post("/auth/register", json={"email": "person@example.com", "password": "secure-pass"})
    login = client.post("/auth/token", data={"username": "person@example.com", "password": "secure-pass"})
    assert register.status_code == 201
    assert login.status_code == 200
    assert register.json()["token_type"] == "bearer"
    assert login.json()["access_token"]


def test_create_list_and_get_event():
    created = client.post("/events", json=event_payload(), headers=auth_headers())
    listed = client.get("/events")
    fetched = client.get(f"/events/{created.json()['id']}")
    assert created.status_code == 201
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert fetched.status_code == 200
    assert fetched.json()["attendee_count"] == 0


def test_event_creation_requires_authentication():
    response = client.post("/events", json=event_payload())
    assert response.status_code == 401


def test_rsvp_prevents_duplicates_and_respects_capacity():
    organizer = auth_headers()
    event_id = client.post("/events", json=event_payload(), headers=organizer).json()["id"]
    first_headers = auth_headers("first@example.com")
    first = client.post(f"/events/{event_id}/rsvp", headers=first_headers)
    duplicate = client.post(f"/events/{event_id}/rsvp", headers=first_headers)
    second = client.post(f"/events/{event_id}/rsvp", headers=auth_headers("second@example.com"))
    full = client.post(f"/events/{event_id}/rsvp", headers=auth_headers("third@example.com"))
    assert first.status_code == 201
    assert duplicate.status_code == 409
    assert second.status_code == 201
    assert full.status_code == 409


def test_agenda_generation_requires_configuration(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post(
        "/agenda/draft",
        json={"title": "AI for Dhaka", "audience": "Developers", "duration_minutes": 120},
        headers=auth_headers(),
    )
    assert response.status_code == 503
    assert response.json()["detail"] == "Agenda generation is not configured"
