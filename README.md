# TaskFlow-AI - Real-Time Collaboration Dashboard

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

A modern, ClickUp-inspired task management application built with React, Tailwind CSS, and a FastAPI backend served by Uvicorn.

## Features

### Task Management

- **Kanban Board** - Drag and drop tasks between To Do, In Progress, and Done columns
- **List View** - Table view with sorting and quick actions
- **Calendar View** - See tasks by their due dates
- **Task Management** - Create, edit, and delete tasks with title, description, priority, due date, and tags
- **Search & Filter** - Find tasks quickly with search and priority filters
- **Team Collaboration** - Assign tasks to teammates and keep lightweight task comments
- **Pomodoro Timer** - Built-in focus timer for 25-minute work sessions
- **Habit Tracking** - Create daily habits, mark today complete, and track streaks
- **Recurring Tasks** - Daily and weekly task series auto-clone from the next due date
- **Task Dependencies** - Link blocker tasks and surface blocked indicators on cards
- **Time Tracking** - Log manual or Pomodoro focus sessions per task

### AI Assistant

- **Natural Language Task Creation** - Create tasks by typing naturally
- **Smart Task Parsing** - Automatically extracts title, description, priority, and due dates from text
- **Task Breakdown** - AI splits complex tasks into manageable subtasks
- **Daily Planner** - Get a prioritized plan for your day's tasks
- **Productivity Insights** - Analytics on completion rates, overdue tasks, and personalized tips
- **AI Scheduling Assistant** - Generate time-blocked schedules from active tasks and estimates
- **Workload Forecasting** - Weekly capacity forecast from due dates and task estimates
- **Chat Interface** - Floating AI assistant accessible from any view

### Storage and Migration

TaskFlow uses SQLAlchemy ORM with PostgreSQL for persistent storage. If `DATABASE_URL` is not set or PostgreSQL is not reachable, the backend falls back to a local SQLite database at `backend/instance/taskflow_ai.db`. Existing `backend/tasks_data.json` data can be imported once from inside `backend/` with `python scripts/migrate_tasks_json_to_db.py`.

### Authentication

TaskFlow uses email/password accounts with JWT access and refresh tokens. Access tokens are short-lived and sent as `Authorization: Bearer <token>` on API requests. Refresh tokens are stored by the frontend and exchanged at `/api/auth/refresh` when the access token expires.

## Tech Stack

### Frontend

- **React 19** - UI framework
- **Tailwind CSS** - Utility-first styling
- **Vite** - Build tool and dev server
- **dnd-kit** - Drag and drop functionality
- **Lucide React** - Icon library
- **Axios** - HTTP client

### Backend

- **FastAPI + Uvicorn** - API backend with OpenAPI docs at `/docs`
- **CORSMiddleware** - Cross-origin resource sharing
- **SQLAlchemy + Alembic** - ORM models and database migrations
- **PostgreSQL** - Primary database, with local SQLite fallback
- **Gemini** (optional) - Enhanced AI-powered task parsing and insights

## Project Structure

```text
TaskFlow/
|-- backend/
|   |-- app.py                    # FastAPI backend API with Uvicorn entrypoint
|   |-- agent.py                  # AI agent module
|   |-- auth.py                   # JWT auth helpers and dependencies
|   |-- database.py               # Database engine/session setup
|   |-- models.py                 # SQLAlchemy ORM models
|   |-- alembic/                  # Database migrations
|   |-- scripts/                  # One-time data migration scripts
|   |-- tests/                    # Backend pytest suite
|   |-- requirements.txt          # Python runtime dependencies
|   |-- requirements-dev.txt      # Python dev/test dependencies
|   `-- tasks_data.json           # Legacy JSON data for one-time migration
|-- frontend/
|   |-- src/
|   |-- package.json
|   `-- vite.config.js
|-- .github/workflows/ci.yml
|-- .gitignore
`-- README.md
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn
- PostgreSQL, unless you want to use the local SQLite fallback

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd TaskFlow
   ```

2. **Create and activate the backend virtual environment**

   Windows PowerShell:

   ```powershell
   cd backend
   python -m venv .venv
   .venv\Scripts\activate
   ```

   macOS/Linux:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   ```

3. **Install Python dependencies**

   ```bash
   pip install -r requirements.txt
   ```

   For tests and linting:

   ```bash
   pip install -r requirements-dev.txt
   ```

