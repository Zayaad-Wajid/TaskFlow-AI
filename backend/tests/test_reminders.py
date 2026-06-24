from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from models import Base, Task, User
from reminders import run_due_task_reminders


def test_due_task_reminders_respect_preferences_and_daily_deduplication():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    Base.metadata.create_all(bind=engine)
    now = datetime(2026, 6, 24, 9, 0)

    with TestingSessionLocal() as db:
        opted_in = User(
            email="reminders@example.com",
            hashed_password="not-used",
            name="Reminder User",
            email_reminders_enabled=True,
            created_at=now,
        )
        opted_out = User(
            email="quiet@example.com",
            hashed_password="not-used",
            name="Quiet User",
            email_reminders_enabled=False,
            created_at=now,
        )
        db.add_all([opted_in, opted_out])
        db.flush()
        db.add_all([
            Task(
                id="due-task",
                user_id=opted_in.id,
                title="Due tomorrow",
                due_date=(now + timedelta(hours=20)).date(),
                status="To Do",
                created_at=now,
                updated_at=now,
            ),
            Task(
                id="opted-out-task",
                user_id=opted_out.id,
                title="Do not email",
                due_date=now.date(),
                status="To Do",
                created_at=now,
                updated_at=now,
            ),
        ])
        db.commit()

    deliveries = []

    def fake_sender(user, tasks):
        deliveries.append((user.email, [task.id for task in tasks]))
        return True

    first_run = run_due_task_reminders(TestingSessionLocal, fake_sender, now)
    second_run = run_due_task_reminders(TestingSessionLocal, fake_sender, now + timedelta(hours=1))

    assert first_run == 1
    assert second_run == 0
    assert deliveries == [("reminders@example.com", ["due-task"])]

    with TestingSessionLocal() as db:
        task = db.get(Task, "due-task")
        assert task.last_reminded_at == now
