import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Event = { id: number; title: string; description: string; location: string; starts_at: string; capacity: number; attendee_count: number };
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${apiBase}/events`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load events")))
      .then(setEvents)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return <main>
    <header><p className="eyebrow">Dhaka community</p><h1>Meetup Planner</h1><p>Discover the next room full of good ideas.</p></header>
    <section><h2>Upcoming meetups</h2>{error && <p role="alert">{error}</p>}
      {events.length === 0 && !error ? <p>No meetups yet. Be the first organizer.</p> : events.map((event) => <article key={event.id}>
        <p className="eyebrow">{new Date(event.starts_at).toLocaleString()}</p><h3>{event.title}</h3><p>{event.description}</p>
        <footer>{event.location} · {event.attendee_count}/{event.capacity} attending</footer>
      </article>)}
    </section>
  </main>;
}

createRoot(document.getElementById("root")!).render(<App />);
