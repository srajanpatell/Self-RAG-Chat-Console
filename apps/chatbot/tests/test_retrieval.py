from __future__ import annotations

import pytest

from app.retrieval import chunk_text, hybrid_search


class FakeMappings:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def mappings(self):
        return FakeMappings(self._rows)


class FakeSession:
    def __init__(self, sparse_rows, dense_rows):
        self.calls = 0
        self._sparse_rows = sparse_rows
        self._dense_rows = dense_rows

    async def execute(self, sql, params=None):
        self.calls += 1
        if self.calls == 1:
            return FakeResult(self._sparse_rows)
        return FakeResult(self._dense_rows)


def test_chunk_text_short():
    text = "short text"
    assert chunk_text(text, max_len=50) == [text]


def test_chunk_text_long_with_overlap():
    text = "a" * 1000
    chunks = chunk_text(text, max_len=300, overlap=50)
    assert len(chunks) > 1
    assert len(chunks[0]) == 300
    assert len(chunks[1]) == 300


@pytest.mark.asyncio
async def test_hybrid_search_fuses_sparse_and_dense_scores():
    sparse_rows = [
        {
            "chunk_id": "chunk-1",
            "document_id": "doc-1",
            "title": "Doc 1",
            "chunk_text": "alpha beta",
            "sparse_score": 0.8,
        }
    ]

    dense_rows = [
        {
            "chunk_id": "chunk-2",
            "document_id": "doc-2",
            "title": "Doc 2",
            "chunk_text": "gamma delta",
            "embedding_text": "[1,0,0]",
        },
        {
            "chunk_id": "chunk-1",
            "document_id": "doc-1",
            "title": "Doc 1",
            "chunk_text": "alpha beta",
            "embedding_text": "[0.9,0.1,0]",
        },
    ]

    session = FakeSession(sparse_rows=sparse_rows, dense_rows=dense_rows)
    results = await hybrid_search(session, "query", [1, 0, 0], top_k=3)

    assert len(results) == 2
    assert results[0]["chunk_id"] == "chunk-1"
    assert "score" in results[0]
    assert all("chunk_id" in r and "score" in r for r in results)
