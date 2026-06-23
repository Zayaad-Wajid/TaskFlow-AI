import json
import os
import uuid
from datetime import datetime, timedelta
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, selectinload

load_dotenv()

import auth as jwt_auth
from agent import get_agent
from database import SessionLocal, get_db
from models import Activity, AppSetting, Comment, Habit, Task, TimeLog, User


app = FastAPI(title="TaskFlow-AI API")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

agent = get_agent(os.getenv("GEMINI_API_KEY"))

DEFAULT_LISTS = ["To Do", "In Progress", "Done"]
DEFAULT_CAPACITY_MINUTES = 6 * 60


class TaskConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[int, set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        connections = self.active_connections.get(user_id)
        if not connections:
            return
        connections.discard(websocket)
        if not connections:
            self.active_connections.pop(user_id, None)

    async def broadcast(self, user_id: int, payload: dict[str, Any]) -> None:
        connections = list(self.active_connections.get(user_id, set()))
        for websocket in connections:
            try:
                await websocket.send_json(payload)
            except RuntimeError:
                self.disconnect(user_id, websocket)


task_connections = TaskConnectionManager()


class FlexibleModel(BaseModel):
    model_config = ConfigDict(extra="allow")


class UserPayload(BaseModel):
    id: int
    email: str
    name: str
    created_at: str


class AuthRequest(BaseModel):
    email: str = ""
    password: str = ""


class RegisterRequest(AuthRequest):
    name: str = ""


class AuthResponse(BaseModel):
    success: bool
    user: Optional[UserPayload] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    error: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str = ""


class SuccessResponse(BaseModel):
    success: bool


class ErrorResponse(BaseModel):
    success: bool = False
    error: str


class TaskPayload(FlexibleModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    tags: Optional[list[str]] = None
    assigned_to: Optional[str] = None
    estimate_minutes: Optional[int] = None
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None
    comments: Optional[list[dict[str, Any]]] = None
    subtasks: Optional[list[dict[str, Any]]] = None
    dependency_ids: Optional[list[str]] = None
    recurring: Optional[dict[str, Any]] = None


class TaskResponse(BaseModel):
    success: bool
    task: dict[str, Any]


class TasksResponse(FlexibleModel):
    tasks: list[dict[str, Any]]
    lists: list[str] = Field(default_factory=list)
    habits: list[dict[str, Any]] = Field(default_factory=list)
    activity_feed: list[dict[str, Any]] = Field(default_factory=list)
    settings: dict[str, Any] = Field(default_factory=dict)


class StatusPayload(BaseModel):
    status: str = ""


class CommentPayload(BaseModel):
    author: str = "Teammate"
    text: str = ""


class CommentResponse(BaseModel):
    success: bool
    comment: dict[str, Any]
    task: dict[str, Any]


class DependenciesPayload(BaseModel):
    dependency_ids: list[str] = Field(default_factory=list)


class TimeLogPayload(BaseModel):
    minutes: int = 0
    source: str = "manual"
    note: str = ""
    started_at: str = ""
    ended_at: Optional[str] = None


class TimeLogResponse(BaseModel):
    success: bool
    log: dict[str, Any]
    task: dict[str, Any]


class ActivityResponse(BaseModel):
    activity: list[dict[str, Any]]


class ApplySchedulePayload(BaseModel):
    blocks: list[dict[str, Any]] = Field(default_factory=list)


class TasksMutationResponse(BaseModel):
    success: bool
    tasks: list[dict[str, Any]]


class HabitPayload(BaseModel):
    name: str = "New Habit"
    frequency: str = "Daily"


class HabitsResponse(BaseModel):
    habits: list[dict[str, Any]]


class HabitResponse(BaseModel):
    success: bool
    habit: dict[str, Any]


class ToggleHabitPayload(BaseModel):
    date: Optional[str] = None


class StatsResponse(BaseModel):
    total: int
    todo: int
    in_progress: int
    done: int
    high_priority: int
    blocked: int
    overdue: int


class ChatPayload(BaseModel):
    message: str = ""


class ParseTaskPayload(BaseModel):
    text: str = ""


class BreakdownPayload(BaseModel):
    title: str = ""
    description: str = ""


class SubtasksPayload(BaseModel):
    subtasks: list[dict[str, Any]] = Field(default_factory=list)
    parent_tag: str = ""


def now_dt() -> datetime:
    return datetime.now()


def now_iso() -> str:
    return now_dt().isoformat(timespec="seconds")


def parse_datetime(value: str | None) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def parse_date(value: str | None):
    parsed = parse_datetime(value)
    return parsed.date() if parsed else None


def date_to_str(value) -> str:
    return value.isoformat() if value else ""


def dt_to_str(value: Optional[datetime], empty: Any = "") -> Any:
    return value.isoformat(timespec="seconds") if value else empty


def tags_to_text(tags: list[str] | None) -> str:
    return ",".join(tag.strip() for tag in (tags or []) if str(tag).strip())


def text_to_tags(value: str | None) -> list[str]:
    return [tag for tag in (value or "").split(",") if tag]


def json_loads(value: str | None, fallback):
    try:
        return json.loads(value or "")
    except (TypeError, ValueError, json.JSONDecodeError):
        return fallback


def model_payload(model: BaseModel) -> dict[str, Any]:
    return model.model_dump(exclude_unset=True)


def get_user_by_id(db: Session, user_id: int | None) -> Optional[User]:
    return db.get(User, user_id) if user_id is not None else None


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.lower()).first()


def user_payload(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "created_at": dt_to_str(user.created_at),
    }


get_current_user = jwt_auth.get_current_user


def get_websocket_user(token: str) -> Optional[User]:
    if not token:
        return None
    try:
        decoded = jwt_auth.decode_token(token, "access")
    except HTTPException:
        return None

    with SessionLocal() as db:
        return db.get(User, int(decoded["sub"]))


async def broadcast_task_event(user_id: int, event_type: str, task: Optional[dict[str, Any]] = None, task_id: str = "") -> None:
    payload: dict[str, Any] = {"type": event_type}
    if task is not None:
        payload["task"] = task
        payload["task_id"] = task.get("id", task_id)
    elif task_id:
        payload["task_id"] = task_id
    await task_connections.broadcast(user_id, payload)


def get_setting(db: Session, key: str, default: Any) -> Any:
    setting = db.get(AppSetting, key)
    if not setting:
        return default
    return json_loads(setting.value, default)


def set_setting(db: Session, key: str, value: Any) -> None:
    setting = db.get(AppSetting, key) or AppSetting(key=key)
    setting.value = json.dumps(value)
    db.add(setting)


def seed_database(db: Session) -> None:
    if not get_setting(db, "lists", None):
        set_setting(db, "lists", DEFAULT_LISTS)
    if not get_setting(db, "weekly_capacity_minutes", None):
        set_setting(db, "weekly_capacity_minutes", DEFAULT_CAPACITY_MINUTES * 5)
    if db.query(User).first() is None:
        db.add(User(
            email=os.getenv("DEMO_USER_EMAIL", "demo@example.com").lower(),
            hashed_password=jwt_auth.get_password_hash(os.getenv("DEMO_USER_PASSWORD", "demo123")),
            name="Demo User",
            created_at=now_dt(),
        ))
    db.commit()


def task_query(db: Session, user_id: int):
    return db.query(Task).filter(Task.user_id == user_id).options(
        selectinload(Task.comments),
        selectinload(Task.time_logs),
        selectinload(Task.dependencies),
        selectinload(Task.blocking_tasks),
    )


def get_task_or_404(db: Session, task_id: str, user_id: int) -> Task:
    task = task_query(db, user_id).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Task not found"})
    return task


def comment_to_dict(comment: Comment) -> dict[str, Any]:
    return {
        "id": comment.id,
        "author": comment.author,
        "text": comment.text,
        "created_at": dt_to_str(comment.created_at),
    }


def time_log_to_dict(log: TimeLog) -> dict[str, Any]:
    return {
        "id": log.id,
        "minutes": log.minutes,
        "source": log.source,
        "note": log.note,
        "started_at": dt_to_str(log.started_at),
        "ended_at": dt_to_str(log.ended_at),
        "created_at": dt_to_str(log.created_at),
    }


def task_to_dict(task: Task, include_links: bool = True) -> dict[str, Any]:
    blockers = [task_to_dict(item, include_links=False) for item in task.dependencies if item.status != "Done"] if include_links else []
    blocking = [item.id for item in task.blocking_tasks if item.status != "Done"] if include_links else []
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "due_date": date_to_str(task.due_date),
        "tags": text_to_tags(task.tags),
        "assigned_to": task.assigned_to,
        "estimate_minutes": task.estimate_minutes,
        "scheduled_start": dt_to_str(task.scheduled_start),
        "scheduled_end": dt_to_str(task.scheduled_end),
        "comments": [comment_to_dict(comment) for comment in task.comments],
        "subtasks": json_loads(task.subtasks_json, []),
        "dependency_ids": [item.id for item in task.dependencies],
        "recurring": {
            "enabled": task.recurring_enabled,
            "cadence": task.recurring_cadence,
            "next_due_date": date_to_str(task.recurring_next_due_date),
        },
        "time_logs": [time_log_to_dict(log) for log in task.time_logs],
        "focus_minutes": task.focus_minutes,
        "recurrence_parent_id": task.recurrence_parent_id or "",
        "created_at": dt_to_str(task.created_at),
        "updated_at": dt_to_str(task.updated_at),
        "completed_at": dt_to_str(task.completed_at, None),
        "blocked_by": blockers,
        "blocking_task_ids": blocking,
        "is_blocked": bool(blockers),
    }


