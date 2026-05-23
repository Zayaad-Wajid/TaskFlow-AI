from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime, timedelta
import uuid
from agent import get_agent
from asgiref.wsgi import WsgiToAsgi

app = Flask(__name__)
CORS(app)  # Enable CORS for React dev server

# Initialize AI agent (Gemini when GEMINI_API_KEY is set, rule-based otherwise)
agent = get_agent(os.getenv("GEMINI_API_KEY"))

# ASGI wrapper for Uvicorn: uvicorn app:asgi_app --reload
asgi_app = WsgiToAsgi(app)

# Data file path
DATA_FILE = "tasks_data.json"
DEFAULT_LISTS = ["To Do", "In Progress", "Done"]
DEFAULT_CAPACITY_MINUTES = 6 * 60


def now_iso():
    return datetime.now().isoformat(timespec="seconds")


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except (TypeError, ValueError):
        return None


def get_default_task():
    """Return default task structure."""
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
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "completed_at": None,
    }


def normalize_task(task):
    defaults = get_default_task()
    defaults.update(task)
    defaults["tags"] = defaults.get("tags") or []
    defaults["comments"] = defaults.get("comments") or []
    defaults["subtasks"] = defaults.get("subtasks") or []
    defaults["dependency_ids"] = defaults.get("dependency_ids") or []
    defaults["time_logs"] = defaults.get("time_logs") or []
    defaults["recurring"] = {**get_default_task()["recurring"], **(defaults.get("recurring") or {})}
    return defaults


def normalize_data(data):
    data = data or {}
    data.setdefault("tasks", [])
    data.setdefault("lists", DEFAULT_LISTS)
    data.setdefault("habits", [])
    data.setdefault("activity_feed", [])
    data.setdefault("settings", {"weekly_capacity_minutes": DEFAULT_CAPACITY_MINUTES * 5})
    data["tasks"] = [normalize_task(task) for task in data["tasks"]]
    return data


def load_tasks():
    """Load tasks from JSON file and migrate older JSON shapes in memory."""
    if not os.path.exists(DATA_FILE):
        return normalize_data({"tasks": [], "lists": DEFAULT_LISTS})
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return normalize_data(json.load(f))


def save_tasks(data):
    """Save tasks to JSON file."""
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(normalize_data(data), f, indent=2)


def record_activity(data, action, task=None, detail="", actor="TaskFlow"):
    entry = {
        "id": str(uuid.uuid4()),
        "action": action,
        "task_id": task.get("id") if task else "",
        "task_title": task.get("title") if task else "",
        "detail": detail,
        "actor": actor,
        "created_at": now_iso(),
    }
    data.setdefault("activity_feed", []).insert(0, entry)
    data["activity_feed"] = data["activity_feed"][:200]
    return entry


def apply_task_payload(task, payload):
    editable_fields = [
        "title", "description", "status", "priority", "due_date", "tags", "assigned_to",
        "estimate_minutes", "scheduled_start", "scheduled_end", "comments", "subtasks",
        "dependency_ids", "recurring",
    ]
    for field in editable_fields:
        if field in payload:
            task[field] = payload[field]
    task["dependency_ids"] = [dep for dep in task.get("dependency_ids", []) if dep != task["id"]]
    task["recurring"] = {**get_default_task()["recurring"], **(task.get("recurring") or {})}
    task["updated_at"] = now_iso()

    if task["status"] == "Done" and not task.get("completed_at"):
        task["completed_at"] = now_iso()
    elif task["status"] != "Done":
        task["completed_at"] = None


def get_task_or_404(data, task_id):
    for task in data["tasks"]:
        if task["id"] == task_id:
            return task
    return None


