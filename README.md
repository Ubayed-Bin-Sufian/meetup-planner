# Meetup Planner

A full-stack app for publishing community meetups and managing RSVPs. Organizers can optionally generate one editable agenda draft with OpenAI.

## Stack

- React + Vite frontend, deployed through AWS Amplify
- FastAPI API, packaged as a Docker image and deployed to AWS Lambda + API Gateway with AWS SAM
- Neon Postgres through SQLAlchemy
- GitHub Actions for checks and backend deployments

## Local start

1. Copy `.env.example` to `.env`. For a quick local run, set `DATABASE_URL=sqlite:///./meetup_planner.db` and a non-default `JWT_SECRET`.
2. Run `docker compose up --build`.
3. Open `http://localhost:5173`; the API documentation is at `http://localhost:8000/docs`.

The API starts without an OpenAI key. `POST /agenda/draft` then returns `503`; add `OPENAI_API_KEY` only when agenda drafting is needed.

Agenda drafts use the OpenAI **Responses API** with model **`gpt-5.6-luna`** (lowest-cost GPT-5.6 tier) and `reasoning.effort: none`. This is intentional vs the Codex Dhaka workshop’s `gpt-6-astra` sample, which targets a higher-capability / higher-cost model. Override with `OPENAI_MODEL` if needed.

## API endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | No | Health check (`{"status":"ok"}`). |
| `POST` | `/auth/register` | No | Create account; returns JWT. |
| `POST` | `/auth/token` | No | OAuth2 password login; returns JWT. |
| `GET` | `/events` | No | List meetups. |
| `POST` | `/events` | Yes | Create meetup. |
| `GET` | `/events/{id}` | No | Get one meetup. |
| `POST` | `/events/{id}/rsvp` | Yes | RSVP to a meetup. |
| `POST` | `/agenda/draft` | Yes | Generate an editable agenda draft (needs `OPENAI_API_KEY`). |

Agent working rules for this repo live in `AGENTS.md`.

## CI/CD configuration

Connect the GitHub repository's `main` branch to AWS Amplify for frontend deployments. Configure GitHub Actions repository secrets:

- `AWS_DEPLOY_ROLE_ARN` — an OIDC deployment role ARN
- `DATABASE_URL` — Neon pooled Postgres URL with `sslmode=require`
- `JWT_SECRET` — a long random signing secret
- `OPENAI_API_KEY` — used only by the agenda endpoint

Configure the repository variable `AWS_REGION`. The API workflow deploys the SAM stack to Lambda/API Gateway. The frontend receives `VITE_API_BASE_URL` as an Amplify environment variable pointing at the resulting API URL.
