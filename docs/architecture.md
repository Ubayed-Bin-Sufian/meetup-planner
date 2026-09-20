# Architecture

```mermaid
flowchart TB
    User[Attendee / Organizer] --> Amplify[AWS Amplify\nReact + Vite\nNode 24]
    Amplify -->|HTTPS JSON + JWT| Gateway[API Gateway HTTP API]
    Gateway --> Lambda[Lambda\nFastAPI Docker image]
    Lambda --> Neon[(Neon Postgres)]
    Lambda -->|agenda draft only\ngpt-5.6-luna| OpenAI[OpenAI Responses API]
    Lambda --> CloudWatch[CloudWatch]
    GitHub[GitHub] --> CI[GitHub Actions CI]
    GitHub --> Deploy[GitHub Actions API deploy\nOIDC + SAM]
    Deploy --> Lambda
    GitHub --> Amplify
```

## Notes

- OpenAI is an optional server-side integration. The browser never receives the OpenAI API key.
- CORS allows local Vite (`http://localhost:5173`) and Amplify default hosts (`https://*.amplifyapp.com`).
- Neon database branching for pull-request previews is **not implemented**; production/dev share the configured `DATABASE_URL` secret.
- Frontend auth uses bearer JWTs stored in the browser; create/RSVP/agenda routes require that token.
