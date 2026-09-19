from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserCreate(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EventCreate(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=10, max_length=2000)
    location: str = Field(min_length=2, max_length=160)
    starts_at: datetime
    capacity: int = Field(ge=1, le=5000)
    agenda: str | None = Field(default=None, max_length=4000)


class EventRead(EventCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organizer_id: int
    attendee_count: int


class AgendaDraftRequest(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    audience: str = Field(min_length=3, max_length=120)
    duration_minutes: int = Field(ge=30, le=480)


class AgendaDraft(BaseModel):
    agenda: str

