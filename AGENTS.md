# AGENTS.md

Rules for changes to this repo:

- Every API endpoint must have tests.
- Use type hints on Python functions and FastAPI handlers.
- Return JSON from API endpoints.
- Run `pytest` from the repo root (or `backend/`) before considering backend work done.
- Keep `OPENAI_API_KEY` server-side only; never expose it to the frontend.
- Prefer the OpenAI Responses API for agenda drafting; omit unsupported sampling params (`temperature`, `top_p`).
- Default agenda model is `gpt-5.6-luna` (lowest-cost GPT-5.6 tier) with `reasoning.effort: none`. Use a higher-tier model only when the user asks.
