from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Event, Rsvp, User
from .schemas import AgendaDraft, AgendaDraftRequest, EventCreate, EventRead, Token, UserCreate
from .security import create_access_token, get_current_user, hash_password, verify_password
from .services.agenda import generate_agenda

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Meetup Planner API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"https://.*\.amplifyapp\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status_code=409, detail="Email is already registered")
    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return Token(access_token=create_access_token(user.id))


@app.post("/auth/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Token:
    user = db.scalar(select(User).where(User.email == form_data.username.lower()))
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return Token(access_token=create_access_token(user.id))


def event_read(event: Event, attendee_count: int) -> EventRead:
    return EventRead(
        id=event.id,
        title=event.title,
        description=event.description,
        location=event.location,
        starts_at=event.starts_at,
        capacity=event.capacity,
        agenda=event.agenda,
        organizer_id=event.organizer_id,
        attendee_count=attendee_count,
    )


@app.get("/events", response_model=list[EventRead])
def list_events(db: Session = Depends(get_db)) -> list[EventRead]:
    events = db.scalars(select(Event).order_by(Event.starts_at)).all()
    return [event_read(event, len(event.rsvps)) for event in events]


@app.post("/events", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> EventRead:
    event = Event(**payload.model_dump(), organizer_id=current_user.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event_read(event, 0)


@app.get("/events/{event_id}", response_model=EventRead)
def get_event(event_id: int, db: Session = Depends(get_db)) -> EventRead:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event_read(event, len(event.rsvps))


@app.post("/events/{event_id}/rsvp", status_code=status.HTTP_201_CREATED)
def rsvp(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, str]:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if db.scalar(select(Rsvp).where(Rsvp.event_id == event_id, Rsvp.user_id == current_user.id)):
        raise HTTPException(status_code=409, detail="Already registered")
    attendee_count = db.scalar(select(func.count()).select_from(Rsvp).where(Rsvp.event_id == event_id)) or 0
    if attendee_count >= event.capacity:
        raise HTTPException(status_code=409, detail="Event is full")
    db.add(Rsvp(event_id=event_id, user_id=current_user.id))
    db.commit()
    return {"status": "registered"}


@app.post("/agenda/draft", response_model=AgendaDraft)
def draft_agenda(payload: AgendaDraftRequest, _: User = Depends(get_current_user)) -> AgendaDraft:
    try:
        return AgendaDraft(agenda=generate_agenda(**payload.model_dump()))
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error))
