# TaskFlow - Task Manager

A modern, ClickUp-inspired task management application built with React, Tailwind CSS, and a Flask API served by Uvicorn.

![TaskFlow Screenshot](screenshot.png)

## Features

### Task Management
- **Kanban Board** - Drag and drop tasks between To Do, In Progress, and Done columns
- **List View** - Table view with sorting and quick actions
- **Calendar View** - See tasks by their due dates
- **Task Management** - Create, edit, and delete tasks with:
  - Title and description
  - Priority levels (High, Medium, Low)
  - Due dates
  - Tags
- **Search & Filter** - Find tasks quickly with search and priority filters
- **Real-time Stats** - Dashboard showing task counts and overdue items
- **Clean UI** - Calm darker interface with focused spacing and friendly interactions
- **Team Collaboration** - Assign tasks to teammates and keep lightweight task comments
- **Offline Mode** - Cached tasks and stats remain available when the backend/network is unavailable
- **Pomodoro Timer** - Built-in focus timer for 25-minute work sessions
- **Habit Tracking** - Create daily habits, mark today complete, and track streaks
- **Recurring Tasks** - Daily and weekly task series auto-clone from the next due date
- **Task Dependencies** - Link blocker tasks and surface blocked indicators on cards
- **Time Tracking** - Log manual or Pomodoro focus sessions per task

### AI Assistant
- **Natural Language Task Creation** - Create tasks by typing naturally (e.g., "Create a task to review the report by Friday, high priority")
- **Smart Task Parsing** - Automatically extracts title, description, priority, and due dates from text
- **Task Breakdown** - AI splits complex tasks into manageable subtasks
- **Daily Planner** - Get a prioritized plan for your day's tasks
- **Productivity Insights** - Analytics on completion rates, overdue tasks, and personalized tips
- **AI Task Prioritization** - Rank active work by priority, urgency, progress, and ownership
- **AI Scheduling Assistant** - Generate time-blocked schedules from active tasks and estimates
- **AI Daily Summary** - End-of-day recap, focus totals, and next-day plan
- **Workload Forecasting** - Weekly capacity forecast from due dates and task estimates
- **Chat Interface** - Floating AI assistant accessible from any view

### Storage and Migration

TaskFlow still uses `tasks_data.json`. The backend loader normalizes older files in memory and backfills new fields such as `dependency_ids`, `recurring`, `time_logs`, `activity_feed`, and `settings` before saving. No manual migration step is required.

## Tech Stack

### Frontend

- **React 19** - UI framework
- **Tailwind CSS** - Utility-first styling
- **Vite** - Build tool and dev server
- **dnd-kit** - Drag and drop functionality
- **Lucide React** - Icon library
- **Axios** - HTTP client

### Backend

- **Flask + Uvicorn** - API backend served through an ASGI wrapper
- **Flask-CORS** - Cross-origin resource sharing
- **Gemini** (optional) - Enhanced AI-powered task parsing and insights

## Project Structure

```
TaskFlow/
├── app.py                    # Flask backend API with ASGI/Uvicorn entrypoint
├── agent.py                  # AI agent module
├── requirements.txt          # Python dependencies
├── tasks_data.json           # Task data storage
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Navigation & stats
│   │   │   ├── Header.jsx        # Search & add task
│   │   │   ├── BoardView.jsx     # Kanban board
│   │   │   ├── BoardColumn.jsx   # Board column
│   │   │   ├── TaskCard.jsx      # Task card
│   │   │   ├── ListView.jsx      # Table view
│   │   │   ├── CalendarView.jsx  # Calendar view
│   │   │   ├── TaskModal.jsx     # Add/edit modal
│   │   │   ├── DeleteModal.jsx   # Delete confirmation
│   │   │   ├── Toast.jsx         # Notifications
│   │   │   └── AIChat.jsx        # AI chat assistant
│   │   ├── api.js               # API client
│   │   ├── App.jsx              # Main app
│   │   └── index.css            # Tailwind styles
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd TaskFlow
   ```

