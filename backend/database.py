import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker


load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
INSTANCE_DIR = BASE_DIR / "instance"
SQLITE_DATABASE_URL = f"sqlite:///{INSTANCE_DIR / 'taskflow_ai.db'}"


def _candidate_database_url() -> str:
    return os.getenv("DATABASE_URL", "").strip()


def _engine_for_url(database_url: str):
    connect_args = {}
    if database_url.startswith("sqlite"):
        INSTANCE_DIR.mkdir(exist_ok=True)
        connect_args = {"check_same_thread": False}
    elif database_url.startswith("postgresql"):
        connect_args = {"connect_timeout": 2}

    return create_engine(database_url, connect_args=connect_args, future=True)


def _create_engine_with_fallback():
    database_url = _candidate_database_url()
    if database_url:
        engine = _engine_for_url(database_url)
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return engine
        except Exception:
            engine.dispose()

    return _engine_for_url(SQLITE_DATABASE_URL)


engine = _create_engine_with_fallback()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
