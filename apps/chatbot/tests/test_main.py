from __future__ import annotations

from typing import Any

import pytest
from fastapi import HTTPException
import app.main as main
from app.schemas import ChatRequest, IngestTextRequest


class DummySession:
    pass


class DummyUpload:
    def __init__(self, filename: str, payload: bytes):
        self.filename = filename
        self._payload = payload

    async def read(self) -> bytes:
        return self._payload


@pytest.mark.asyncio
async def test_health():
    assert await main.health() == {"status": "ok"}


@pytest.mark.asyncio
async def test_ingest_text_calls_ingest_document(monkeypatch):
    captured: dict[str, Any] = {}

    async def fake_ingest_document(session, title: str, content: str):
        captured["title"] = title
        captured["content"] = content
        return {"document_id": "doc-1", "title": title, "chunks": 1}

    monkeypatch.setattr(main, "ingest_document", fake_ingest_document)

    result = await main.ingest_text(IngestTextRequest(title="Doc", text="Hello world"), session=DummySession())
    assert result["document_id"] == "doc-1"
    assert captured == {"title": "Doc", "content": "Hello world"}


@pytest.mark.asyncio
async def test_ingest_file_txt(monkeypatch):
    async def fake_ingest_document(session, title: str, content: str):
        return {"document_id": "doc-txt", "title": title, "chunks": 1, "content": content}

    monkeypatch.setattr(main, "ingest_document", fake_ingest_document)

    upload = DummyUpload(filename="notes.txt", payload=b"alpha beta gamma")
    result = await main.ingest_file(upload, session=DummySession())

    assert result["document_id"] == "doc-txt"
    assert result["title"] == "notes.txt"


@pytest.mark.asyncio
async def test_ingest_file_unsupported_extension():
    upload = DummyUpload(filename="notes.csv", payload=b"a,b,c")

    with pytest.raises(HTTPException) as exc:
        await main.ingest_file(upload, session=DummySession())

    assert exc.value.status_code == 400
    assert exc.value.detail == "Unsupported file type"


@pytest.mark.asyncio
async def test_chat_no_context(monkeypatch):
    monkeypatch.setattr(main.embedder, "encode", lambda _: [0.1, 0.2, 0.3])

    async def fake_hybrid_search(session, query: str, query_embedding, top_k: int = 6):
        return []

    monkeypatch.setattr(main, "hybrid_search", fake_hybrid_search)

    res = await main.chat(ChatRequest(query="anything"), session=DummySession())
    assert res.needs_more_context is True
    assert res.sources == []


@pytest.mark.asyncio
async def test_chat_with_context_and_sources(monkeypatch):
    monkeypatch.setattr(main.embedder, "encode", lambda _: [0.2, 0.4, 0.6])

    async def fake_hybrid_search(session, query: str, query_embedding, top_k: int = 6):
        return [
            {
                "chunk_id": "chunk-1",
                "document_id": "doc-1",
                "title": "Doc",
                "chunk_text": "Self-RAG explanation",
                "score": 0.91,
            }
        ]

    monkeypatch.setattr(main, "hybrid_search", fake_hybrid_search)
    monkeypatch.setattr(main.llm, "draft_answer", lambda q, c: "draft")
    monkeypatch.setattr(main.llm, "self_check", lambda q, d: {"needs_more_context": False, "query_refinement": q})
    monkeypatch.setattr(main.llm, "final_answer", lambda q, c: "final answer")

    res = await main.chat(ChatRequest(query="What is Self-RAG?"), session=DummySession())

    assert res.answer == "final answer"
    assert res.needs_more_context is False
    assert len(res.sources) == 1
    assert res.sources[0].chunk_id == "chunk-1"
