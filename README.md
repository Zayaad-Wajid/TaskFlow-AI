# TaskFlow - Task Manager

A modern, ClickUp-inspired task management application built with React, Tailwind CSS, and Flask.

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
- **Dark Theme** - Modern purple/slate color scheme
- **Team Collaboration** - Assign tasks to teammates and keep lightweight task comments
- **Offline Mode** - Cached tasks and stats remain available when the backend/network is unavailable
- **Pomodoro Timer** - Built-in focus timer for 25-minute work sessions
- **Habit Tracking** - Create daily habits, mark today complete, and track streaks

### AI Assistant
- **Natural Language Task Creation** - Create tasks by typing naturally (e.g., "Create a task to review the report by Friday, high priority")
- **Smart Task Parsing** - Automatically extracts title, description, priority, and due dates from text
- **Task Breakdown** - AI splits complex tasks into manageable subtasks
- **Daily Planner** - Get a prioritized plan for your day's tasks
- **Productivity Insights** - Analytics on completion rates, overdue tasks, and personalized tips
- **AI Task Prioritization** - Rank active work by priority, urgency, progress, and ownership
- **AI Scheduling Assistant** - Generate time-blocked schedules from active tasks and estimates
- **Chat Interface** - Floating AI assistant accessible from any view

## Tech Stack

### Frontend

- **React 19** - UI framework
- **Tailwind CSS** - Utility-first styling
- **Vite** - Build tool and dev server
- **dnd-kit** - Drag and drop functionality
- **Lucide React** - Icon library
- **Axios** - HTTP client

### Backend

- **Flask** - Python web framework
- **Flask-CORS** - Cross-origin resource sharing
- **OpenAI** (optional) - Enhanced AI-powered task parsing and insights

## Project Structure

```
TaskFlow/
├── app.py                    # Flask backend API
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

1. **Start the Flask backend** (in one terminal)

   ```bash
   python app.py
   ```

   The API will run on http://localhost:5000

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
4. Open the **Productivity** view to use AI priorities, AI scheduling, Pomodoro, habits, and team collaboration panels
5. Confirm task creation when the AI parses your request

### AI Modes

The AI assistant works in two modes:

- **With OpenAI API Key**: Set the `OPENAI_API_KEY` environment variable for full AI-powered natural language understanding
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

Built with ❤️ using React and Flask
