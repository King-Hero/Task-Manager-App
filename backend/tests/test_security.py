from datetime import timedelta
import pytest
from jose import jwt

from app.core.security import hash_password, verify_password, create_token, ALGO
from app.core.config import settings
from app.core.deps import get_current_user_id


def test_password_hash_and_verify():
    pw = "Password123"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_create_token_has_expected_claims():
    sub = "user-123"
    tok = create_token(sub=sub, token_type="access", expires_delta=timedelta(minutes=5))
    payload = jwt.decode(tok, settings.JWT_SECRET, algorithms=[ALGO])

    assert payload["sub"] == sub
    assert payload["type"] == "access"
    assert "exp" in payload
    assert "iat" in payload


def test_get_current_user_id_parses_bearer_token():
    sub = "user-xyz"
    tok = create_token(sub=sub, token_type="access", expires_delta=timedelta(minutes=5))

    # valid
    user_id = get_current_user_id(authorization=f"Bearer {tok}")
    assert user_id == sub

    # invalid cases
    with pytest.raises(Exception):
        get_current_user_id(authorization=None)

    with pytest.raises(Exception):
        get_current_user_id(authorization="Basic abcdef")