def habit_to_dict(habit: Habit) -> dict[str, Any]:
    return {
        "id": habit.id,
        "name": habit.name,
        "frequency": habit.frequency,
        "streak": habit.streak,
        "completed_dates": json_loads(habit.completed_dates, []),
        "created_at": dt_to_str(habit.created_at),
    }


def activity_to_dict(activity: Activity) -> dict[str, Any]:
    return {
        "id": activity.id,
        "action": activity.action,
        "task_id": activity.task_id,
        "task_title": activity.task_title,
        "detail": activity.detail,
        "actor": activity.actor,
        "created_at": dt_to_str(activity.created_at),
    }


def record_activity(db: Session, user_id: int, action: str, task: Task | None = None, detail: str = "", actor: str = "TaskFlow") -> Activity:
    entry = Activity(
        id=str(uuid.uuid4()),
        user_id=user_id,
        action=action,
        task_id=task.id if task else "",
        task_title=task.title if task else "",
        detail=detail,
        actor=actor,
        created_at=now_dt(),
    )
    db.add(entry)
    return entry


def apply_task_payload(db: Session, task: Task, payload: dict[str, Any], user_id: int) -> None:
    scalar_fields = [
        "title", "description", "status", "priority", "assigned_to",
        "estimate_minutes",
    ]
    for field in scalar_fields:
        if field in payload and payload[field] is not None:
            setattr(task, field, payload[field])

    if "due_date" in payload:
        task.due_date = parse_date(payload.get("due_date"))
    if "scheduled_start" in payload:
        task.scheduled_start = parse_datetime(payload.get("scheduled_start"))
    if "scheduled_end" in payload:
        task.scheduled_end = parse_datetime(payload.get("scheduled_end"))
    if "tags" in payload:
        task.tags = tags_to_text(payload.get("tags"))
    if "subtasks" in payload:
        task.subtasks_json = json.dumps(payload.get("subtasks") or [])
    if "recurring" in payload:
        recurring = payload.get("recurring") or {}
        task.recurring_enabled = bool(recurring.get("enabled"))
        task.recurring_cadence = recurring.get("cadence", "")
        task.recurring_next_due_date = parse_date(recurring.get("next_due_date"))
    if "dependency_ids" in payload:
        valid_dependencies = (
            db.query(Task)
            .filter(Task.user_id == user_id, Task.id.in_(payload.get("dependency_ids") or []), Task.id != task.id)
            .all()
        )
        task.dependencies = valid_dependencies

    task.updated_at = now_dt()
    if task.status == "Done" and not task.completed_at:
        task.completed_at = now_dt()
    elif task.status != "Done":
        task.completed_at = None


