from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
import json
import os
from datetime import datetime
import uuid
from agent import get_agent, TaskAgent

app = Flask(__name__)
CORS(app)  # Enable CORS for React dev server

# Initialize AI agent (will work without API key using rule-based parsing)
agent = get_agent(os.getenv("OPENAI_API_KEY"))

# Data file path
DATA_FILE = "tasks_data.json"

def load_tasks():
    """Load tasks from JSON file"""
    if not os.path.exists(DATA_FILE):
        return {"tasks": [], "lists": ["To Do", "In Progress", "Done"]}
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_tasks(data):
    """Save tasks to JSON file"""
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def get_default_task():
    """Return default task structure"""
    return {
        "id": str(uuid.uuid4()),
        "title": "",
        "description": "",
        "status": "To Do",
        "priority": "Medium",
        "due_date": "",
        "tags": [],
        "created_at": datetime.now().isoformat(),
        "completed_at": None
    }

# Routes
@app.route("/")
def index():
    """Main dashboard page"""
    data = load_tasks()
    return render_template("index.html", data=data)

@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    """Get all tasks"""
    data = load_tasks()
    return jsonify(data)

@app.route("/api/tasks", methods=["POST"])
def add_task():
    """Add a new task"""
    data = load_tasks()
    task_data = request.json
    
    new_task = get_default_task()
    new_task["title"] = task_data.get("title", "Untitled Task")
    new_task["description"] = task_data.get("description", "")
    new_task["status"] = task_data.get("status", "To Do")
    new_task["priority"] = task_data.get("priority", "Medium")
    new_task["due_date"] = task_data.get("due_date", "")
    new_task["tags"] = task_data.get("tags", [])
    
    data["tasks"].append(new_task)
    save_tasks(data)
    
    return jsonify({"success": True, "task": new_task})

@app.route("/api/tasks/<task_id>", methods=["PUT"])
def update_task(task_id):
    """Update an existing task"""
    data = load_tasks()
    task_data = request.json
    
    for task in data["tasks"]:
        if task["id"] == task_id:
            task["title"] = task_data.get("title", task["title"])
            task["description"] = task_data.get("description", task["description"])
            task["status"] = task_data.get("status", task["status"])
            task["priority"] = task_data.get("priority", task["priority"])
            task["due_date"] = task_data.get("due_date", task["due_date"])
            task["tags"] = task_data.get("tags", task["tags"])
            
            # Mark completion time if moved to Done
            if task["status"] == "Done" and not task["completed_at"]:
                task["completed_at"] = datetime.now().isoformat()
            elif task["status"] != "Done":
                task["completed_at"] = None
            
            save_tasks(data)
            return jsonify({"success": True, "task": task})
    
    return jsonify({"success": False, "error": "Task not found"}), 404

@app.route("/api/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    """Delete a task"""
    data = load_tasks()
    
    original_length = len(data["tasks"])
    data["tasks"] = [t for t in data["tasks"] if t["id"] != task_id]
    
    if len(data["tasks"]) < original_length:
        save_tasks(data)
        return jsonify({"success": True})
    
    return jsonify({"success": False, "error": "Task not found"}), 404

@app.route("/api/tasks/<task_id>/status", methods=["PATCH"])
def update_task_status(task_id):
    """Update task status (for drag and drop)"""
    data = load_tasks()
    new_status = request.json.get("status")
    
    for task in data["tasks"]:
        if task["id"] == task_id:
            task["status"] = new_status
            
            if new_status == "Done" and not task["completed_at"]:
                task["completed_at"] = datetime.now().isoformat()
            elif new_status != "Done":
                task["completed_at"] = None
            
            save_tasks(data)
            return jsonify({"success": True, "task": task})
    
    return jsonify({"success": False, "error": "Task not found"}), 404

@app.route("/api/stats")
def get_stats():
    """Get task statistics for dashboard"""
    data = load_tasks()
    tasks = data["tasks"]
    
    stats = {
        "total": len(tasks),
        "todo": len([t for t in tasks if t["status"] == "To Do"]),
        "in_progress": len([t for t in tasks if t["status"] == "In Progress"]),
        "done": len([t for t in tasks if t["status"] == "Done"]),
        "high_priority": len([t for t in tasks if t["priority"] == "High"]),
        "overdue": 0
    }
    
    # Calculate overdue tasks
    today = datetime.now().date()
    for task in tasks:
        if task["due_date"] and task["status"] != "Done":
            due = datetime.fromisoformat(task["due_date"]).date()
            if due < today:
                stats["overdue"] += 1
    
    return jsonify(stats)

# ==================== AI Agent Endpoints ====================

@app.route("/api/agent/chat", methods=["POST"])
def agent_chat():
    """Process a chat message through the AI agent"""
    data = load_tasks()
    message = request.json.get("message", "")
    
    if not message.strip():
        return jsonify({"error": "Message is required"}), 400
    
    result = agent.chat(message, data["tasks"])
    return jsonify(result)

@app.route("/api/agent/parse-task", methods=["POST"])
def parse_task():
    """Parse natural language into task data"""
    text = request.json.get("text", "")
    
    if not text.strip():
        return jsonify({"error": "Text is required"}), 400
    
    task_data = agent.parse_task_with_ai(text) if agent.client else agent.parse_task_from_text(text)
    return jsonify(task_data)

@app.route("/api/agent/breakdown", methods=["POST"])
def breakdown_task():
    """Break down a task into subtasks"""
    title = request.json.get("title", "")
    description = request.json.get("description", "")
    
    if not title.strip():
        return jsonify({"error": "Task title is required"}), 400
    
    subtasks = agent.break_down_task_with_ai(title, description)
    return jsonify({"subtasks": subtasks})

@app.route("/api/agent/plan-day", methods=["GET"])
def plan_day():
    """Get a daily plan based on current tasks"""
    data = load_tasks()
    plan = agent.plan_day(data["tasks"])
    return jsonify(plan)

@app.route("/api/agent/insights", methods=["GET"])
def get_insights():
    """Get productivity insights"""
    data = load_tasks()
    insights = agent.get_productivity_insights(data["tasks"])
    return jsonify(insights)

@app.route("/api/agent/create-from-chat", methods=["POST"])
def create_task_from_chat():
    """Create a task from AI-parsed data"""
    data = load_tasks()
    task_data = request.json
    
    new_task = get_default_task()
    new_task["title"] = task_data.get("title", "Untitled Task")
    new_task["description"] = task_data.get("description", "")
    new_task["status"] = task_data.get("status", "To Do")
    new_task["priority"] = task_data.get("priority", "Medium")
    new_task["due_date"] = task_data.get("due_date", "")
    new_task["tags"] = task_data.get("tags", [])
    
    data["tasks"].append(new_task)
    save_tasks(data)
    
    return jsonify({"success": True, "task": new_task})

@app.route("/api/agent/create-subtasks", methods=["POST"])
def create_subtasks():
    """Create multiple subtasks at once"""
    data = load_tasks()
    subtasks = request.json.get("subtasks", [])
    parent_tag = request.json.get("parent_tag", "")
    
    created_tasks = []
    for subtask in subtasks:
        new_task = get_default_task()
        new_task["title"] = subtask.get("title", "Subtask")
        new_task["priority"] = subtask.get("priority", "Medium")
        new_task["tags"] = [parent_tag] if parent_tag else []
        
        data["tasks"].append(new_task)
        created_tasks.append(new_task)
    
    save_tasks(data)
    return jsonify({"success": True, "tasks": created_tasks})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
