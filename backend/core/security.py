import os
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=True)

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "CHANGE-THIS-SECRET-KEY-IN-PRODUCTION-MINIMUM-32-CHARS"
)

ALGORITHM = "HS256"
EXPIRE_MINUTES = 60 * 24 * 7

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Password Hashing ─────────────────────────────

def hash_password(pw: str) -> str:
    pw = pw[:72]   # bcrypt limit
    return pwd_ctx.hash(pw)


def verify_password(plain: str, hashed: str) -> bool:
    plain = plain[:72]
    return pwd_ctx.verify(plain, hashed)


# ── JWT Token Creation ───────────────────────────

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ── Current User Dependency ──────────────────────

def get_current_user(
    token: str = Depends(oauth2),
    db: Session = Depends(get_db)
):
    from database import User

    credentials_exception = HTTPException(
        status_code=401,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")

        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()

    if user is None:
        raise credentials_exception

    return user