def create_task(db: Session, user_id: int, payload: dict[str, Any] | None = None) -> Task:
    now = now_dt()
    task = Task(
        id=str(uuid.uuid4()),
        user_id=user_id,
        title="",
        description="",
        status="To Do",
        priority="Medium",
        tags="",
        assigned_to="",
        estimate_minutes=30,
        subtasks_json="[]",
        recurring_enabled=False,
        recurring_cadence="",
        focus_minutes=0,
        created_at=now,
        updated_at=now,
    )
    db.add(task)
    db.flush()
    apply_task_payload(db, task, payload or {}, user_id)
    return task


def clone_recurring_tasks(db: Session, user_id: int, tasks: list[Task]) -> list[Task]:
    today = now_dt().date()
    created = []
    task_ids = {task.id for task in tasks}

    for task in list(tasks):
        if not task.recurring_enabled or task.recurrence_parent_id:
            continue
        if task.recurring_cadence not in {"Daily", "Weekly"}:
            continue

        next_due = task.recurring_next_due_date or task.due_date
        if not next_due:
            continue

        step = timedelta(days=1 if task.recurring_cadence == "Daily" else 7)
        clones_for_task = 0
        while next_due <= today and clones_for_task < 30:
            clone = create_task(db, user_id, task_to_dict(task, include_links=False))
            clone.status = "To Do"
            clone.due_date = next_due
            clone.scheduled_start = None
            clone.scheduled_end = None
            clone.subtasks_json = task.subtasks_json
            clone.recurring_enabled = False
            clone.recurring_cadence = ""
            clone.recurring_next_due_date = None
            clone.focus_minutes = 0
            clone.recurrence_parent_id = task.id
            clone.completed_at = None
            clone.comments = []
            clone.time_logs = []
            clone.dependencies = [dependency for dependency in task.dependencies if dependency.id in task_ids]
            created.append(clone)
            record_activity(db, user_id, "recurring_clone", clone, f"Created from {task.title}")
            next_due += step
            clones_for_task += 1

        task.recurring_next_due_date = next_due

    return created


