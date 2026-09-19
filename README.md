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

## CI/CD configuration

Connect the GitHub repository's `main` branch to AWS Amplify for frontend deployments. Configure GitHub Actions repository secrets:

- `AWS_DEPLOY_ROLE_ARN` — an OIDC deployment role ARN
- `DATABASE_URL` — Neon pooled Postgres URL with `sslmode=require`
- `JWT_SECRET` — a long random signing secret
- `OPENAI_API_KEY` — used only by the agenda endpoint

Configure the repository variable `AWS_REGION`. The API workflow deploys the SAM stack to Lambda/API Gateway. The frontend receives `VITE_API_BASE_URL` as an Amplify environment variable pointing at the resulting API URL.
