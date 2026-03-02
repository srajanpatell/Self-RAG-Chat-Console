"use client";

import { FormEvent, useMemo, useState } from "react";

type Source = {
  document_id: string;
  chunk_id: string;
  title: string;
  score: number;
  chunk_text: string;
};

type ChatResponse = {
  answer: string;
  needs_more_context: boolean;
  sources: Source[];
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [docText, setDocText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latestSources = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    return lastAssistant?.sources ?? [];
  }, [messages]);

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;

    const userMessage: Message = { role: "user", content: question.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsAsking(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage.content })
      });
      if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
      const data: ChatResponse = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer, sources: data.sources }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error while chatting.");
    } finally {
      setIsAsking(false);
    }
  };

  const ingestText = async (event: FormEvent) => {
    event.preventDefault();
    if (!docTitle.trim() || !docText.trim()) return;
    setIsIngesting(true);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/ingest/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: docTitle.trim(), text: docText.trim() })
      });
      if (!res.ok) throw new Error(`Ingestion failed: ${res.status}`);
      setDocTitle("");
      setDocText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error while ingesting.");
    } finally {
      setIsIngesting(false);
    }
  };

  const ingestFile = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setIsIngesting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${apiBase}/ingest/file`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error(`File ingestion failed: ${res.status}`);
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error while ingesting file.");
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <main style={{ padding: 20, maxWidth: 1200, margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <h1>Self-RAG Chat Console</h1>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
          <h2>Chat</h2>
          <div style={{ minHeight: 300, maxHeight: 420, overflowY: "auto", marginBottom: 12 }}>
            {messages.length === 0 ? (
              <p>Ingest your documents, then ask questions.</p>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 10,
                    marginBottom: 8,
                    background: m.role === "user" ? "#e0f2fe" : "#f8fafc",
                    borderLeft: m.role === "user" ? "4px solid #0284c7" : "4px solid #64748b"
                  }}
                >
                  <strong>{m.role === "user" ? "You" : "Assistant"}</strong>
                  <p style={{ margin: "6px 0", whiteSpace: "pre-wrap" }}>{m.content}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={ask} style={{ display: "flex", gap: 8 }}>
            <input
              style={{ flex: 1, padding: 10 }}
              placeholder="Ask a question about your documents..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button type="submit" disabled={isAsking}>
              {isAsking ? "Asking..." : "Ask"}
            </button>
          </form>
        </section>

        <aside style={{ display: "grid", gap: 16 }}>
          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
            <h3>Ingest Text</h3>
            <form onSubmit={ingestText} style={{ display: "grid", gap: 8 }}>
              <input placeholder="Title" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} required />
              <textarea
                placeholder="Document text"
                rows={6}
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                required
              />
              <button type="submit" disabled={isIngesting}>
                {isIngesting ? "Ingesting..." : "Ingest"}
              </button>
            </form>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
            <h3>Ingest File</h3>
            <form onSubmit={ingestFile} style={{ display: "grid", gap: 8 }}>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button type="submit" disabled={!file || isIngesting}>
                {isIngesting ? "Uploading..." : "Upload & Ingest"}
              </button>
            </form>
          </section>

          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
            <h3>Sources</h3>
            {latestSources.length === 0 ? (
              <p>No citations yet.</p>
            ) : (
              latestSources.map((s) => (
                <div key={s.chunk_id} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
                  <strong>{s.title}</strong>
                  <p style={{ margin: "4px 0" }}>Score: {s.score.toFixed(3)}</p>
                  <p style={{ margin: "4px 0", color: "#555" }}>{s.chunk_text.slice(0, 160)}...</p>
                </div>
              ))
            )}
          </section>

          {error ? (
            <section style={{ border: "1px solid #fca5a5", background: "#fef2f2", padding: 10, borderRadius: 8 }}>
              {error}
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