def tasks_response(db: Session, user_id: int) -> dict[str, Any]:
    tasks = task_query(db, user_id).order_by(Task.created_at).all()
    created = clone_recurring_tasks(db, user_id, tasks)
    if created:
        db.commit()
        tasks = task_query(db, user_id).order_by(Task.created_at).all()

    return {
        "tasks": [task_to_dict(task) for task in tasks],
        "lists": get_setting(db, "lists", DEFAULT_LISTS),
        "habits": [habit_to_dict(habit) for habit in db.query(Habit).filter(Habit.user_id == user_id).order_by(Habit.created_at).all()],
        "activity_feed": [activity_to_dict(item) for item in db.query(Activity).filter(Activity.user_id == user_id).order_by(Activity.created_at.desc()).limit(200).all()],
        "settings": {"weekly_capacity_minutes": get_setting(db, "weekly_capacity_minutes", DEFAULT_CAPACITY_MINUTES * 5)},
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content=exc.detail)


@app.get("/", response_model=dict[str, Any])
def index():
    return {
        "name": "TaskFlow-AI API",
        "status": "ok",
        "docs": "Use /docs for OpenAPI docs, plus /api/tasks, /api/stats, and the other /api endpoints.",
        "frontend": "Run `cd frontend && npm run dev` for the React UI.",
    }


