from __future__ import annotations
import json
from urllib import request
from .config import OLLAMA_BASE_URL, OLLAMA_MODEL


class LLMClient:
    def __init__(self) -> None:
        self.base_url = OLLAMA_BASE_URL.rstrip("/")
        self.model = OLLAMA_MODEL

    def _chat(self, system: str, user: str) -> str:
        prompt = f"System:\\n{system}\\n\\nUser:\\n{user}"
        payload = {
            "model": self.model,
            "stream": False,
            "prompt": prompt,
            "options": {"temperature": 0.1},
        }
        req = request.Request(
            f"{self.base_url}/api/generate",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=120) as response:
            body = json.loads(response.read().decode("utf-8"))
        return body.get("response", "").strip()

    def draft_answer(self, query: str, context: str) -> str:
        return self._chat(
            "You answer using only given context. If insufficient, say what is missing.",
            f"Question:\n{query}\n\nContext:\n{context}",
        )

    def self_check(self, query: str, draft: str) -> dict:
        content = self._chat(
            "Return strict JSON: {\"needs_more_context\": bool, \"query_refinement\": string}.",
            f"Question:\n{query}\n\nDraft:\n{draft}",
        )
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            return {"needs_more_context": False, "query_refinement": query}

    def final_answer(self, query: str, context: str) -> str:
        return self._chat(
            "Provide concise, factual answer grounded in context and mention uncertainty if any.",
            f"Question:\n{query}\n\nContext:\n{context}",
        )
