import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Brain,
  CalendarClock,
  Check,
  Flame,
  Link2,
  MessageSquare,
  Paperclip,
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  Send,
  Slack,
  Timer,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "../api";

const today = new Date().toISOString().slice(0, 10);

const formatTime = (isoString) => {
  if (!isoString) return "";
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatMinutes = (minutes = 0) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

const panelClass = "bg-slate-900/70 border border-slate-700 rounded-xl p-5";

const ProductivityView = ({ tasks, onRefresh, onEditTask, showToast }) => {
  const [priorities, setPriorities] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [habits, setHabits] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activity, setActivity] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [newHabit, setNewHabit] = useState("");
  const [commentText, setCommentText] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [dependencySelection, setDependencySelection] = useState({});
  const [attachmentForm, setAttachmentForm] = useState({});
  const [templateForm, setTemplateForm] = useState({
    name: "",
    title: "",
    tags: "",
    priority: "Medium",
    estimate_minutes: 30,
    subtasks: "",
  });
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || tasks.find((task) => task.status !== "Done") || tasks[0],
    [selectedTaskId, tasks]
  );

  const collaborationTasks = useMemo(
    () => tasks.filter((task) => task.assigned_to || task.comments?.length),
    [tasks]
  );

  const loadAiPanels = useCallback(async () => {
    try {
      const [
        priorityData,
        scheduleData,
        habitData,
        templateData,
        activityData,
        summaryData,
        forecastData,
        reminderData,
      ] = await Promise.all([
        api.getPriorities(),
        api.getSchedule(),
        api.getHabits(),
        api.getTemplates(),
        api.getActivity(),
        api.getDailySummary(),
        api.getWorkloadForecast(),
        api.getDueReminders(),
      ]);
      setPriorities(priorityData.prioritized_tasks || []);
      setSchedule(scheduleData.blocks || []);
      setHabits(habitData.habits || []);
      setTemplates(templateData.templates || []);
      setActivity(activityData.activity || []);
      setDailySummary(summaryData);
      setForecast(forecastData);
      setReminders(reminderData.reminders || []);
    } catch (error) {
      console.error("Error loading productivity panels:", error);
      showToast?.("Unable to refresh productivity panels", "error");
    }
  }, [showToast]);

  useEffect(() => {
    // Refresh derived AI panels whenever the visible task set changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAiPanels();
  }, [loadAiPanels, tasks]);

  useEffect(() => {
    if (!isTimerRunning) return undefined;
    const timer = setInterval(() => {
      setPomodoroSeconds((seconds) => {
        if (seconds <= 1) {
          setIsTimerRunning(false);
          if (selectedTask) {
            api
              .addTimeLog(selectedTask.id, { minutes: 25, source: "pomodoro", note: "Completed Pomodoro" })
              .then(onRefresh)
              .then(loadAiPanels)
              .catch(() => showToast?.("Pomodoro finished, but time logging failed", "error"));
          }
          showToast?.("Pomodoro complete! Focus time logged.");
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, loadAiPanels, onRefresh, selectedTask, showToast]);

  const timerLabel = `${String(Math.floor(pomodoroSeconds / 60)).padStart(2, "0")}:${String(
    pomodoroSeconds % 60
  ).padStart(2, "0")}`;

  const addHabit = async (event) => {
    event.preventDefault();
    if (!newHabit.trim()) return;

    await api.addHabit({ name: newHabit.trim(), frequency: "Daily" });
    setNewHabit("");
    await loadAiPanels();
    showToast?.("Habit added");
  };

  const toggleHabit = async (habitId) => {
    await api.toggleHabit(habitId, today);
    await loadAiPanels();
  };

  const deleteHabit = async (habitId) => {
    await api.deleteHabit(habitId);
    await loadAiPanels();
    showToast?.("Habit deleted");
  };

  const applySchedule = async () => {
    await api.applySchedule(schedule);
    await onRefresh();
    await loadAiPanels();
    showToast?.("AI schedule applied to tasks");
  };

  const addComment = async (taskId) => {
    const text = commentText[taskId]?.trim();
    if (!text) return;

    await api.addTaskComment(taskId, { author: "You", text });
    setCommentText({ ...commentText, [taskId]: "" });
    await onRefresh();
    await loadAiPanels();
    showToast?.("Comment added");
  };

  const saveDependencies = async (task) => {
    const selected = dependencySelection[task.id] ?? task.dependency_ids ?? [];
    await api.updateTaskDependencies(task.id, selected);
    await onRefresh();
    await loadAiPanels();
    showToast?.("Dependencies updated");
  };

  const addAttachment = async (event, taskId) => {
    event.preventDefault();
    const form = attachmentForm[taskId] || {};
    if (!form.url?.trim()) return;
    await api.addAttachment(taskId, { name: form.name, url: form.url, provider: "url" });
    setAttachmentForm({ ...attachmentForm, [taskId]: { name: "", url: "" } });
    await onRefresh();
    await loadAiPanels();
    showToast?.("Attachment added");
  };

  const addTemplate = async (event) => {
    event.preventDefault();
    if (!templateForm.name.trim()) return;
    await api.addTemplate({
      ...templateForm,
      tags: templateForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      subtasks: templateForm.subtasks.split("\n").map((title) => title.trim()).filter(Boolean).map((title) => ({ title })),
      estimate_minutes: Number(templateForm.estimate_minutes) || 30,
    });
    setTemplateForm({ name: "", title: "", tags: "", priority: "Medium", estimate_minutes: 30, subtasks: "" });
    await loadAiPanels();
    showToast?.("Template saved");
  };

  const createFromTemplate = async (templateId) => {
    await api.createTaskFromTemplate(templateId);
    await onRefresh();
    await loadAiPanels();
    showToast?.("Task created from template");
  };

  const snoozeReminder = async (taskId, minutes) => {
    await api.snoozeReminder(taskId, minutes);
    await loadAiPanels();
    showToast?.(`Reminder snoozed ${minutes} minutes`);
  };

  const enableCalendarSync = async () => {
    await api.updateIntegrations({ google_calendar: { enabled: true, calendar_id: "primary" } });
    const result = await api.syncGoogleCalendar();
    await loadAiPanels();
    showToast?.(result.synced ? "Google Calendar sync prepared" : result.reason, result.synced ? "success" : "error");
  };

  const sendSlackDigest = async () => {
    const result = await api.sendSlackNotification("TaskFlow AI digest requested from Productivity view");
    await loadAiPanels();
    showToast?.(result.sent ? "Slack notification recorded" : result.reason, result.sent ? "success" : "error");
  };

  return (
    <div className="p-6 flex-1 space-y-6 overflow-auto">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className={panelClass}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Brain className="w-5 h-5 text-violet-400" /> AI Task Prioritization
            </h2>
            <button onClick={loadAiPanels} className="text-sm text-violet-300 hover:text-violet-200">
              Refresh
            </button>
          </div>
          <div className="space-y-3">
            {priorities.length === 0 ? (
              <p className="text-slate-400">No active tasks to prioritize.</p>
            ) : (
              priorities.slice(0, 6).map((item, index) => (
                <button
                  key={item.task_id}
                  onClick={() => onEditTask(tasks.find((task) => task.id === item.task_id))}
                  className="w-full text-left bg-slate-800/80 rounded-xl p-4 border border-slate-700 hover:border-violet-500 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">
                        #{index + 1} {item.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{item.reasons.join(" | ")}</p>
                    </div>
                    <span className="px-2 py-1 bg-violet-500/20 text-violet-300 text-xs rounded-lg">
                      Score {item.score}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className={panelClass}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <CalendarClock className="w-5 h-5 text-cyan-400" /> AI Scheduling Assistant
            </h2>
            <button
              onClick={applySchedule}
              disabled={schedule.length === 0}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-sm rounded-lg"
            >
              Apply
            </button>
          </div>
          <div className="space-y-3">
            {schedule.length === 0 ? (
              <p className="text-slate-400">No suggested blocks available.</p>
            ) : (
              schedule.map((block) => (
                <div key={`${block.task_id}-${block.start}`} className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-white font-medium">{block.title}</p>
                    <span className="text-sm text-cyan-300">
                      {formatTime(block.start)} - {formatTime(block.end)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{block.reason}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className={panelClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Play className="w-5 h-5 text-rose-400" /> Pomodoro Timer
          </h2>
          <select
            value={selectedTask?.id || ""}
            onChange={(event) => setSelectedTaskId(event.target.value)}
            className="w-full mb-4 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-violet-500"
          >
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          <div className="text-center py-4">
            <div className="text-6xl font-bold text-white tabular-nums mb-5">{timerLabel}</div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isTimerRunning ? "Pause" : "Start"}
              </button>
              <button
                onClick={() => {
                  setIsTimerRunning(false);
                  setPomodoroSeconds(25 * 60);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </button>
            </div>
            {selectedTask && (
              <p className="text-xs text-slate-400 mt-4">
                Logged on completion to {selectedTask.title}. Total: {formatMinutes(selectedTask.focus_minutes || 0)}.
              </p>
            )}
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Flame className="w-5 h-5 text-orange-400" /> Habit Tracking
          </h2>
          <form onSubmit={addHabit} className="flex gap-2 mb-4">
            <input
              value={newHabit}
              onChange={(event) => setNewHabit(event.target.value)}
              placeholder="Add a daily habit..."
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
            <button className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
              <Plus className="w-4 h-4" />
            </button>
          </form>
          <div className="space-y-2">
            {habits.map((habit) => {
              const completedToday = habit.completed_dates?.includes(today);
              return (
                <div key={habit.id} className="flex items-center gap-3 bg-slate-800/80 rounded-xl p-3">
                  <button
                    onClick={() => toggleHabit(habit.id)}
                    className={`p-1.5 rounded-lg ${completedToday ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-400"}`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{habit.name}</p>
                    <p className="text-xs text-slate-400">{habit.streak || 0} day streak</p>
                  </div>
                  <button onClick={() => deleteHabit(habit.id)} className="text-slate-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            {habits.length === 0 && <p className="text-slate-400 text-sm">Start by adding your first habit.</p>}
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Users className="w-5 h-5 text-emerald-400" /> Team Collaboration
          </h2>
          <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
            {(collaborationTasks.length ? collaborationTasks : tasks.slice(0, 4)).map((task) => (
              <div key={task.id} className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-medium">{task.title}</p>
                    <p className="text-xs text-slate-400">Owner: {task.assigned_to || "Unassigned"}</p>
                  </div>
                  <button onClick={() => onEditTask(task)} className="text-xs text-violet-300 hover:text-violet-200">
                    Edit
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {task.comments?.slice(-2).map((comment) => (
                    <p key={comment.id} className="text-xs text-slate-300 bg-slate-900/70 rounded-lg p-2">
                      <MessageSquare className="inline w-3 h-3 mr-1 text-slate-500" />
                      <span className="text-slate-400">{comment.author}:</span> {comment.text}
                    </p>
                  ))}
                  <div className="flex gap-2">
                    <input
                      value={commentText[task.id] || ""}
                      onChange={(event) => setCommentText({ ...commentText, [task.id]: event.target.value })}
                      placeholder="Add comment..."
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                    />
                    <button onClick={() => addComment(task.id)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-slate-400 text-sm">Add tasks to collaborate with your team.</p>}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className={panelClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Repeat className="w-5 h-5 text-cyan-400" /> Templates and Recurrence
          </h2>
          <form onSubmit={addTemplate} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <input value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} placeholder="Template name" className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500" />
            <input value={templateForm.title} onChange={(event) => setTemplateForm({ ...templateForm, title: event.target.value })} placeholder="Prefilled title" className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500" />
            <input value={templateForm.tags} onChange={(event) => setTemplateForm({ ...templateForm, tags: event.target.value })} placeholder="Tags" className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500" />
            <div className="flex gap-2">
              <select value={templateForm.priority} onChange={(event) => setTemplateForm({ ...templateForm, priority: event.target.value })} className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <button className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg">Save</button>
            </div>
          </form>
          <div className="space-y-2">
            {templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between gap-3 bg-slate-800/80 rounded-xl p-3">
                <div>
                  <p className="text-white text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-slate-400">{template.priority} | {formatMinutes(template.estimate_minutes || 0)}</p>
                </div>
                <button onClick={() => createFromTemplate(template.id)} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
                  Use
                </button>
              </div>
            ))}
            {templates.length === 0 && <p className="text-sm text-slate-400">Create templates for repeatable task shapes.</p>}
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Bell className="w-5 h-5 text-amber-400" /> Smart Reminders
          </h2>
          <div className="space-y-3">
            {reminders.map((task) => (
              <div key={task.id} className="bg-slate-800/80 rounded-xl p-4 border border-amber-500/30">
                <p className="text-white font-medium">{task.title}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Due {task.due_date || "soon"} | Snooze {task.reminder?.snooze_minutes || 15}m
                </p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => snoozeReminder(task.id, 15)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">15m</button>
                  <button onClick={() => snoozeReminder(task.id, 60)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">1h</button>
                  <button onClick={() => onEditTask(task)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg">Edit</button>
                </div>
              </div>
            ))}
            {reminders.length === 0 && <p className="text-sm text-slate-400">No reminders are due.</p>}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className={panelClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Link2 className="w-5 h-5 text-red-400" /> Dependencies and Attachments
          </h2>
          <div className="space-y-4 max-h-[520px] overflow-auto pr-1">
            {tasks.slice(0, 8).map((task) => {
              const chosen = dependencySelection[task.id] ?? task.dependency_ids ?? [];
              const form = attachmentForm[task.id] || {};
              return (
                <div key={task.id} className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">{task.title}</p>
                      <p className={`text-xs mt-1 ${task.is_blocked ? "text-red-300" : "text-slate-400"}`}>
                        {task.is_blocked ? `Blocked by ${task.blocked_by?.map((item) => item.title).join(", ")}` : "No active blockers"}
                      </p>
                    </div>
                    <button onClick={() => saveDependencies(task)} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">
                      Save
                    </button>
                  </div>
                  <select
                    multiple
                    value={chosen}
                    onChange={(event) =>
                      setDependencySelection({
                        ...dependencySelection,
                        [task.id]: Array.from(event.target.selectedOptions).map((option) => option.value),
                      })
                    }
                    className="w-full mt-3 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white h-24"
                  >
                    {tasks.filter((candidate) => candidate.id !== task.id).map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>{candidate.title}</option>
                    ))}
                  </select>
                  <form onSubmit={(event) => addAttachment(event, task.id)} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 mt-3">
                    <input value={form.name || ""} onChange={(event) => setAttachmentForm({ ...attachmentForm, [task.id]: { ...form, name: event.target.value } })} placeholder="File name" className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500" />
                    <input value={form.url || ""} onChange={(event) => setAttachmentForm({ ...attachmentForm, [task.id]: { ...form, url: event.target.value } })} placeholder="https://..." className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500" />
                    <button className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"><Paperclip className="w-4 h-4" /></button>
                  </form>
                  {task.attachments?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {task.attachments.map((attachment) => (
                        <a key={attachment.id} href={attachment.url} className="text-xs px-2 py-1 bg-slate-900 rounded text-cyan-300" target="_blank" rel="noreferrer">
                          {attachment.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Timer className="w-5 h-5 text-emerald-400" /> AI Daily Summary and Workload
          </h2>
          <div className="space-y-4">
            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
              <p className="text-white font-medium">{dailySummary?.recap || "Summary loading..."}</p>
              <p className="text-sm text-slate-400 mt-2">{dailySummary?.next_day_plan}</p>
              <p className="text-xs text-emerald-300 mt-3">Focus today: {formatMinutes(dailySummary?.focus_minutes || 0)}</p>
            </div>
            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between gap-3">
                <p className="text-white font-medium">Weekly utilization</p>
                <span className={`text-sm ${forecast?.overload ? "text-red-300" : "text-emerald-300"}`}>
                  {forecast?.utilization_percent || 0}%
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-2">{forecast?.message}</p>
              <div className="grid grid-cols-7 gap-1 mt-4">
                {forecast?.days?.map((day) => (
                  <div key={day.date} className={`h-16 rounded-lg p-1 text-[10px] ${day.over_capacity ? "bg-red-500/25 text-red-200" : "bg-slate-900 text-slate-400"}`}>
                    <p>{day.date.slice(5)}</p>
                    <p>{formatMinutes(day.estimate_minutes)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={enableCalendarSync} className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg">
                <CalendarClock className="w-4 h-4" /> Calendar
              </button>
              <button onClick={sendSlackDigest} className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg">
                <Slack className="w-4 h-4" /> Slack
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className={panelClass}>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
          <Activity className="w-5 h-5 text-violet-400" /> Activity Feed
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {activity.slice(0, 9).map((item) => (
            <div key={item.id} className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
              <p className="text-sm text-white">{item.task_title || item.action.replaceAll("_", " ")}</p>
              <p className="text-xs text-slate-400 mt-1">{item.detail}</p>
            </div>
          ))}
          {activity.length === 0 && <p className="text-sm text-slate-400">Task edits, comments, schedules, and integrations will appear here.</p>}
        </div>
      </section>
    </div>
  );
};

export default ProductivityView;
