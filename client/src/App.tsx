import { useState } from 'react';
import type { Person } from './api/people';
import { PeoplePicker } from './components/PeoplePicker';

export default function App() {
  const [recipients, setRecipients] = useState<Person[]>([]);

  return (
    <main className="app">
      <h1>New message</h1>
      <PeoplePicker label="To" value={recipients} onChange={setRecipients} max={5} />

      <section className="debug">
        <h2>Selected ({recipients.length})</h2>
        {recipients.length === 0 ? (
          <p className="muted">Nobody yet.</p>
        ) : (
          <ol>
            {recipients.map((p) => (
              <li key={p.id}>
                {p.name} <span className="muted">&lt;{p.email}&gt; · {p.id}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
