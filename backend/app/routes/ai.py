from __future__ import annotations

from datetime import datetime, timedelta, timezone, date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.deps import get_current_user_id
from app.core.config import settings

router = APIRouter(tags=["ai"])


class DueDateSuggestIn(BaseModel):
    title: str
    description: str | None = None


class DueDateSuggestOut(BaseModel):
    due_date: str  # YYYY-MM-DD
    confidence: str
    reasoning: str


def _fallback_due_date(days: int = 3) -> str:
    d = (datetime.now(timezone.utc) + timedelta(days=days)).date()
    return d.isoformat()


def _as_yyyy_mm_dd(s: str) -> str:
    # Accept "YYYY-MM-DD" or ISO strings; normalize to YYYY-MM-DD
    try:
        if len(s) >= 10:
            return s[:10]
        return s
    except Exception:
        return _fallback_due_date()


@router.post("/ai/suggest-due-date", response_model=DueDateSuggestOut)
async def suggest_due_date(
    payload: DueDateSuggestIn,
    user_id: str = Depends(get_current_user_id),
):
    api_key = getattr(settings, "OPENAI_API_KEY", "") or ""
    if not api_key.strip():
        # For submission: don't crash; return explicit fallback and explain.
        return DueDateSuggestOut(
            due_date=_fallback_due_date(3),
            confidence="low",
            reasoning="OPENAI_API_KEY not configured in this environment; fallback (+3 days).",
        )

    # --- OpenAI call (server-side only) ---
    try:
        from openai import OpenAI  # pip install openai
    except Exception:
        return DueDateSuggestOut(
            due_date=_fallback_due_date(3),
            confidence="low",
            reasoning="OpenAI SDK not installed; fallback (+3 days).",
        )

    client = OpenAI(api_key=api_key)

    # Keep the prompt tight and controlled
    title = (payload.title or "").strip()
    desc = (payload.description or "").strip()
    text = f"Title: {title}\nDescription: {desc}".strip()

    today = datetime.now(timezone.utc).date().isoformat()

    system = (
        "You are a helpful assistant that proposes a due date for a task.\n"
        "Return STRICT JSON with keys: due_date (YYYY-MM-DD), confidence (low|medium|high), reasoning (<=140 chars).\n"
        "Rules:\n"
        f"- Today's date is {today}.\n"
        "- If user says 'tomorrow', 'next week', etc., resolve appropriately.\n"
        "- If unclear, choose a reasonable date within 3-14 days.\n"
        "- Do not include any extra keys or text."
    )

    try:
        resp = client.chat.completions.create(
            model=getattr(settings, "OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": text},
            ],
            temperature=0.2,
            max_tokens=120,
        )

        content = resp.choices[0].message.content or ""
        # Parse the JSON safely without being fragile
        import json

        data = json.loads(content)
        due_date = _as_yyyy_mm_dd(str(data.get("due_date", "")))
        confidence = str(data.get("confidence", "medium")).lower()
        reasoning = str(data.get("reasoning", "")).strip()

        if confidence not in {"low", "medium", "high"}:
            confidence = "medium"

        if not due_date or len(due_date) != 10:
            due_date = _fallback_due_date(7)
            confidence = "low"
            reasoning = "AI output invalid date; fallback to +7 days."

        if len(reasoning) > 140:
            reasoning = reasoning[:140].rstrip()

        return DueDateSuggestOut(due_date=due_date, confidence=confidence, reasoning=reasoning)

    except Exception:
        # Never take down the app because AI fails
        return DueDateSuggestOut(
            due_date=_fallback_due_date(7),
            confidence="low",
            reasoning="AI call failed; fallback to +7 days.",
        )
