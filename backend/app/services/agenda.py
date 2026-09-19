import os

from openai import OpenAI


def generate_agenda(title: str, audience: str, duration_minutes: int) -> str:
    """Generate one concise, editable agenda draft for an organizer."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("Agenda generation is not configured")
    client = OpenAI(api_key=api_key)
    response = client.responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-5-mini"),
        instructions="Create concise meetup agendas. Return plain text only, with time slots and session titles.",
        input=(f"Draft a {duration_minutes}-minute agenda for '{title}'. " f"Audience: {audience}. Include a welcome, 2-4 sessions, and networking."),
        max_output_tokens=350,
    )
    return response.output_text.strip()

