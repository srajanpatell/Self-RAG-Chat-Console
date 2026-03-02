from __future__ import annotations
import math
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


def chunk_text(text_value: str, max_len: int = 700, overlap: int = 120) -> list[str]:
    text_value = text_value.strip()
    if len(text_value) <= max_len:
        return [text_value]

    chunks: list[str] = []
    start = 0
    while start < len(text_value):
        end = min(len(text_value), start + max_len)
        chunks.append(text_value[start:end])
        if end == len(text_value):
            break
        start = max(0, end - overlap)
    return chunks


async def upsert_chunk_fts(session: AsyncSession, chunk_id: str) -> None:
    await session.execute(
        text(
            """
            UPDATE chunks
            SET text_search = to_tsvector('english', chunk_text)
            WHERE id = :chunk_id
            """
        ),
        {"chunk_id": chunk_id},
    )


async def hybrid_search(session: AsyncSession, query: str, query_embedding: list[float], top_k: int = 6) -> list[dict]:
    sparse_sql = text(
        """
        SELECT
          c.id AS chunk_id,
          c.document_id AS document_id,
          d.title AS title,
          c.chunk_text AS chunk_text,
          ts_rank_cd(c.text_search, plainto_tsquery('english', :query)) AS sparse_score
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        WHERE c.text_search @@ plainto_tsquery('english', :query)
        ORDER BY sparse_score DESC
        LIMIT 30
        """
    )

    dense_sql = text(
        """
        SELECT
          c.id AS chunk_id,
          c.document_id AS document_id,
          d.title AS title,
          c.chunk_text AS chunk_text,
          c.embedding::text AS embedding_text
        FROM chunks c
        JOIN documents d ON d.id = c.document_id
        LIMIT 200
        """
    )

    sparse_res = await session.execute(sparse_sql, {"query": query})
    sparse_rows = [dict(r) for r in sparse_res.mappings().all()]

    dense_res = await session.execute(dense_sql)
    dense_rows_raw = [dict(r) for r in dense_res.mappings().all()]

    def parse_embedding(text_value: str) -> list[float]:
        trimmed = text_value.strip().strip("[]")
        if not trimmed:
            return []
        return [float(x) for x in trimmed.split(",")]

    def cosine_similarity(a: list[float], b: list[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a)) or 1.0
        norm_b = math.sqrt(sum(y * y for y in b)) or 1.0
        return dot / (norm_a * norm_b)

    dense_rows: list[dict] = []
    for row in dense_rows_raw:
        emb = parse_embedding(row["embedding_text"])
        score = cosine_similarity(query_embedding, emb)
        dense_rows.append(
            {
                "chunk_id": row["chunk_id"],
                "document_id": row["document_id"],
                "title": row["title"],
                "chunk_text": row["chunk_text"],
                "dense_score": score,
            }
        )
    dense_rows.sort(key=lambda r: r["dense_score"], reverse=True)
    dense_rows = dense_rows[:30]

    merged: dict[str, dict] = {}
    for row in sparse_rows:
        merged[row["chunk_id"]] = {
            "chunk_id": row["chunk_id"],
            "document_id": row["document_id"],
            "title": row["title"],
            "chunk_text": row["chunk_text"],
            "sparse_score": float(row.get("sparse_score") or 0.0),
            "dense_score": 0.0,
        }

    for row in dense_rows:
        existing = merged.get(row["chunk_id"])
        if existing:
            existing["dense_score"] = float(row["dense_score"])
        else:
            merged[row["chunk_id"]] = {
                "chunk_id": row["chunk_id"],
                "document_id": row["document_id"],
                "title": row["title"],
                "chunk_text": row["chunk_text"],
                "sparse_score": 0.0,
                "dense_score": float(row["dense_score"]),
            }

    fused = []
    for row in merged.values():
        score = 0.45 * row["sparse_score"] + 0.55 * row["dense_score"]
        fused.append(
            {
                "chunk_id": row["chunk_id"],
                "document_id": row["document_id"],
                "title": row["title"],
                "chunk_text": row["chunk_text"],
                "score": score,
            }
        )

    fused.sort(key=lambda r: r["score"], reverse=True)
    return fused[:top_k]
