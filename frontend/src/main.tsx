import { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type MeetupEvent = {
  id: number;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  capacity: number;
  agenda: string | null;
  attendee_count: number;
};

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const tokenKey = "meetup_planner_token";

async function api<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof URLSearchParams) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (typeof payload.detail === "string") detail = payload.detail;
      else if (Array.isArray(payload.detail)) detail = payload.detail.map((item: { msg?: string }) => item.msg ?? "Invalid input").join("; ");
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(tokenKey));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [events, setEvents] = useState<MeetupEvent[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Dhaka");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState(40);
  const [agenda, setAgenda] = useState("");
  const [audience, setAudience] = useState("students and builders");
  const [durationMinutes, setDurationMinutes] = useState(90);

  async function loadEvents() {
    const data = await api<MeetupEvent[]>("/events");
    setEvents(data);
  }

  useEffect(() => {
    loadEvents().catch((reason: Error) => setError(reason.message));
  }, []);

  function persistToken(next: string | null) {
    setToken(next);
    if (next) localStorage.setItem(tokenKey, next);
    else localStorage.removeItem(tokenKey);
  }

  async function register(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ access_token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      persistToken(data.access_token);
      setNotice("Account created. You are signed in.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const body = new URLSearchParams();
      body.set("username", email);
      body.set("password", password);
      const data = await api<{ access_token: string }>("/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      persistToken(data.access_token);
      setNotice("Signed in.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function draftAgenda() {
    if (!token) {
      setError("Sign in to draft an agenda.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api<{ agenda: string }>(
        "/agenda/draft",
        {
          method: "POST",
          body: JSON.stringify({
            title: title || "Community meetup",
            audience,
            duration_minutes: durationMinutes,
          }),
        },
        token,
      );
      setAgenda(data.agenda);
      setNotice("Agenda draft ready — edit it before publishing.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Agenda draft failed");
    } finally {
      setBusy(false);
    }
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setError("Sign in to create a meetup.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(
        "/events",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            description,
            location,
            starts_at: new Date(startsAt).toISOString(),
            capacity,
            agenda: agenda.trim() ? agenda : null,
          }),
        },
        token,
      );
      setTitle("");
      setDescription("");
      setAgenda("");
      setNotice("Meetup published.");
      await loadEvents();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function rsvp(eventId: number) {
    if (!token) {
      setError("Sign in to RSVP.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/events/${eventId}/rsvp`, { method: "POST" }, token);
      setNotice("You are registered.");
      await loadEvents();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "RSVP failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header className="hero">
        <p className="eyebrow">Dhaka community</p>
        <h1>Meetup Planner</h1>
        <p className="lede">Discover the next room full of good ideas.</p>
      </header>

      {(error || notice) && (
        <p className={error ? "banner error" : "banner"} role={error ? "alert" : "status"}>
          {error || notice}
        </p>
      )}

      <section className="panel">
        <h2>Account</h2>
        {token ? (
          <div className="row">
            <p>Signed in. Token saved in this browser.</p>
            <button type="button" onClick={() => persistToken(null)} disabled={busy}>
              Sign out
            </button>
          </div>
        ) : (
          <form className="stack" onSubmit={login}>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password (min 8)
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </label>
            <div className="row">
              <button type="submit" disabled={busy}>Sign in</button>
              <button type="button" className="secondary" onClick={register} disabled={busy}>
                Create account
              </button>
            </div>
          </form>
        )}
      </section>

      {token && (
        <section className="panel">
          <h2>Host a meetup</h2>
          <form className="stack" onSubmit={createEvent}>
            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} required />
            </label>
            <label>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} minLength={10} rows={3} required />
            </label>
            <div className="grid-2">
              <label>
                Location
                <input value={location} onChange={(e) => setLocation(e.target.value)} minLength={2} required />
              </label>
              <label>
                Capacity
                <input type="number" min={1} max={5000} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} required />
              </label>
            </div>
            <label>
              Starts at
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            </label>
            <div className="grid-2">
              <label>
                Audience (for AI draft)
                <input value={audience} onChange={(e) => setAudience(e.target.value)} minLength={3} />
              </label>
              <label>
                Duration (minutes)
                <input type="number" min={30} max={480} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
              </label>
            </div>
            <label>
              Agenda
              <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={5} placeholder="Optional — or draft with OpenAI" />
            </label>
            <div className="row">
              <button type="button" className="secondary" onClick={draftAgenda} disabled={busy}>
                Draft agenda with AI
              </button>
              <button type="submit" disabled={busy}>Publish meetup</button>
            </div>
          </form>
        </section>
      )}

      <section>
        <h2>Upcoming meetups</h2>
        {events.length === 0 ? (
          <p className="empty">No meetups yet. Be the first organizer.</p>
        ) : (
          events.map((event) => (
            <article key={event.id}>
              <p className="eyebrow">{new Date(event.starts_at).toLocaleString()}</p>
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              {event.agenda && <pre className="agenda">{event.agenda}</pre>}
              <footer>
                <span>{event.location} · {event.attendee_count}/{event.capacity} attending</span>
                <button type="button" onClick={() => rsvp(event.id)} disabled={busy || !token}>
                  {token ? "RSVP" : "Sign in to RSVP"}
                </button>
              </footer>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