def clone_recurring_tasks(data):
    """Clone due recurring tasks and move the series cursor forward."""
    today = datetime.now().date()
    created = []

    for task in list(data["tasks"]):
        recurring = task.get("recurring") or {}
        if not recurring.get("enabled") or task.get("recurrence_parent_id"):
            continue

        cadence = recurring.get("cadence")
        next_due = parse_date(recurring.get("next_due_date") or task.get("due_date"))
        if cadence not in {"Daily", "Weekly"} or not next_due:
            continue

        step = timedelta(days=1 if cadence == "Daily" else 7)
        clones_for_task = 0
        while next_due <= today and clones_for_task < 30:
            clone = normalize_task({
                **task,
                "id": str(uuid.uuid4()),
                "status": "To Do",
                "due_date": next_due.isoformat(),
                "scheduled_start": "",
                "scheduled_end": "",
                "comments": [],
                "time_logs": [],
                "focus_minutes": 0,
                "recurring": {"enabled": False, "cadence": "", "next_due_date": ""},
                "recurrence_parent_id": task["id"],
                "created_at": now_iso(),
                "updated_at": now_iso(),
                "completed_at": None,
            })
            data["tasks"].append(clone)
            created.append(clone)
            record_activity(data, "recurring_clone", clone, f"Created from {task.get('title')}")
            next_due += step
            clones_for_task += 1

        task["recurring"]["next_due_date"] = next_due.isoformat()

    return created


def task_blockers(task, tasks_by_id):
    blockers = []
    for dep_id in task.get("dependency_ids", []):
        blocker = tasks_by_id.get(dep_id)
        if blocker and blocker.get("status") != "Done":
            blockers.append(blocker)
    return blockers


def task_payload(task, tasks_by_id=None):
    tasks_by_id = tasks_by_id or {}
    blockers = task_blockers(task, tasks_by_id)
    blocking = [
        candidate["id"]
        for candidate in tasks_by_id.values()
        if task["id"] in candidate.get("dependency_ids", []) and candidate.get("status") != "Done"
    ]
    return {**task, "blocked_by": blockers, "blocking_task_ids": blocking, "is_blocked": bool(blockers)}


# Routes
@app.route("/")
def index():
    """Backend health/info endpoint.

    The React app lives in frontend/. Run it with Vite during development.
    """
    return jsonify({
        "name": "TaskFlow-AI API",
        "status": "ok",
        "docs": "Use /api/tasks, /api/stats, and the other /api endpoints.",
        "frontend": "Run `cd frontend && npm run dev` for the React UI.",
    })


@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    """Get all tasks."""
    data = load_tasks()
    created = clone_recurring_tasks(data)
    if created:
        save_tasks(data)
    tasks_by_id = {task["id"]: task for task in data["tasks"]}
    response = {**data, "tasks": [task_payload(task, tasks_by_id) for task in data["tasks"]]}
    return jsonify(response)


@app.route("/api/tasks", methods=["POST"])
def add_task():
    """Add a new task."""
    data = load_tasks()
    task_data = request.json or {}

    new_task = get_default_task()
    apply_task_payload(new_task, task_data)
    data["tasks"].append(new_task)
    record_activity(data, "task_created", new_task, "Task created")
    save_tasks(data)

    return jsonify({"success": True, "task": new_task})


@app.route("/api/tasks/<task_id>", methods=["PUT"])
def update_task(task_id):
    """Update an existing task."""
    data = load_tasks()
    task_data = request.json or {}

    task = get_task_or_404(data, task_id)
    if not task:
        return jsonify({"success": False, "error": "Task not found"}), 404

    before = {key: task.get(key) for key in ["title", "status", "priority", "due_date", "assigned_to"]}
    apply_task_payload(task, task_data)
    changed = [key for key, value in before.items() if task.get(key) != value]
    record_activity(data, "task_updated", task, f"Updated {', '.join(changed) if changed else 'task details'}")
    save_tasks(data)
    return jsonify({"success": True, "task": task})


