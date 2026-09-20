# Meetup Planner

A full-stack app for publishing community meetups and managing RSVPs. The Amplify site supports register/sign-in, creating meetups, RSVPs, and an optional OpenAI agenda draft for organizers.

## Stack

- React + Vite frontend (Node **24**), deployed through AWS Amplify
- FastAPI API, packaged as a Docker image and deployed to AWS Lambda + API Gateway with AWS SAM
- Neon Postgres through SQLAlchemy
- GitHub Actions for checks and backend deployments

## Local start

1. Copy `.env.example` to `.env`. For a quick local run, set `DATABASE_URL=sqlite:///./meetup_planner.db` and a non-default `JWT_SECRET`.
2. Optionally set `OPENAI_API_KEY` (and `OPENAI_MODEL`, default `gpt-5.6-luna`) for agenda drafting.
3. Start the app with either Docker or local processes (below).
4. Open `http://localhost:5173`. API docs: `http://localhost:8000/docs`. Health: `http://localhost:8000/health` (the API root `/` has no route and returns `404`).

### Docker Compose

```bash
docker compose up --build
```

Your user needs permission to talk to the Docker daemon (`docker` group or equivalent).

### Without Docker

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend requires Node **24+** (`engines` in `frontend/package.json`).

### Tests

```bash
pytest
```

`pytest.ini` sets `pythonpath = backend` and `testpaths = backend/tests`. Agent rules: `AGENTS.md`.

## Frontend features

- Register and sign in (JWT stored in the browser)
- List upcoming meetups
- Create a meetup (signed-in)
- RSVP (signed-in)
- Draft agenda with OpenAI, then edit before publish (signed-in; needs API key on the server)

## OpenAI agenda drafts

The API starts without an OpenAI key. `POST /agenda/draft` then returns `503`.

When configured, drafts use the OpenAI **Responses API** with model **`gpt-5.6-luna`** (lowest-cost GPT-5.6 tier) and `reasoning.effort: none`. This is intentional vs the Codex Dhaka workshop’s `gpt-6-astra` sample. Override with `OPENAI_MODEL` in local `.env`. Production Lambda sets `OPENAI_MODEL` in `template.yaml` (currently `gpt-5.6-luna`).

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

## CORS

The API allows:

- `http://localhost:5173` (local Vite)
- `https://*.amplifyapp.com` (Amplify default hostnames)

Other origins need a code change in `backend/app/main.py`.

## Deployed environments

| Surface | URL |
| --- | --- |
| Frontend (Amplify) | https://main.d1arn3kik1zjcf.amplifyapp.com |
| API (API Gateway) | https://ypuam6ah4g.execute-api.ap-southeast-1.amazonaws.com |
| API health | https://ypuam6ah4g.execute-api.ap-southeast-1.amazonaws.com/health |
| API docs | https://ypuam6ah4g.execute-api.ap-southeast-1.amazonaws.com/docs |

Region: `ap-southeast-1`. Update this table if the Amplify domain or API Gateway URL changes.

## CI/CD configuration

Connect the GitHub repository's `main` branch to AWS Amplify for frontend deployments. Configure GitHub Actions repository secrets:

- `AWS_DEPLOY_ROLE_ARN` — an OIDC deployment role ARN (trust must allow this repo’s GitHub OIDC `sub`; the role also needs CloudFormation, IAM, Lambda, API Gateway, ECR, and S3 permissions for SAM)
- `DATABASE_URL` — Neon pooled Postgres URL with `sslmode=require` (SQLAlchemy form: `postgresql+psycopg://...`)
- `JWT_SECRET` — a long random signing secret
- `OPENAI_API_KEY` — used only by the agenda endpoint (optional)

Configure the repository variable `AWS_REGION` (for example `ap-southeast-1`).

The API workflow (`.github/workflows/deploy-api.yml`) runs on `workflow_dispatch` and on pushes that change `backend/**`, `template.yaml`, or the workflow file. It uses `sam build` / `sam deploy` with `--resolve-s3`, `--resolve-image-repos`, and `--capabilities CAPABILITY_IAM`.

Amplify builds with Node 24 via `amplify.yml`. Set Amplify environment variable **`VITE_API_BASE_URL`** to the API Gateway URL **before** building — Vite inlines it at build time.