@app.websocket("/ws/tasks")
async def task_updates(websocket: WebSocket, token: str = Query("")):
    user = get_websocket_user(token)
    if not user:
        await websocket.close(code=1008)
        return

    await task_connections.connect(user.id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        task_connections.disconnect(user.id, websocket)


@app.post("/api/auth/register", response_model=AuthResponse, responses={400: {"model": ErrorResponse}, 409: {"model": ErrorResponse}})
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    email = (payload.email or "").strip().lower()
    name = (payload.name or "").strip()
    password = payload.password or ""

    if "@" not in email:
        raise HTTPException(status_code=400, detail={"success": False, "error": "Valid email is required"})
    if len(password) < 6:
        raise HTTPException(status_code=400, detail={"success": False, "error": "Password must be at least 6 characters"})
    if get_user_by_email(db, email):
        raise HTTPException(status_code=409, detail={"success": False, "error": "Email already exists"})

    user = User(email=email, hashed_password=jwt_auth.get_password_hash(password), name=name or email.split("@")[0], created_at=now_dt())
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"success": True, "user": user_payload(user), **jwt_auth.token_pair(user)}


@app.post("/api/auth/login", response_model=AuthResponse, responses={401: {"model": ErrorResponse}})
def login(payload: AuthRequest, db: Session = Depends(get_db)):
    email = (payload.email or "").strip().lower()
    password = payload.password or ""
    user = get_user_by_email(db, email)
    if not user or not jwt_auth.verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail={"success": False, "error": "Invalid email or password"})

    return {"success": True, "user": user_payload(user), **jwt_auth.token_pair(user)}


