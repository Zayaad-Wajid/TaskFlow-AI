from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import declarative_base, relationship


Base = declarative_base()


task_dependencies = Table(
    "task_dependencies",
    Base.metadata,
    Column("dependent_task_id", String(36), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("dependency_task_id", String(36), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(120), nullable=False, default="")
    email_reminders_enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    habits = relationship("Habit", back_populates="user", cascade="all, delete-orphan")
    activity_items = relationship("Activity", back_populates="user", cascade="all, delete-orphan")
    owned_workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    workspace_memberships = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    owner = relationship("User", back_populates="owned_workspaces")
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="workspace")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(40), nullable=False, default="member")

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_memberships")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False, default="")
    description = Column(Text, nullable=False, default="")
    status = Column(String(40), nullable=False, default="To Do", index=True)
    priority = Column(String(40), nullable=False, default="Medium", index=True)
    due_date = Column(Date, nullable=True, index=True)
    tags = Column(Text, nullable=False, default="")
    assigned_to = Column(String(120), nullable=False, default="")
    estimate_minutes = Column(Integer, nullable=False, default=30)
    scheduled_start = Column(DateTime, nullable=True)
    scheduled_end = Column(DateTime, nullable=True)
    subtasks_json = Column(Text, nullable=False, default="[]")
    recurring_enabled = Column(Boolean, nullable=False, default=False)
    recurring_cadence = Column(String(40), nullable=False, default="")
    recurring_next_due_date = Column(Date, nullable=True)
    focus_minutes = Column(Integer, nullable=False, default=0)
    recurrence_parent_id = Column(String(36), ForeignKey("tasks.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    last_reminded_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="tasks")
    workspace = relationship("Workspace", back_populates="tasks")
    recurrence_parent = relationship("Task", remote_side=[id], backref="recurrence_children")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan", order_by="Comment.created_at")
    time_logs = relationship("TimeLog", back_populates="task", cascade="all, delete-orphan", order_by="TimeLog.created_at")
    attachments = relationship(
        "Attachment",
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="Attachment.uploaded_at",
    )
    dependencies = relationship(
        "Task",
        secondary=task_dependencies,
        primaryjoin=id == task_dependencies.c.dependent_task_id,
        secondaryjoin=id == task_dependencies.c.dependency_task_id,
        backref="blocking_tasks",
    )


class Habit(Base):
    __tablename__ = "habits"

    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False, default="New Habit")
    frequency = Column(String(40), nullable=False, default="Daily")
    streak = Column(Integer, nullable=False, default=0)
    completed_dates = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="habits")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String(36), primary_key=True)
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    author = Column(String(120), nullable=False, default="Teammate")
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    task = relationship("Task", back_populates="comments")


class TimeLog(Base):
    __tablename__ = "time_logs"

    id = Column(String(36), primary_key=True)
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    minutes = Column(Integer, nullable=False)
    source = Column(String(80), nullable=False, default="manual")
    note = Column(Text, nullable=False, default="")
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    task = relationship("Task", back_populates="time_logs")


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(String(36), primary_key=True)
    task_id = Column(String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(160), nullable=False)
    file_path = Column(Text, nullable=False)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    task = relationship("Task", back_populates="attachments")


class Activity(Base):
    __tablename__ = "activity_feed"

    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(80), nullable=False)
    task_id = Column(String(36), nullable=False, default="")
    task_title = Column(String(255), nullable=False, default="")
    detail = Column(Text, nullable=False, default="")
    actor = Column(String(120), nullable=False, default="TaskFlow")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="activity_items")


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(80), primary_key=True)
    value = Column(Text, nullable=False)
