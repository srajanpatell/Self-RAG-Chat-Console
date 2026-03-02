from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List


class IngestTextRequest(BaseModel):
    title: str = Field(min_length=1)
    text: str = Field(min_length=1)


class ChatRequest(BaseModel):
    query: str = Field(min_length=2)


class Source(BaseModel):
    document_id: str
    chunk_id: str
    title: str
    score: float
    chunk_text: str


class ChatResponse(BaseModel):
    answer: str
    needs_more_context: bool
    sources: List[Source]