4. **Configure environment**

   Windows PowerShell:

   ```powershell
   copy .env.example .env
   ```

   macOS/Linux:

   ```bash
   cp .env.example .env
   ```

   Set `DATABASE_URL` to your PostgreSQL database:

   ```env
   DATABASE_URL=postgresql://<db_user>:<db_password>@localhost:5432/<db_name>
   JWT_SECRET_KEY=your_local_jwt_secret_here
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=15
   REFRESH_TOKEN_EXPIRE_DAYS=7
   ```

   If PostgreSQL is not reachable, the app falls back to `backend/instance/taskflow_ai.db`.

5. **Create the PostgreSQL database**

   Create the database named in `DATABASE_URL` with your preferred PostgreSQL tooling, for example:

   ```bash
   createdb <db_name>
   ```

6. **Run database migrations**

   From inside `backend/`:

   ```bash
   alembic upgrade head
   ```

7. **Import legacy JSON data once**

   From inside `backend/`:

   ```bash
   python scripts/migrate_tasks_json_to_db.py
   ```

8. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

## Running the Application

1. **Start the backend** from inside `backend/`

   ```bash
   uvicorn app:app --reload --host 127.0.0.1 --port 5000
   ```

   The API will run on http://localhost:5000. Visiting that URL returns backend status JSON, and http://localhost:5000/docs shows the FastAPI endpoint docs.

2. **Start the React frontend** from inside `frontend/`

   ```bash
   npm run dev
   ```

   The app will open at http://localhost:5173.

## API Endpoints

### Task Management

| Method | Endpoint                      | Description                  |
| ------ | ----------------------------- | ---------------------------- |
| GET    | `/api/tasks`                  | Get all tasks                |
| POST   | `/api/tasks`                  | Create a new task            |
| PUT    | `/api/tasks/:id`              | Update a task                |
| DELETE | `/api/tasks/:id`              | Delete a task                |
| PATCH  | `/api/tasks/:id/status`       | Update task status           |
| POST   | `/api/tasks/:id/comments`     | Add a collaboration comment  |
| PUT    | `/api/tasks/:id/dependencies` | Replace blocker dependencies |
| POST   | `/api/tasks/:id/time-logs`    | Log focus time for a task    |
| GET    | `/api/stats`                  | Get task statistics          |

### AI Agent

| Method | Endpoint                       | Description                            |
| ------ | ------------------------------ | -------------------------------------- |
| POST   | `/api/agent/chat`              | Chat with the AI assistant             |
| POST   | `/api/agent/parse-task`        | Parse natural language into task       |
| POST   | `/api/agent/breakdown`         | Break down a task into subtasks        |
| GET    | `/api/agent/plan-day`          | Get prioritized daily plan             |
| GET    | `/api/agent/insights`          | Get productivity insights              |
| GET    | `/api/agent/prioritize`        | Get AI-ranked task priorities          |
| GET    | `/api/agent/schedule`          | Get AI-generated time blocks           |
| POST   | `/api/agent/apply-schedule`    | Save suggested time blocks to tasks    |
| GET    | `/api/agent/daily-summary`     | Get end-of-day recap and next-day plan |
| GET    | `/api/agent/workload-forecast` | Get weekly capacity forecast           |
| POST   | `/api/agent/create-from-chat`  | Create task from parsed data           |
| POST   | `/api/agent/create-subtasks`   | Create multiple subtasks for a task    |

### Habits

| Method | Endpoint                 | Description                  |
| ------ | ------------------------ | ---------------------------- |
| GET    | `/api/habits`            | Get all habits               |
| POST   | `/api/habits`            | Create a habit               |
| PATCH  | `/api/habits/:id/toggle` | Toggle completion for a date |
| DELETE | `/api/habits/:id`        | Delete a habit               |

### Authentication

| Method | Endpoint             | Description                    |
| ------ | -------------------- | ------------------------------ |
| POST   | `/api/auth/register` | Create an account and get JWTs |
| POST   | `/api/auth/login`    | Login and get JWTs             |
| POST   | `/api/auth/refresh`  | Refresh an expired access JWT  |
| GET    | `/api/auth/me`       | Get the current user           |

## Development Checks

Run these from inside `backend/`:

```bash
flake8 .
pytest -q
```

CI runs lint and tests on every push and pull request through `.github/workflows/ci.yml`.

## AI Modes

- **With Gemini API Key**: Set `GEMINI_API_KEY` for AI-powered natural language understanding. You can optionally set `GEMINI_MODEL`; the default is `gemini-2.0-flash`.
- **Without API Key**: Uses rule-based parsing for common task creation patterns.

## License

This project is open source and available under the MIT License.