@app.route("/api/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    """Delete a task."""
    data = load_tasks()
    task = get_task_or_404(data, task_id)
    if not task:
        return jsonify({"success": False, "error": "Task not found"}), 404

    data["tasks"] = [t for t in data["tasks"] if t["id"] != task_id]
    for candidate in data["tasks"]:
        candidate["dependency_ids"] = [dep for dep in candidate.get("dependency_ids", []) if dep != task_id]
    record_activity(data, "task_deleted", task, "Task deleted")
    save_tasks(data)
    return jsonify({"success": True})


@app.route("/api/tasks/<task_id>/status", methods=["PATCH"])
def update_task_status(task_id):
    """Update task status (for drag and drop)."""
    data = load_tasks()
    new_status = (request.json or {}).get("status")
    task = get_task_or_404(data, task_id)
    if not task:
        return jsonify({"success": False, "error": "Task not found"}), 404

    task["status"] = new_status
    task["updated_at"] = now_iso()
    if new_status == "Done" and not task.get("completed_at"):
        task["completed_at"] = now_iso()
    elif new_status != "Done":
        task["completed_at"] = None

    record_activity(data, "status_changed", task, f"Moved to {new_status}")
    save_tasks(data)
    return jsonify({"success": True, "task": task})


@app.route("/api/tasks/<task_id>/comments", methods=["POST"])
def add_task_comment(task_id):
    """Add a collaboration comment to a task."""
    data = load_tasks()
    payload = request.json or {}
    comment_text = payload.get("text", "").strip()

    if not comment_text:
        return jsonify({"success": False, "error": "Comment text is required"}), 400

    task = get_task_or_404(data, task_id)
    if not task:
        return jsonify({"success": False, "error": "Task not found"}), 404

    comment = {
        "id": str(uuid.uuid4()),
        "author": payload.get("author", "Teammate"),
        "text": comment_text,
        "created_at": now_iso(),
    }
    task.setdefault("comments", []).append(comment)
    task["updated_at"] = now_iso()
    record_activity(data, "comment_added", task, f"{comment['author']} commented", comment["author"])
    save_tasks(data)
    return jsonify({"success": True, "comment": comment, "task": task})


@app.route("/api/tasks/<task_id>/dependencies", methods=["PUT"])
def update_task_dependencies(task_id):
    """Replace blocker dependencies for a task."""
    data = load_tasks()
    payload = request.json or {}
    task = get_task_or_404(data, task_id)
    if not task:
        return jsonify({"success": False, "error": "Task not found"}), 404

    valid_ids = {candidate["id"] for candidate in data["tasks"] if candidate["id"] != task_id}
    task["dependency_ids"] = [dep_id for dep_id in payload.get("dependency_ids", []) if dep_id in valid_ids]
    task["updated_at"] = now_iso()
    record_activity(data, "dependencies_updated", task, f"{len(task['dependency_ids'])} blocker(s) linked")
    save_tasks(data)
    return jsonify({"success": True, "task": task_payload(task, {t["id"]: t for t in data["tasks"]})})


@app.route("/api/tasks/<task_id>/time-logs", methods=["POST"])
def add_time_log(task_id):
    """Add a focus/time tracking log for a task."""
    data = load_tasks()
    payload = request.json or {}
    task = get_task_or_404(data, task_id)
    if not task:
        return jsonify({"success": False, "error": "Task not found"}), 404

    minutes = int(payload.get("minutes") or 0)
    if minutes <= 0:
        return jsonify({"success": False, "error": "Minutes must be positive"}), 400

    log = {
        "id": str(uuid.uuid4()),
        "minutes": minutes,
        "source": payload.get("source", "manual"),
        "note": payload.get("note", ""),
        "started_at": payload.get("started_at", ""),
        "ended_at": payload.get("ended_at", now_iso()),
        "created_at": now_iso(),
    }
    task.setdefault("time_logs", []).append(log)
    task["focus_minutes"] = sum(int(item.get("minutes") or 0) for item in task["time_logs"])
    task["updated_at"] = now_iso()
    record_activity(data, "time_logged", task, f"{minutes} focus minute(s) logged")
    save_tasks(data)
    return jsonify({"success": True, "log": log, "task": task})


@app.route("/api/activity", methods=["GET"])
def get_activity():
    data = load_tasks()
    limit = int(request.args.get("limit", 50))
    return jsonify({"activity": data.get("activity_feed", [])[:limit]})


@app.route("/api/agent/prioritize", methods=["GET"])
def prioritize_tasks():
    """Return AI-ranked active tasks with reasoning."""
    data = load_tasks()
    return jsonify(agent.prioritize_tasks(data["tasks"]))


@app.route("/api/agent/schedule", methods=["GET"])
def suggest_schedule():
    """Return a suggested work schedule for active tasks."""
    data = load_tasks()
    workday_start = request.args.get("start", "09:00")
    workday_end = request.args.get("end", "17:00")
    return jsonify(agent.suggest_schedule(data["tasks"], workday_start, workday_end))


@app.route("/api/agent/apply-schedule", methods=["POST"])
def apply_schedule():
    """Apply scheduled time blocks to tasks."""
    data = load_tasks()
    blocks = (request.json or {}).get("blocks", [])
    by_id = {task["id"]: task for task in data["tasks"]}
    updated = []

    for block in blocks:
        task = by_id.get(block.get("task_id"))
        if task:
            task["scheduled_start"] = block.get("start", task.get("scheduled_start", ""))
            task["scheduled_end"] = block.get("end", task.get("scheduled_end", ""))
            task["updated_at"] = now_iso()
            updated.append(task)
            record_activity(data, "schedule_applied", task, f"{task['scheduled_start']} to {task['scheduled_end']}")

    save_tasks(data)
    return jsonify({"success": True, "tasks": updated})


@app.route("/api/agent/daily-summary", methods=["GET"])
def daily_summary():
    data = load_tasks()
    return jsonify(agent.daily_summary(data["tasks"], data.get("activity_feed", [])))


@app.route("/api/agent/workload-forecast", methods=["GET"])
def workload_forecast():
    data = load_tasks()
    capacity = int(request.args.get("capacity", data.get("settings", {}).get("weekly_capacity_minutes", DEFAULT_CAPACITY_MINUTES * 5)))
    return jsonify(agent.workload_forecast(data["tasks"], capacity))


@app.route("/api/habits", methods=["GET", "POST"])
def habits():
    """List or create habits stored alongside tasks."""
    data = load_tasks()
    data.setdefault("habits", [])

    if request.method == "GET":
        return jsonify({"habits": data["habits"]})

    payload = request.json or {}
    habit = {
        "id": str(uuid.uuid4()),
        "name": payload.get("name", "New Habit"),
        "frequency": payload.get("frequency", "Daily"),
        "streak": 0,
        "completed_dates": [],
        "created_at": now_iso(),
    }
    data["habits"].append(habit)
    record_activity(data, "habit_created", None, habit["name"])
    save_tasks(data)
    return jsonify({"success": True, "habit": habit})


@app.route("/api/habits/<habit_id>/toggle", methods=["PATCH"])
def toggle_habit(habit_id):
    """Toggle a habit completion for a date and update streak."""
    data = load_tasks()
    data.setdefault("habits", [])
    date = (request.json or {}).get("date", datetime.now().strftime("%Y-%m-%d"))

    for habit in data["habits"]:
        if habit["id"] == habit_id:
            completed_dates = set(habit.get("completed_dates", []))
            if date in completed_dates:
                completed_dates.remove(date)
            else:
                completed_dates.add(date)

            habit["completed_dates"] = sorted(completed_dates)
            streak = 0
            cursor = datetime.now().date()
            while cursor.strftime("%Y-%m-%d") in completed_dates:
                streak += 1
                cursor -= timedelta(days=1)
            habit["streak"] = streak
            record_activity(data, "habit_toggled", None, f"{habit['name']} on {date}")
            save_tasks(data)
            return jsonify({"success": True, "habit": habit})

    return jsonify({"success": False, "error": "Habit not found"}), 404


@app.route("/api/habits/<habit_id>", methods=["DELETE"])
def delete_habit(habit_id):
    """Delete a habit."""
    data = load_tasks()
    data.setdefault("habits", [])
    habit = next((item for item in data["habits"] if item["id"] == habit_id), None)
    if not habit:
        return jsonify({"success": False, "error": "Habit not found"}), 404
    data["habits"] = [item for item in data["habits"] if item["id"] != habit_id]
    record_activity(data, "habit_deleted", None, habit["name"])
    save_tasks(data)
    return jsonify({"success": True})


@app.route("/api/stats")
def get_stats():
    """Get task statistics for dashboard."""
    data = load_tasks()
    tasks = data["tasks"]

    stats = {
        "total": len(tasks),
        "todo": len([t for t in tasks if t["status"] == "To Do"]),
        "in_progress": len([t for t in tasks if t["status"] == "In Progress"]),
        "done": len([t for t in tasks if t["status"] == "Done"]),
        "high_priority": len([t for t in tasks if t["priority"] == "High"]),
        "blocked": len([t for t in tasks if task_blockers(t, {task["id"]: task for task in tasks})]),
        "overdue": 0,
    }

    today = datetime.now().date()
    for task in tasks:
        due = parse_date(task.get("due_date"))
        if due and task["status"] != "Done" and due < today:
            stats["overdue"] += 1

    return jsonify(stats)


# ==================== AI Agent Endpoints ====================

@app.route("/api/agent/chat", methods=["POST"])
def agent_chat():
    """Process a chat message through the AI agent."""
    data = load_tasks()
    message = (request.json or {}).get("message", "")

    if not message.strip():
        return jsonify({"error": "Message is required"}), 400

    result = agent.chat(message, data["tasks"])
    return jsonify(result)


@app.route("/api/agent/parse-task", methods=["POST"])
def parse_task():
    """Parse natural language into task data."""
    text = (request.json or {}).get("text", "")

    if not text.strip():
        return jsonify({"error": "Text is required"}), 400

    task_data = agent.parse_task_with_ai(text) if agent.client else agent.parse_task_from_text(text)
    return jsonify(task_data)


@app.route("/api/agent/breakdown", methods=["POST"])
def breakdown_task():
    """Break down a task into subtasks."""
    payload = request.json or {}
    title = payload.get("title", "")
    description = payload.get("description", "")

    if not title.strip():
        return jsonify({"error": "Task title is required"}), 400

    subtasks = agent.break_down_task_with_ai(title, description)
    return jsonify({"subtasks": subtasks})


@app.route("/api/agent/plan-day", methods=["GET"])
def plan_day():
    """Get a daily plan based on current tasks."""
    data = load_tasks()
    plan = agent.plan_day(data["tasks"])
    return jsonify(plan)


@app.route("/api/agent/insights", methods=["GET"])
def get_insights():
    """Get productivity insights."""
    data = load_tasks()
    insights = agent.get_productivity_insights(data["tasks"])
    return jsonify(insights)


@app.route("/api/agent/create-from-chat", methods=["POST"])
def create_task_from_chat():
    """Create a task from AI-parsed data."""
    data = load_tasks()
    task_data = request.json or {}

    new_task = get_default_task()
    apply_task_payload(new_task, task_data)
    data["tasks"].append(new_task)
    record_activity(data, "task_created_from_chat", new_task, "Created by AI chat")
    save_tasks(data)

    return jsonify({"success": True, "task": new_task})


@app.route("/api/agent/create-subtasks", methods=["POST"])
def create_subtasks():
    """Create multiple subtasks at once."""
    data = load_tasks()
    payload = request.json or {}
    subtasks = payload.get("subtasks", [])
    parent_tag = payload.get("parent_tag", "")

    created_tasks = []
    for subtask in subtasks:
        new_task = get_default_task()
        new_task["title"] = subtask.get("title", "Subtask")
        new_task["priority"] = subtask.get("priority", "Medium")
        new_task["tags"] = [parent_tag] if parent_tag else []

        data["tasks"].append(new_task)
        created_tasks.append(new_task)
        record_activity(data, "subtask_created", new_task, parent_tag)

    save_tasks(data)
    return jsonify({"success": True, "tasks": created_tasks})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:asgi_app", host="127.0.0.1", port=5000, reload=True)