2. **Install Python dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

### Running the Application

1. **Start the backend** (in one terminal)

   ```bash
   python app.py
   ```

   Or run Uvicorn directly:

   ```bash
   uvicorn app:asgi_app --reload --host 127.0.0.1 --port 5000
   ```

   The API will run on http://localhost:5000. Visiting that URL returns backend status JSON; the React UI runs from the frontend dev server.

2. **Start the React frontend** (in another terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   The app will open at http://localhost:5173

## API Endpoints

### Task Management

| Method | Endpoint                | Description         |
| ------ | ----------------------- | ------------------- |
| GET    | `/api/tasks`            | Get all tasks       |
| POST   | `/api/tasks`            | Create a new task   |
| PUT    | `/api/tasks/:id`        | Update a task       |
| DELETE | `/api/tasks/:id`        | Delete a task       |
| PATCH  | `/api/tasks/:id/status` | Update task status  |
| POST   | `/api/tasks/:id/comments` | Add a collaboration comment |
| PUT    | `/api/tasks/:id/dependencies` | Replace blocker dependencies |
| POST   | `/api/tasks/:id/time-logs` | Log focus time for a task |
| GET    | `/api/stats`            | Get task statistics |

### AI Agent

| Method | Endpoint                      | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| POST   | `/api/agent/chat`             | Chat with the AI assistant           |
| POST   | `/api/agent/parse-task`       | Parse natural language into task     |
| POST   | `/api/agent/breakdown`        | Break down a task into subtasks      |
| GET    | `/api/agent/plan-day`         | Get prioritized daily plan           |
| GET    | `/api/agent/insights`         | Get productivity insights            |
| GET    | `/api/agent/prioritize`       | Get AI-ranked task priorities        |
| GET    | `/api/agent/schedule`         | Get AI-generated time blocks         |
| POST   | `/api/agent/apply-schedule`   | Save suggested time blocks to tasks  |
| GET    | `/api/agent/daily-summary`    | Get end-of-day recap and next-day plan |
| GET    | `/api/agent/workload-forecast` | Get weekly capacity forecast        |
| POST   | `/api/agent/create-from-chat` | Create task from parsed data         |
| POST   | `/api/agent/create-subtasks`  | Create multiple subtasks for a task  |

### Habits

| Method | Endpoint                    | Description                   |
| ------ | --------------------------- | ----------------------------- |
| GET    | `/api/habits`               | Get all habits                |
| POST   | `/api/habits`               | Create a habit                |
| PATCH  | `/api/habits/:id/toggle`    | Toggle completion for a date  |
| DELETE | `/api/habits/:id`           | Delete a habit                |

## Usage

### Adding a Task

1. Click the **"Add Task"** button in the header
2. Fill in the task details (title, description, priority, due date, tags)
3. Click **"Add Task"** to save

### Moving Tasks

- **Drag and drop** tasks between columns on the Board view
- Or click **Edit** and change the status

### Filtering Tasks

- Use the **search bar** to find tasks by title or description
- Use the **priority filter** in the sidebar to show specific priorities

### Using the AI Assistant

1. Click the **chat bubble** icon in the bottom-right corner
2. Type naturally to create tasks:
   - "Create a task to finish the presentation by tomorrow with high priority"
   - "Add a medium priority task for code review"
3. Use **Quick Actions**:
   - **Plan my day** - Get a prioritized list of today's tasks
   - **Insights** - View productivity analytics and tips
4. Open the **Focus** view to use AI priorities, AI scheduling, Pomodoro, habits, team notes, summaries, and workload forecasting
5. Confirm task creation when the AI parses your request

### AI Modes

The AI assistant works in two modes:

- **With Gemini API Key**: Set the `GEMINI_API_KEY` environment variable for AI-powered natural language understanding. You can optionally set `GEMINI_MODEL`; the default is `gemini-2.0-flash`.
- **Without API Key**: Uses intelligent rule-based parsing (works well for common task creation patterns)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

---

Built with React, Flask, Uvicorn, and Gemini