@app.post("/api/auth/refresh", response_model=AuthResponse, responses={401: {"model": ErrorResponse}})
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    decoded = jwt_auth.decode_token(payload.refresh_token, "refresh")
    user = db.get(User, int(decoded["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail={"success": False, "error": "User not found"})
    return {"success": True, "user": user_payload(user), **jwt_auth.token_pair(user)}


@app.post("/api/auth/logout", response_model=SuccessResponse)
def logout():
    return {"success": True}


@app.get("/api/auth/me", response_model=AuthResponse, responses={401: {"model": AuthResponse}})
def me(user: User = Depends(get_current_user)):
    return {"success": True, "user": user_payload(user)}


@app.get("/api/tasks", response_model=TasksResponse)
def get_tasks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return tasks_response(db, user.id)


@app.post("/api/tasks", response_model=TaskResponse)
def add_task(payload: TaskPayload, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = create_task(db, user.id, model_payload(payload))
    record_activity(db, user.id, "task_created", task, "Task created")
    db.commit()
    db.refresh(task)
    task_data = task_to_dict(get_task_or_404(db, task.id, user.id))
    background_tasks.add_task(broadcast_task_event, user.id, "task_created", task_data)
    return {"success": True, "task": task_data}


@app.put("/api/tasks/{task_id}", response_model=TaskResponse, responses={404: {"model": ErrorResponse}})
def update_task(task_id: str, payload: TaskPayload, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = get_task_or_404(db, task_id, user.id)
    before = {key: getattr(task, key) for key in ["title", "status", "priority", "due_date", "assigned_to"]}
    apply_task_payload(db, task, model_payload(payload), user.id)
    changed = [key for key, value in before.items() if getattr(task, key) != value]
    record_activity(db, user.id, "task_updated", task, f"Updated {', '.join(changed) if changed else 'task details'}")
    db.commit()
    task_data = task_to_dict(get_task_or_404(db, task_id, user.id))
    background_tasks.add_task(broadcast_task_event, user.id, "task_updated", task_data)
    return {"success": True, "task": task_data}


@app.delete("/api/tasks/{task_id}", response_model=SuccessResponse, responses={404: {"model": ErrorResponse}})
def delete_task(task_id: str, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = get_task_or_404(db, task_id, user.id)
    task_data = task_to_dict(task)
    record_activity(db, user.id, "task_deleted", task, "Task deleted")
    db.delete(task)
    db.commit()
    background_tasks.add_task(broadcast_task_event, user.id, "task_deleted", task_data, task_id)
    return {"success": True}


@app.patch("/api/tasks/{task_id}/status", response_model=TaskResponse, responses={404: {"model": ErrorResponse}})
def update_task_status(task_id: str, payload: StatusPayload, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = get_task_or_404(db, task_id, user.id)
    task.status = payload.status
    task.updated_at = now_dt()
    if payload.status == "Done" and not task.completed_at:
        task.completed_at = now_dt()
    elif payload.status != "Done":
        task.completed_at = None
    record_activity(db, user.id, "status_changed", task, f"Moved to {payload.status}")
    db.commit()
    task_data = task_to_dict(get_task_or_404(db, task_id, user.id))
    background_tasks.add_task(broadcast_task_event, user.id, "task_status_changed", task_data)
    return {"success": True, "task": task_data}


@app.post("/api/tasks/{task_id}/comments", response_model=CommentResponse, responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}})
def add_task_comment(task_id: str, payload: CommentPayload, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    comment_text = payload.text.strip()
    if not comment_text:
        raise HTTPException(status_code=400, detail={"success": False, "error": "Comment text is required"})

    task = get_task_or_404(db, task_id, user.id)
    comment = Comment(id=str(uuid.uuid4()), task_id=task.id, author=payload.author, text=comment_text, created_at=now_dt())
    db.add(comment)
    task.updated_at = now_dt()
    record_activity(db, user.id, "comment_added", task, f"{comment.author} commented", comment.author)
    db.commit()
    db.refresh(comment)
    task_data = task_to_dict(get_task_or_404(db, task_id, user.id))
    background_tasks.add_task(broadcast_task_event, user.id, "task_updated", task_data)
    return {"success": True, "comment": comment_to_dict(comment), "task": task_data}


@app.put("/api/tasks/{task_id}/dependencies", response_model=TaskResponse, responses={404: {"model": ErrorResponse}})
def update_task_dependencies(task_id: str, payload: DependenciesPayload, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = get_task_or_404(db, task_id, user.id)
    task.dependencies = db.query(Task).filter(Task.user_id == user.id, Task.id.in_(payload.dependency_ids), Task.id != task_id).all()
    task.updated_at = now_dt()
    record_activity(db, user.id, "dependencies_updated", task, f"{len(task.dependencies)} blocker(s) linked")
    db.commit()
    task_data = task_to_dict(get_task_or_404(db, task_id, user.id))
    background_tasks.add_task(broadcast_task_event, user.id, "task_updated", task_data)
    return {"success": True, "task": task_data}


@app.post("/api/tasks/{task_id}/time-logs", response_model=TimeLogResponse, responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}})
def add_time_log(task_id: str, payload: TimeLogPayload, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = get_task_or_404(db, task_id, user.id)
    minutes = int(payload.minutes or 0)
    if minutes <= 0:
        raise HTTPException(status_code=400, detail={"success": False, "error": "Minutes must be positive"})

    log = TimeLog(
        id=str(uuid.uuid4()),
        task_id=task.id,
        minutes=minutes,
        source=payload.source,
        note=payload.note,
        started_at=parse_datetime(payload.started_at),
        ended_at=parse_datetime(payload.ended_at) or now_dt(),
        created_at=now_dt(),
    )
    db.add(log)
    task.focus_minutes = (task.focus_minutes or 0) + minutes
    task.updated_at = now_dt()
    record_activity(db, user.id, "time_logged", task, f"{minutes} focus minute(s) logged")
    db.commit()
    db.refresh(log)
    task_data = task_to_dict(get_task_or_404(db, task_id, user.id))
    background_tasks.add_task(broadcast_task_event, user.id, "task_updated", task_data)
    return {"success": True, "log": time_log_to_dict(log), "task": task_data}


@app.get("/api/activity", response_model=ActivityResponse)
def get_activity(limit: int = Query(50), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.user_id == user.id).order_by(Activity.created_at.desc()).limit(limit).all()
    return {"activity": [activity_to_dict(item) for item in activity]}


@app.get("/api/agent/prioritize", response_model=dict[str, Any])
def prioritize_tasks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return agent.prioritize_tasks([task_to_dict(task) for task in task_query(db, user.id).all()])


@app.get("/api/agent/schedule", response_model=dict[str, Any])
def suggest_schedule(start: str = "09:00", end: str = "17:00", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return agent.suggest_schedule([task_to_dict(task) for task in task_query(db, user.id).all()], start, end)


@app.post("/api/agent/apply-schedule", response_model=TasksMutationResponse)
def apply_schedule(payload: ApplySchedulePayload, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    updated = []
    for block in payload.blocks:
        task = task_query(db, user.id).filter(Task.id == block.get("task_id")).first()
        if task:
            task.scheduled_start = parse_datetime(block.get("start")) or task.scheduled_start
            task.scheduled_end = parse_datetime(block.get("end")) or task.scheduled_end
            task.updated_at = now_dt()
            updated.append(task)
            record_activity(db, user.id, "schedule_applied", task, f"{dt_to_str(task.scheduled_start)} to {dt_to_str(task.scheduled_end)}")
    db.commit()
    tasks = [task_to_dict(get_task_or_404(db, task.id, user.id)) for task in updated]
    for task_data in tasks:
        background_tasks.add_task(broadcast_task_event, user.id, "task_updated", task_data)
    return {"success": True, "tasks": tasks}


@app.get("/api/agent/daily-summary", response_model=dict[str, Any])
def daily_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = [task_to_dict(task) for task in task_query(db, user.id).all()]
    activity = [activity_to_dict(item) for item in db.query(Activity).filter(Activity.user_id == user.id).order_by(Activity.created_at.desc()).limit(200).all()]
    return agent.daily_summary(tasks, activity)


@app.get("/api/agent/workload-forecast", response_model=dict[str, Any])
def workload_forecast(capacity: Optional[int] = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    weekly_capacity = capacity or get_setting(db, "weekly_capacity_minutes", DEFAULT_CAPACITY_MINUTES * 5)
    return agent.workload_forecast([task_to_dict(task) for task in task_query(db, user.id).all()], int(weekly_capacity))


@app.get("/api/habits", response_model=HabitsResponse)
def get_habits(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"habits": [habit_to_dict(habit) for habit in db.query(Habit).filter(Habit.user_id == user.id).order_by(Habit.created_at).all()]}


@app.post("/api/habits", response_model=HabitResponse)
def create_habit(payload: HabitPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    habit = Habit(id=str(uuid.uuid4()), user_id=user.id, name=payload.name, frequency=payload.frequency, streak=0, completed_dates="[]", created_at=now_dt())
    db.add(habit)
    record_activity(db, user.id, "habit_created", None, habit.name)
    db.commit()
    db.refresh(habit)
    return {"success": True, "habit": habit_to_dict(habit)}


@app.patch("/api/habits/{habit_id}/toggle", response_model=HabitResponse, responses={404: {"model": ErrorResponse}})
def toggle_habit(habit_id: str, payload: ToggleHabitPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Habit not found"})
    date = payload.date or now_dt().strftime("%Y-%m-%d")
    completed_dates = set(json_loads(habit.completed_dates, []))
    if date in completed_dates:
        completed_dates.remove(date)
    else:
        completed_dates.add(date)

    habit.completed_dates = json.dumps(sorted(completed_dates))
    streak = 0
    cursor = now_dt().date()
    while cursor.strftime("%Y-%m-%d") in completed_dates:
        streak += 1
        cursor -= timedelta(days=1)
    habit.streak = streak
    record_activity(db, user.id, "habit_toggled", None, f"{habit.name} on {date}")
    db.commit()
    return {"success": True, "habit": habit_to_dict(habit)}


@app.delete("/api/habits/{habit_id}", response_model=SuccessResponse, responses={404: {"model": ErrorResponse}})
def delete_habit(habit_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail={"success": False, "error": "Habit not found"})
    record_activity(db, user.id, "habit_deleted", None, habit.name)
    db.delete(habit)
    db.commit()
    return {"success": True}


@app.get("/api/stats", response_model=StatsResponse)
def get_stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = task_query(db, user.id).all()
    today = now_dt().date()
    return {
        "total": len(tasks),
        "todo": len([task for task in tasks if task.status == "To Do"]),
        "in_progress": len([task for task in tasks if task.status == "In Progress"]),
        "done": len([task for task in tasks if task.status == "Done"]),
        "high_priority": len([task for task in tasks if task.priority == "High"]),
        "blocked": len([task for task in tasks if any(dep.status != "Done" for dep in task.dependencies)]),
        "overdue": len([task for task in tasks if task.due_date and task.status != "Done" and task.due_date < today]),
    }


@app.post("/api/agent/chat", response_model=dict[str, Any], responses={400: {"model": dict[str, str]}})
def agent_chat(payload: ChatPayload, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail={"error": "Message is required"})
    return agent.chat(payload.message, [task_to_dict(task) for task in task_query(db, user.id).all()])


@app.post("/api/agent/parse-task", response_model=dict[str, Any], responses={400: {"model": dict[str, str]}})
def parse_task(payload: ParseTaskPayload, user: User = Depends(get_current_user)):
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail={"error": "Text is required"})
    return agent.parse_task_with_ai(payload.text) if agent.client else agent.parse_task_from_text(payload.text)


@app.post("/api/agent/breakdown", response_model=dict[str, list[dict[str, Any]]], responses={400: {"model": dict[str, str]}})
def breakdown_task(payload: BreakdownPayload, user: User = Depends(get_current_user)):
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail={"error": "Task title is required"})
    return {"subtasks": agent.break_down_task_with_ai(payload.title, payload.description)}


@app.get("/api/agent/plan-day", response_model=dict[str, Any])
def plan_day(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return agent.plan_day([task_to_dict(task) for task in task_query(db, user.id).all()])


@app.get("/api/agent/insights", response_model=dict[str, Any])
def get_insights(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return agent.get_productivity_insights([task_to_dict(task) for task in task_query(db, user.id).all()])


@app.post("/api/agent/create-from-chat", response_model=TaskResponse)
def create_task_from_chat(payload: TaskPayload, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = create_task(db, user.id, model_payload(payload))
    record_activity(db, user.id, "task_created_from_chat", task, "Created by AI chat")
    db.commit()
    task_data = task_to_dict(get_task_or_404(db, task.id, user.id))
    background_tasks.add_task(broadcast_task_event, user.id, "task_created", task_data)
    return {"success": True, "task": task_data}


@app.post("/api/agent/create-subtasks", response_model=TasksMutationResponse)
def create_subtasks(payload: SubtasksPayload, background_tasks: BackgroundTasks, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    created_tasks = []
    for subtask in payload.subtasks:
        task = create_task(db, user.id, {
            "title": subtask.get("title", "Subtask"),
            "priority": subtask.get("priority", "Medium"),
            "tags": [payload.parent_tag] if payload.parent_tag else [],
        })
        created_tasks.append(task)
        record_activity(db, user.id, "subtask_created", task, payload.parent_tag)
    db.commit()
    tasks = [task_to_dict(get_task_or_404(db, task.id, user.id)) for task in created_tasks]
    for task_data in tasks:
        background_tasks.add_task(broadcast_task_event, user.id, "task_created", task_data)
    return {"success": True, "tasks": tasks}


@app.on_event("startup")
def startup_event() -> None:
    try:
        from database import SessionLocal

        with SessionLocal() as db:
            seed_database(db)
    except OperationalError:
        pass


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=5000, reload=True)

