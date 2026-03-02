from __future__ import annotations
import hashlib
import math


class Embedder:
    def __init__(self) -> None:
        self.dim = 384

    def encode(self, text: str) -> list[float]:
        # Lightweight deterministic embedding for constrained runtime environments.
        vec = [0.0] * self.dim
        tokens = text.lower().split()
        if not tokens:
            return vec

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            idx = int.from_bytes(digest[:2], "big") % self.dim
            sign = -1.0 if (digest[2] % 2 == 0) else 1.0
            weight = 0.5 + (digest[3] / 255.0)
            vec[idx] += sign * weight

        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]
