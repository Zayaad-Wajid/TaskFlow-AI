"""
AI Agent Module for TaskFlow
Handles natural language processing, task parsing, and intelligent suggestions.
"""

import json
import re
from datetime import datetime, timedelta
from typing import Optional
import os

# Try to import Gemini - rule-based fallbacks still work without it
try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

class TaskAgent:
    """AI Agent for task management operations"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.client = None
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        
        if GEMINI_AVAILABLE and self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        
        # Define available tools/functions for the agent
        self.tools = [
            {
                "type": "function",
                "function": {
                    "name": "create_task",
                    "description": "Create a new task with the specified details",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "The title of the task"
                            },
                            "description": {
                                "type": "string",
                                "description": "Detailed description of the task"
                            },
                            "priority": {
                                "type": "string",
                                "enum": ["Low", "Medium", "High"],
                                "description": "Priority level of the task"
                            },
                            "due_date": {
                                "type": "string",
                                "description": "Due date in YYYY-MM-DD format"
                            },
                            "tags": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Tags for categorizing the task"
                            }
                        },
                        "required": ["title"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "break_down_task",
                    "description": "Break down a complex task into smaller subtasks",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "main_task": {
                                "type": "string",
                                "description": "The main task to break down"
                            },
                            "subtasks": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "title": {"type": "string"},
                                        "priority": {"type": "string", "enum": ["Low", "Medium", "High"]}
                                    }
                                },
                                "description": "List of subtasks"
                            }
                        },
                        "required": ["main_task", "subtasks"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "plan_day",
                    "description": "Create a daily plan based on existing tasks",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "morning_tasks": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Tasks to complete in the morning"
                            },
                            "afternoon_tasks": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Tasks to complete in the afternoon"
                            },
                            "evening_tasks": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Tasks to complete in the evening"
                            },
                            "summary": {
                                "type": "string",
                                "description": "Brief summary of the day plan"
                            }
                        },
                        "required": ["summary"]
                    }
                }
            }
        ]
    
    def _parse_date_naturally(self, text: str) -> Optional[str]:
        """Parse natural language date references"""
        text = text.lower()
        today = datetime.now()
        
        # Common patterns
        if "today" in text:
            return today.strftime("%Y-%m-%d")
        elif "tomorrow" in text:
            return (today + timedelta(days=1)).strftime("%Y-%m-%d")
        elif "next week" in text:
            return (today + timedelta(days=7)).strftime("%Y-%m-%d")
        elif "next monday" in text:
            days_ahead = 7 - today.weekday()  # Monday is 0
            if days_ahead <= 0:
                days_ahead += 7
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        elif "next tuesday" in text:
            days_ahead = 1 - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        elif "next wednesday" in text:
            days_ahead = 2 - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        elif "next thursday" in text:
            days_ahead = 3 - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        elif "next friday" in text:
            days_ahead = 4 - today.weekday()
            if days_ahead <= 0:
                days_ahead += 7
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        
        # Try to find date patterns like "March 5" or "3/5"
        date_match = re.search(r'(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?', text)
        if date_match:
            month, day = int(date_match.group(1)), int(date_match.group(2))
            year = int(date_match.group(3)) if date_match.group(3) else today.year
            if year < 100:
                year += 2000
            try:
                return datetime(year, month, day).strftime("%Y-%m-%d")
            except ValueError:
                pass
        
        return None
    
    def _detect_priority(self, text: str) -> str:
        """Detect priority from natural language"""
        text = text.lower()
        
        high_keywords = ["urgent", "asap", "critical", "important", "high priority", "immediately", "emergency"]
        low_keywords = ["when you can", "low priority", "eventually", "sometime", "not urgent"]
        
        for keyword in high_keywords:
            if keyword in text:
                return "High"
        
        for keyword in low_keywords:
            if keyword in text:
                return "Low"
        
        return "Medium"
    
    def _extract_tags(self, text: str) -> list:
        """Extract potential tags from text"""
        # Look for hashtags
        hashtags = re.findall(r'#(\w+)', text)
        if hashtags:
            return hashtags
        
        # Common category keywords
        categories = {
            "work": ["work", "job", "office", "meeting", "client", "project"],
            "personal": ["personal", "home", "family", "health", "exercise"],
            "shopping": ["buy", "shop", "purchase", "order"],
            "learning": ["learn", "study", "course", "read", "research"],
        }
        
        tags = []
        text_lower = text.lower()
        for tag, keywords in categories.items():
            for keyword in keywords:
                if keyword in text_lower:
                    tags.append(tag)
                    break
        
        return list(set(tags))
    
    def parse_task_from_text(self, text: str) -> dict:
        """Parse a task from natural language without using AI API"""
        # Basic parsing - extract what we can
        result = {
            "title": text.strip(),
            "description": "",
            "priority": self._detect_priority(text),
            "due_date": self._parse_date_naturally(text) or "",
            "tags": self._extract_tags(text),
            "status": "To Do"
        }
        
        # Clean up title - remove date references
        date_patterns = [
            r'\b(today|tomorrow|next week|next \w+day)\b',
            r'\b(urgent|asap|high priority|low priority)\b',
            r'\bat \d{1,2}(:\d{2})?\s*(am|pm)?\b',
            r'\bon \d{1,2}[/\-]\d{1,2}([/\-]\d{2,4})?\b',
        ]
        
        clean_title = text
        for pattern in date_patterns:
            clean_title = re.sub(pattern, '', clean_title, flags=re.IGNORECASE)
        
        clean_title = ' '.join(clean_title.split())  # Clean up extra spaces
        if clean_title:
            result["title"] = clean_title
        
        return result
    
    def _extract_json_object(self, text: str) -> dict:
        """Extract JSON from a Gemini response, including fenced code blocks."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
            cleaned = re.sub(r"```$", "", cleaned).strip()
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match:
            cleaned = match.group(0)
        return json.loads(cleaned)

    def parse_task_with_ai(self, text: str) -> dict:
        """Parse a task using Gemini API for better understanding."""
        if not self.client:
            return self.parse_task_from_text(text)
        
        try:
            today = datetime.now().strftime("%Y-%m-%d")
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=f"""You are a task parsing assistant. Extract task details from user input.
Today's date is {today}. Parse dates relative to today.
Return only valid JSON with these keys: title, description, priority, due_date, tags.
priority must be Low, Medium, or High. due_date must be YYYY-MM-DD or an empty string.

User input: {text}""",
                config={"response_mime_type": "application/json"},
            )
            
            result = self._extract_json_object(response.text)
            return {
                "title": result.get("title", text),
                "description": result.get("description", ""),
                "priority": result.get("priority", "Medium"),
                "due_date": result.get("due_date", ""),
                "tags": result.get("tags", []),
                "status": "To Do"
            }
        except Exception as e:
            print(f"Gemini parsing error: {e}")
            return self.parse_task_from_text(text)
    
    def break_down_task_with_ai(self, task_title: str, task_description: str = "") -> list:
        """Break down a complex task into subtasks using AI"""
        if not self.client:
            return self._simple_breakdown(task_title)
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=f"""You are a project planning assistant. Break down complex tasks into 3-6 actionable subtasks.
Return only valid JSON with this shape: {{"subtasks": [{{"title": "...", "priority": "Low|Medium|High"}}]}}.

Task: {task_title}
Description: {task_description}""",
                config={"response_mime_type": "application/json"},
            )
            
            result = self._extract_json_object(response.text)
            return result.get("subtasks", self._simple_breakdown(task_title))
        except Exception as e:
            print(f"Gemini breakdown error: {e}")
            return self._simple_breakdown(task_title)
    
    def _simple_breakdown(self, task_title: str) -> list:
        """Simple rule-based task breakdown"""
        # Generic subtasks for common task types
        task_lower = task_title.lower()
        
        if any(word in task_lower for word in ["website", "app", "build", "create", "develop"]):
            return [
                {"title": "Research and planning", "priority": "High"},
                {"title": "Design mockups", "priority": "Medium"},
                {"title": "Set up project structure", "priority": "High"},
                {"title": "Implement core features", "priority": "High"},
                {"title": "Testing and debugging", "priority": "Medium"},
                {"title": "Deploy and review", "priority": "Low"}
            ]
        elif any(word in task_lower for word in ["report", "document", "write"]):
            return [
                {"title": "Research and gather information", "priority": "High"},
                {"title": "Create outline", "priority": "Medium"},
                {"title": "Write first draft", "priority": "High"},
                {"title": "Review and edit", "priority": "Medium"},
                {"title": "Final review and submit", "priority": "Low"}
            ]
        elif any(word in task_lower for word in ["meeting", "presentation"]):
            return [
                {"title": "Define agenda/objectives", "priority": "High"},
                {"title": "Prepare materials", "priority": "High"},
                {"title": "Send invites/reminders", "priority": "Medium"},
                {"title": "Conduct meeting/presentation", "priority": "High"},
                {"title": "Follow up with notes", "priority": "Low"}
            ]
        else:
            return [
                {"title": f"Plan: {task_title}", "priority": "High"},
                {"title": f"Execute: {task_title}", "priority": "High"},
                {"title": f"Review: {task_title}", "priority": "Medium"}
            ]
    
    def plan_day(self, tasks: list) -> dict:
        """Create a daily plan based on tasks"""
        if not tasks:
            return {
                "morning_tasks": [],
                "afternoon_tasks": [],
                "evening_tasks": [],
                "summary": "No tasks to plan. Add some tasks to get started!",
                "suggestions": ["Add your first task using the chat or the Add Task button."]
            }
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Categorize tasks
        overdue = []
        due_today = []
        high_priority = []
        in_progress = []
        other = []
        
        for task in tasks:
            if task["status"] == "Done":
                continue
            
            if task["due_date"]:
                if task["due_date"] < today:
                    overdue.append(task)
                elif task["due_date"] == today:
                    due_today.append(task)
                elif task["priority"] == "High":
                    high_priority.append(task)
                elif task["status"] == "In Progress":
                    in_progress.append(task)
                else:
                    other.append(task)
            elif task["priority"] == "High":
                high_priority.append(task)
            elif task["status"] == "In Progress":
                in_progress.append(task)
            else:
                other.append(task)
        
        # Plan the day
        morning = (overdue + due_today)[:3]
        afternoon = (high_priority + in_progress)[:3]
        evening = other[:2]
        
        # Build summary
        summary_parts = []
        if overdue:
            summary_parts.append(f"⚠️ You have {len(overdue)} overdue task(s) to address first.")
        if due_today:
            summary_parts.append(f"📅 {len(due_today)} task(s) due today.")
        if high_priority:
            summary_parts.append(f"🔴 {len(high_priority)} high-priority task(s) to focus on.")
        
        active_count = len([t for t in tasks if t["status"] != "Done"])
        summary_parts.append(f"📊 Total active tasks: {active_count}")
        
        suggestions = []
        if len(overdue) > 2:
            suggestions.append("Consider rescheduling some overdue tasks to avoid overwhelm.")
        if not due_today and not high_priority:
            suggestions.append("Great! No urgent tasks today. Focus on making progress on your backlog.")
        if len([t for t in tasks if t["status"] == "In Progress"]) > 3:
            suggestions.append("You have many tasks in progress. Try to complete some before starting new ones.")
        
        return {
            "morning_tasks": [t["title"] for t in morning],
            "afternoon_tasks": [t["title"] for t in afternoon],
            "evening_tasks": [t["title"] for t in evening],
            "summary": " ".join(summary_parts),
            "suggestions": suggestions,
            "stats": {
                "overdue": len(overdue),
                "due_today": len(due_today),
                "high_priority": len(high_priority),
                "in_progress": len(in_progress)
            }
        }
    
    def get_productivity_insights(self, tasks: list) -> dict:
        """Generate productivity insights from task history"""
        if not tasks:
            return {
                "message": "No task data yet. Start adding and completing tasks to see insights!",
                "insights": []
            }
        
        completed = [t for t in tasks if t["status"] == "Done"]
        total = len(tasks)
        completion_rate = len(completed) / total * 100 if total > 0 else 0
        
        # Analyze completion times
        insights = []
        
        insights.append(f"📈 Task completion rate: {completion_rate:.1f}%")
        insights.append(f"✅ Completed: {len(completed)} | 📋 Total: {total}")
        
        # Priority distribution
        high = len([t for t in tasks if t["priority"] == "High"])
        medium = len([t for t in tasks if t["priority"] == "Medium"])
        low = len([t for t in tasks if t["priority"] == "Low"])
        insights.append(f"🎯 Priority mix: {high} High, {medium} Medium, {low} Low")
        
        # Suggestions
        suggestions = []
        if completion_rate < 30:
            suggestions.append("Try breaking large tasks into smaller, more manageable pieces.")
        if high > total * 0.5:
            suggestions.append("Many tasks marked as high priority. Consider if all are truly urgent.")
        
        return {
            "completion_rate": completion_rate,
            "insights": insights,
            "suggestions": suggestions
        }
    

    def _priority_score(self, task: dict) -> tuple:
        """Score tasks by urgency, priority, and progress for prioritization."""
        today = datetime.now().date()
        score = 0
        reasons = []

        priority = task.get("priority", "Medium")
        if priority == "High":
            score += 50
            reasons.append("high priority")
        elif priority == "Medium":
            score += 25
            reasons.append("medium priority")
        else:
            score += 10

        due_date = task.get("due_date")
        if due_date:
            try:
                due = datetime.fromisoformat(due_date).date()
                days_until_due = (due - today).days
                if days_until_due < 0:
                    score += 60
                    reasons.append(f"{abs(days_until_due)} day(s) overdue")
                elif days_until_due == 0:
                    score += 45
                    reasons.append("due today")
                elif days_until_due <= 3:
                    score += 30
                    reasons.append(f"due in {days_until_due} day(s)")
            except ValueError:
                pass

        if task.get("status") == "In Progress":
            score += 15
            reasons.append("already in progress")

        if task.get("assigned_to"):
            score += 5
            reasons.append(f"assigned to {task['assigned_to']}")

        if task.get("dependency_ids"):
            score -= 20
            reasons.append("has blocker dependencies")

        return score, reasons or ["backlog task"]

    def prioritize_tasks(self, tasks: list) -> dict:
        """Rank active tasks and explain why each should be tackled."""
        active_tasks = [task for task in tasks if task.get("status") != "Done"]
        ranked = []

        for task in active_tasks:
            score, reasons = self._priority_score(task)
            ranked.append({
                "task_id": task.get("id"),
                "title": task.get("title", "Untitled Task"),
                "priority": task.get("priority", "Medium"),
                "due_date": task.get("due_date", ""),
                "assigned_to": task.get("assigned_to", ""),
                "is_blocked": bool(task.get("dependency_ids")),
                "score": score,
                "reasons": reasons,
            })

        ranked.sort(key=lambda item: item["score"], reverse=True)
        return {
            "prioritized_tasks": ranked,
            "summary": "AI priority ranking balances due dates, priority, progress, and ownership.",
        }

    def suggest_schedule(self, tasks: list, workday_start: str = "09:00", workday_end: str = "17:00") -> dict:
        """Create a simple time-blocked schedule for the highest-priority active tasks."""
        active_tasks = [task for task in tasks if task.get("status") != "Done"]
        ranked_tasks = sorted(active_tasks, key=lambda task: self._priority_score(task)[0], reverse=True)
        today = datetime.now().date()

        try:
            cursor = datetime.fromisoformat(f"{today}T{workday_start}")
            end_of_day = datetime.fromisoformat(f"{today}T{workday_end}")
        except ValueError:
            cursor = datetime.fromisoformat(f"{today}T09:00")
            end_of_day = datetime.fromisoformat(f"{today}T17:00")

        blocks = []
        for task in ranked_tasks:
            if cursor >= end_of_day:
                break

            estimate = task.get("estimate_minutes") or 30
            try:
                estimate = int(estimate)
            except (TypeError, ValueError):
                estimate = 30
            estimate = min(max(estimate, 15), 180)

            block_end = min(cursor + timedelta(minutes=estimate), end_of_day)
            if block_end <= cursor:
                break

            score, reasons = self._priority_score(task)
            blocks.append({
                "task_id": task.get("id"),
                "title": task.get("title", "Untitled Task"),
                "start": cursor.isoformat(timespec="minutes"),
                "end": block_end.isoformat(timespec="minutes"),
                "estimate_minutes": int((block_end - cursor).total_seconds() / 60),
                "score": score,
                "reason": ", ".join(reasons),
            })

            cursor = block_end + timedelta(minutes=10)

        return {
            "blocks": blocks,
            "summary": f"Scheduled {len(blocks)} priority task(s) with short buffers between focus blocks.",
        }

    def daily_summary(self, tasks: list, activity_feed: Optional[list] = None) -> dict:
        """Create an end-of-day recap and next-day plan."""
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)
        activity_feed = activity_feed or []

        completed_today = []
        active_tasks = []
        due_tomorrow = []
        focus_minutes = 0

        for task in tasks:
            if task.get("completed_at"):
                try:
                    completed_at = datetime.fromisoformat(task["completed_at"]).date()
                    if completed_at == today:
                        completed_today.append(task)
                except ValueError:
                    pass

            if task.get("status") != "Done":
                active_tasks.append(task)
                if task.get("due_date"):
                    try:
                        due = datetime.fromisoformat(task["due_date"]).date()
                        if due == tomorrow:
                            due_tomorrow.append(task)
                    except ValueError:
                        pass

            for log in task.get("time_logs", []):
                try:
                    created = datetime.fromisoformat(log.get("created_at", "")).date()
                except ValueError:
                    created = None
                if created == today:
                    focus_minutes += int(log.get("minutes") or 0)

        ranked = self.prioritize_tasks(active_tasks)["prioritized_tasks"][:5]
        recent_activity = [
            item for item in activity_feed
            if str(item.get("created_at", "")).startswith(today.isoformat())
        ][:8]

        if completed_today:
            recap = f"Completed {len(completed_today)} task(s) today with {focus_minutes} logged focus minute(s)."
        else:
            recap = f"No tasks were completed today yet, with {focus_minutes} logged focus minute(s)."

        if due_tomorrow:
            next_day = f"Start tomorrow with {len(due_tomorrow)} task(s) due, then move through the top priorities."
        else:
            next_day = "Tomorrow's plan is based on the highest priority active tasks and open blockers."

        return {
            "recap": recap,
            "next_day_plan": next_day,
            "completed_today": [
                {"task_id": task.get("id"), "title": task.get("title", "Untitled Task")}
                for task in completed_today
            ],
            "top_priorities": ranked,
            "due_tomorrow": [
                {"task_id": task.get("id"), "title": task.get("title", "Untitled Task")}
                for task in due_tomorrow
            ],
            "focus_minutes": focus_minutes,
            "activity": recent_activity,
        }

    def workload_forecast(self, tasks: list, weekly_capacity_minutes: int = 1800) -> dict:
        """Estimate this week's capacity and flag overload from estimates and due dates."""
        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday())
        buckets = []
        total_minutes = 0

        for day_offset in range(7):
            day = week_start + timedelta(days=day_offset)
            day_tasks = []
            day_minutes = 0
            for task in tasks:
                if task.get("status") == "Done":
                    continue
                due_date = task.get("due_date")
                if not due_date:
                    continue
                try:
                    due = datetime.fromisoformat(due_date).date()
                except ValueError:
                    continue
                if due == day:
                    estimate = task.get("estimate_minutes") or 30
                    try:
                        estimate = int(estimate)
                    except (TypeError, ValueError):
                        estimate = 30
                    day_minutes += estimate
                    day_tasks.append({
                        "task_id": task.get("id"),
                        "title": task.get("title", "Untitled Task"),
                        "estimate_minutes": estimate,
                        "priority": task.get("priority", "Medium"),
                    })
            total_minutes += day_minutes
            buckets.append({
                "date": day.isoformat(),
                "estimate_minutes": day_minutes,
                "tasks": day_tasks,
                "over_capacity": day_minutes > max(weekly_capacity_minutes / 5, 1),
            })

        overload = total_minutes > weekly_capacity_minutes
        utilization = (total_minutes / weekly_capacity_minutes * 100) if weekly_capacity_minutes else 0
        return {
            "week_start": week_start.isoformat(),
            "weekly_capacity_minutes": weekly_capacity_minutes,
            "scheduled_estimate_minutes": total_minutes,
            "utilization_percent": round(utilization, 1),
            "overload": overload,
            "message": (
                "Workload is over weekly capacity. Consider rescheduling, delegating, or reducing scope."
                if overload
                else "Workload is within the configured weekly capacity."
            ),
            "days": buckets,
        }

    def chat(self, message: str, tasks: list) -> dict:
        """Process a chat message and return appropriate response"""
        message_lower = message.lower().strip()
        
        # Command detection
        if any(phrase in message_lower for phrase in ["plan my day", "what should i do", "plan today"]):
            plan = self.plan_day(tasks)
            return {
                "type": "plan",
                "response": plan["summary"],
                "data": plan
            }
        
        elif any(phrase in message_lower for phrase in ["prioritize", "priority ranking", "what is most important"]):
            priorities = self.prioritize_tasks(tasks)
            top_titles = [item["title"] for item in priorities["prioritized_tasks"][:3]]
            return {
                "type": "priorities",
                "response": "Top priorities: " + (", ".join(top_titles) if top_titles else "No active tasks."),
                "data": priorities
            }

        elif any(phrase in message_lower for phrase in ["schedule my day", "make a schedule", "time block"]):
            schedule = self.suggest_schedule(tasks)
            return {
                "type": "schedule",
                "response": schedule["summary"],
                "data": schedule
            }

        elif any(phrase in message_lower for phrase in ["how am i doing", "productivity", "insights", "stats"]):
            insights = self.get_productivity_insights(tasks)
            return {
                "type": "insights",
                "response": "\n".join(insights["insights"]),
                "data": insights
            }
        
        elif any(phrase in message_lower for phrase in ["break down", "subtasks for", "split"]):
            # Extract task name
            task_name = message
            for phrase in ["break down", "subtasks for", "split", "into subtasks"]:
                task_name = task_name.replace(phrase, "").strip()
            
            subtasks = self.break_down_task_with_ai(task_name)
            return {
                "type": "breakdown",
                "response": f"Here are suggested subtasks for '{task_name}':",
                "data": {"main_task": task_name, "subtasks": subtasks}
            }
        
        elif any(phrase in message_lower for phrase in ["add task", "create task", "new task", "remind me"]) or \
             any(message_lower.startswith(word) for word in ["add ", "create ", "schedule ", "remind "]):
            # Parse as task creation
            task_data = self.parse_task_with_ai(message) if self.client else self.parse_task_from_text(message)
            return {
                "type": "create_task",
                "response": f"I'll create a task: '{task_data['title']}'",
                "data": task_data
            }
        
        elif any(phrase in message_lower for phrase in ["hello", "hi", "hey"]):
            return {
                "type": "greeting",
                "response": "👋 Hello! I'm your TaskFlow assistant. I can help you:\n• Add tasks (try: 'Add task to call John tomorrow')\n• Plan your day (try: 'Plan my day')\n• Break down tasks (try: 'Break down: Build a website')\n• Show insights (try: 'How am I doing?')",
                "data": None
            }
        
        elif "help" in message_lower:
            return {
                "type": "help",
                "response": """🤖 **TaskFlow AI Assistant**

Here's what I can do:

**📝 Create Tasks**
• "Add task to review documents"
• "Create task: Meeting with John tomorrow"
• "Remind me to call mom at 5pm"

**📋 Plan Your Day**
• "Plan my day"
• "What should I work on?"

**🔨 Break Down Tasks**
• "Break down: Build a portfolio website"
• "Split this into subtasks: Write quarterly report"

**📊 Get Insights**
• "How am I doing?"
• "Show my productivity stats"

Just type naturally and I'll help you manage your tasks!""",
                "data": None
            }
        
        else:
            # Default: try to parse as a task
            task_data = self.parse_task_with_ai(message) if self.client else self.parse_task_from_text(message)
            return {
                "type": "create_task",
                "response": f"Would you like me to create this task?\n**{task_data['title']}**\nPriority: {task_data['priority']}" + (f"\nDue: {task_data['due_date']}" if task_data['due_date'] else ""),
                "data": task_data,
                "needs_confirmation": True
            }


# Singleton instance
_agent_instance = None

def get_agent(api_key: Optional[str] = None) -> TaskAgent:
    """Get or create the task agent instance"""
    global _agent_instance
    if _agent_instance is None or api_key:
        _agent_instance = TaskAgent(api_key)
    return _agent_instance
