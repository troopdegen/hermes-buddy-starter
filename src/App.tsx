import { useEffect, useState } from "react";

interface Health {
  status: string;
  model: string;
  baseUrl: string;
  keys: { nebius: boolean; tavily: boolean };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<string | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  async function sendChat() {
    const text = prompt.trim();
    if (!text || chatBusy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setPrompt("");
    setChatBusy(true);
    setChatError(null);
    try {
      const res = await postJson("/api/chat", { messages: next });
      const data = await res.json();
      if (!res.ok) {
        setChatError(data?.error?.message ?? data?.error ?? `chat failed (${res.status})`);
        return;
      }
      const reply = data?.choices?.[0]?.message?.content ?? "(no content)";
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "network error");
    } finally {
      setChatBusy(false);
    }
  }

  async function runSearch() {
    const q = query.trim();
    if (!q || searchBusy) return;
    setSearchBusy(true);
    setSearchResult(null);
    try {
      const res = await postJson("/api/search", { query: q });
      const data = await res.json();
      setSearchResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setSearchResult(err instanceof Error ? err.message : "network error");
    } finally {
      setSearchBusy(false);
    }
  }

  return (
    <main className="app">
      <header className="app__header">
        <h1>Hermes Buddy Starter</h1>
        <p className="app__sub">
          Vite + React front end, Hono server. Keys stay on the server; the
          browser only calls <code>/api/*</code>.
        </p>
        {health && (
          <div className="badges">
            <span className="badge">model: {health.model}</span>
            <span className={`badge ${health.keys.nebius ? "badge--ok" : "badge--warn"}`}>
              Nebius key {health.keys.nebius ? "set" : "missing"}
            </span>
            <span className={`badge ${health.keys.tavily ? "badge--ok" : "badge--warn"}`}>
              Tavily key {health.keys.tavily ? "set" : "missing"}
            </span>
          </div>
        )}
      </header>

      <section className="panel">
        <h2>Chat (Nebius Token Factory + Nemotron)</h2>
        <div className="chat">
          {messages.length === 0 && <p className="muted">Ask the model something.</p>}
          {messages.map((m, i) => (
            <div key={i} className={`bubble bubble--${m.role}`}>
              <strong>{m.role}</strong>
              <span>{m.content}</span>
            </div>
          ))}
        </div>
        {chatError && <p className="error">{chatError}</p>}
        <div className="row">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendChat()}
            placeholder="Type a message"
          />
          <button onClick={sendChat} disabled={chatBusy}>
            {chatBusy ? "..." : "Send"}
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Search (Tavily)</h2>
        <div className="row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Search the web"
          />
          <button onClick={runSearch} disabled={searchBusy}>
            {searchBusy ? "..." : "Search"}
          </button>
        </div>
        {searchResult && <pre className="result">{searchResult}</pre>}
      </section>
    </main>
  );
}
