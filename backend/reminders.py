import os
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import Callable

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import or_
from sqlalchemy.orm import Session, sessionmaker

from database import SessionLocal
from models import Task, User


ReminderSender = Callable[[User, list[Task]], bool]
scheduler: BackgroundScheduler | None = None


def _env_flag(name: str, default: bool = True) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def send_due_task_email(user: User, tasks: list[Task]) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("FROM_EMAIL", "").strip()
    if not smtp_host or not from_email:
        return False

    lines = [
        f"Hi {user.name or user.email},",
        "",
        "These tasks are due within the next 24 hours:",
        "",
    ]
    for task in tasks:
        lines.append(f"- {task.title} (due {task.due_date.isoformat()}, priority {task.priority})")
    lines.extend(["", "You can disable these reminders in your TaskFlow account settings."])

    message = EmailMessage()
    message["Subject"] = f"TaskFlow reminder: {len(tasks)} task{'s' if len(tasks) != 1 else ''} due soon"
    message["From"] = from_email
    message["To"] = user.email
    message.set_content("\n".join(lines))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as smtp:
            if _env_flag("SMTP_USE_TLS"):
                smtp.starttls()
            if smtp_user:
                smtp.login(smtp_user, smtp_password)
            smtp.send_message(message)
        return True
    except (OSError, smtplib.SMTPException):
        return False


def run_due_task_reminders(
    session_factory: sessionmaker = SessionLocal,
    send_email: ReminderSender = send_due_task_email,
    current_time: datetime | None = None,
) -> int:
    now = current_time or datetime.now()
    today = now.date()
    reminder_cutoff = (now + timedelta(hours=24)).date()
    sent_count = 0

    with session_factory() as db:
        db: Session
        users = db.query(User).filter(User.email_reminders_enabled.is_(True)).all()
        for user in users:
            tasks = db.query(Task).filter(
                Task.user_id == user.id,
                Task.status != "Done",
                Task.due_date.is_not(None),
                Task.due_date >= today,
                Task.due_date <= reminder_cutoff,
                or_(Task.last_reminded_at.is_(None), Task.last_reminded_at < datetime.combine(today, datetime.min.time())),
            ).order_by(Task.due_date, Task.priority, Task.title).all()
            if not tasks or not send_email(user, tasks):
                continue

            for task in tasks:
                task.last_reminded_at = now
            db.commit()
            sent_count += 1

    return sent_count


def start_reminder_scheduler() -> BackgroundScheduler:
    global scheduler
    if scheduler and scheduler.running:
        return scheduler

    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_due_task_reminders,
        trigger="interval",
        hours=1,
        id="task_due_email_reminders",
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    scheduler.start()
    return scheduler


def stop_reminder_scheduler() -> None:
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
    scheduler = None
