import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from database import SessionLocal, engine
from auth import get_password_hash
from models import Activity, AppSetting, Base, Comment, Habit, Task, TimeLog, User


DATA_FILE = ROOT / "tasks_data.json"
DEFAULT_LISTS = ["To Do", "In Progress", "Done"]
DEFAULT_CAPACITY_MINUTES = 6 * 60


def parse_datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def parse_date(value):
    parsed = parse_datetime(value)
    return parsed.date() if parsed else None


def dumps(value):
    return json.dumps(value or [])


def tags_to_text(tags):
    return ",".join(tag.strip() for tag in (tags or []) if str(tag).strip())


def get_default_task():
    now = datetime.now().isoformat(timespec="seconds")
    return {
        "id": str(uuid.uuid4()),
        "title": "",
        "description": "",
        "status": "To Do",
        "priority": "Medium",
        "due_date": "",
        "tags": [],
        "assigned_to": "",
        "estimate_minutes": 30,
        "scheduled_start": "",
        "scheduled_end": "",
        "comments": [],
        "subtasks": [],
        "dependency_ids": [],
        "recurring": {"enabled": False, "cadence": "", "next_due_date": ""},
        "time_logs": [],
        "focus_minutes": 0,
        "recurrence_parent_id": "",
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
    }


def normalize_task(task):
    defaults = get_default_task()
    defaults.update(task or {})
    defaults["tags"] = defaults.get("tags") or []
    defaults["comments"] = defaults.get("comments") or []
    defaults["subtasks"] = defaults.get("subtasks") or []
    defaults["dependency_ids"] = defaults.get("dependency_ids") or []
    defaults["time_logs"] = defaults.get("time_logs") or []
    defaults["recurring"] = {**get_default_task()["recurring"], **(defaults.get("recurring") or {})}
    return defaults


def load_json_data():
    if not DATA_FILE.exists():
        return {"tasks": [], "lists": DEFAULT_LISTS, "habits": [], "activity_feed": [], "settings": {}}
    with DATA_FILE.open("r", encoding="utf-8") as f:
        data = json.load(f)
    data.setdefault("tasks", [])
    data.setdefault("lists", DEFAULT_LISTS)
    data.setdefault("habits", [])
    data.setdefault("activity_feed", [])
    data.setdefault("settings", {"weekly_capacity_minutes": DEFAULT_CAPACITY_MINUTES * 5})
    data["tasks"] = [normalize_task(task) for task in data["tasks"]]
    return data


def migrate():
    Base.metadata.create_all(bind=engine)
    data = load_json_data()

    with SessionLocal() as db:
        owner = db.query(User).order_by(User.id).first()
        if owner is None:
            owner = User(
                email="demo@example.com",
                hashed_password=get_password_hash("demo123"),
                name="Demo User",
                created_at=datetime.now(),
            )
            db.add(owner)
            db.flush()

        tasks = {}
        for item in data["tasks"]:
            existing = db.get(Task, item["id"])
            task = existing or Task(id=item["id"])
            task.user_id = owner.id
            task.title = item.get("title", "")
            task.description = item.get("description", "")
            task.status = item.get("status", "To Do")
            task.priority = item.get("priority", "Medium")
            task.due_date = parse_date(item.get("due_date"))
            task.tags = tags_to_text(item.get("tags"))
            task.assigned_to = item.get("assigned_to", "")
            task.estimate_minutes = int(item.get("estimate_minutes") or 30)
            task.scheduled_start = parse_datetime(item.get("scheduled_start"))
            task.scheduled_end = parse_datetime(item.get("scheduled_end"))
            task.subtasks_json = dumps(item.get("subtasks"))
            recurring = item.get("recurring") or {}
            task.recurring_enabled = bool(recurring.get("enabled"))
            task.recurring_cadence = recurring.get("cadence", "")
            task.recurring_next_due_date = parse_date(recurring.get("next_due_date"))
            task.focus_minutes = int(item.get("focus_minutes") or 0)
            task.recurrence_parent_id = item.get("recurrence_parent_id") or None
            task.created_at = parse_datetime(item.get("created_at")) or datetime.now()
            task.updated_at = parse_datetime(item.get("updated_at")) or datetime.now()
            task.completed_at = parse_datetime(item.get("completed_at"))
            db.add(task)
            tasks[task.id] = (task, item)

        db.flush()

        for task, item in tasks.values():
            task.dependencies = [
                tasks[dependency_id][0]
                for dependency_id in item.get("dependency_ids", [])
                if dependency_id in tasks and dependency_id != task.id
            ]

            if not task.comments:
                for comment in item.get("comments", []):
                    db.add(Comment(
                        id=comment.get("id") or str(uuid.uuid4()),
                        task_id=task.id,
                        author=comment.get("author", "Teammate"),
                        text=comment.get("text", ""),
                        created_at=parse_datetime(comment.get("created_at")) or datetime.now(),
                    ))

            if not task.time_logs:
                for log in item.get("time_logs", []):
                    db.add(TimeLog(
                        id=log.get("id") or str(uuid.uuid4()),
                        task_id=task.id,
                        minutes=int(log.get("minutes") or 0),
                        source=log.get("source", "manual"),
                        note=log.get("note", ""),
                        started_at=parse_datetime(log.get("started_at")),
                        ended_at=parse_datetime(log.get("ended_at")),
                        created_at=parse_datetime(log.get("created_at")) or datetime.now(),
                    ))

        for item in data.get("habits", []):
            habit = db.get(Habit, item.get("id")) if item.get("id") else None
            habit = habit or Habit(id=item.get("id") or str(uuid.uuid4()))
            habit.user_id = owner.id
            habit.name = item.get("name", "New Habit")
            habit.frequency = item.get("frequency", "Daily")
            habit.streak = int(item.get("streak") or 0)
            habit.completed_dates = dumps(item.get("completed_dates"))
            habit.created_at = parse_datetime(item.get("created_at")) or datetime.now()
            db.add(habit)

        if db.query(Activity).count() == 0:
            for item in data.get("activity_feed", []):
                db.add(Activity(
                    id=item.get("id") or str(uuid.uuid4()),
                    user_id=owner.id,
                    action=item.get("action", ""),
                    task_id=item.get("task_id", ""),
                    task_title=item.get("task_title", ""),
                    detail=item.get("detail", ""),
                    actor=item.get("actor", "TaskFlow"),
                    created_at=parse_datetime(item.get("created_at")) or datetime.now(),
                ))

        settings = {
            "lists": data.get("lists", DEFAULT_LISTS),
            "weekly_capacity_minutes": data.get("settings", {}).get("weekly_capacity_minutes", DEFAULT_CAPACITY_MINUTES * 5),
        }
        for key, value in settings.items():
            setting = db.get(AppSetting, key) or AppSetting(key=key)
            setting.value = json.dumps(value)
            db.add(setting)

        db.commit()

    print(f"Migrated {len(data['tasks'])} task(s), {len(data.get('habits', []))} habit(s), and {len(data.get('activity_feed', []))} activity item(s).")


if __name__ == "__main__":
    migrate()
