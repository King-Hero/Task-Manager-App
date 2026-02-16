from datetime import date, datetime, timedelta, timezone
import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.deps import get_current_user_id

router = APIRouter(tags=["ai"])


class SuggestDueDateIn(BaseModel):
    title: str 
    description: str | None = None


class SuggestDueDateOut(BaseModel):
    due_date: str  # YYYY-MM-DD
    confidence: str  # low|medium|high
    reasoning: str | None = None


def today_utc() -> date:
    return datetime.now(timezone.utc).date()


def fallback_due_date() -> date:
    return today_utc() + timedelta(days=3)


@router.post("/ai/suggest-due-date", response_model=SuggestDueDateOut)
async def suggest_due_date(
    payload: SuggestDueDateIn,
    user_id: str = Depends(get_current_user_id),
):
    if not settings.OPENAI_API_KEY:
        # reviewer-friendly error
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    title = payload.title.strip()
    desc = (payload.description or "").strip()
    desc = desc[: settings.AI_MAX_CHARS]

    # OpenAI call with strict JSON output
    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        model = settings.OPENAI_MODEL

        system = (
            "You are a task management assistant. "
            "Return ONLY valid JSON (no markdown). "
            "Schema: {\"due_date\":\"YYYY-MM-DD\",\"confidence\":\"low|medium|high\",\"reasoning\":\"...\"}. "
            "Rules: due_date must be today or later. "
            "If unclear, choose a reasonable date within the next 14 days."
        )

        user_msg = {
            "today": today_utc().isoformat(),
            "task": {"title": title, "description": desc},
        }

        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(user_msg)},
            ],
            temperature=0.2,
            max_tokens=160,
        )

        content = (resp.choices[0].message.content or "").strip()
        data = json.loads(content)

        due_str = str(data.get("due_date", "")).strip()
        conf = str(data.get("confidence", "low")).strip().lower()
        reasoning = data.get("reasoning")

        d = date.fromisoformat(due_str)
        if d < today_utc():
            raise ValueError("due_date is in the past")

        if conf not in {"low", "medium", "high"}:
            conf = "low"

        # clamp if too far out
        horizon = today_utc() + timedelta(days=14)
        if d > horizon:
            d = horizon
            conf = "low"

        return {
            "due_date": d.isoformat(),
            "confidence": conf,
            "reasoning": str(reasoning) if reasoning else None,
        }

    except Exception:
        # safe fallback
        d = fallback_due_date()
        return {
            "due_date": d.isoformat(),
            "confidence": "low",
            "reasoning": "Fallback suggestion (AI unavailable).",
        }
